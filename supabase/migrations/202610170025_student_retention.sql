-- Vydys student retention, 2026-10-17. Only explicit opt-ins receive
-- in-app reminders. No email, SMS or WhatsApp dispatch is configured.
-- The functions below were taken from the verified production database.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.student_reminder_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 classroom_reminders boolean NOT NULL DEFAULT false,
 study_reminders boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_reminder_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_reminder_preferences FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE ON public.student_reminder_preferences TO authenticated;

DROP POLICY IF EXISTS student_reminder_preferences_read ON public.student_reminder_preferences;
CREATE POLICY student_reminder_preferences_read
 ON public.student_reminder_preferences FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS student_reminder_preferences_insert ON public.student_reminder_preferences;
CREATE POLICY student_reminder_preferences_insert
 ON public.student_reminder_preferences FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS student_reminder_preferences_update ON public.student_reminder_preferences;
CREATE POLICY student_reminder_preferences_update
 ON public.student_reminder_preferences FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid()))
 WITH CHECK (user_id=(SELECT auth.uid()));

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_unique
 ON public.notifications(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS student_reminder_preferences_classroom_enabled
 ON public.student_reminder_preferences(user_id) WHERE classroom_reminders=true;
CREATE INDEX IF NOT EXISTS student_reminder_preferences_study_enabled
 ON public.student_reminder_preferences(user_id) WHERE study_reminders=true;

CREATE OR REPLACE FUNCTION app_private.enqueue_student_retention_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_now timestamptz := clock_timestamp();
 v_kind text;
 v_from interval;
 v_until interval;
 v_added integer := 0;
 v_total integer := 0;
BEGIN
 -- This routine is internal to pg_cron. It is never callable by website users.
 FOR v_kind,v_from,v_until IN
   SELECT * FROM (VALUES
     ('24h'::text,interval '23 hours',interval '25 hours'),
     ('1h'::text,interval '30 minutes',interval '90 minutes')
   ) AS windows(kind,from_time,until_time)
 LOOP
  INSERT INTO public.notifications
   (user_id, notification_type, title, body, link, dedupe_key)
  SELECT students.user_id,
    'classroom_reminder',
    CASE
      WHEN prof.preferred_language='ar' THEN CASE WHEN v_kind='24h' THEN 'حصتك غداً على Vydys' ELSE 'حصتك تبدأ قريباً على Vydys' END
      WHEN prof.preferred_language='en' THEN CASE WHEN v_kind='24h' THEN 'Your Vydys class is tomorrow' ELSE 'Your Vydys class starts soon' END
      ELSE CASE WHEN v_kind='24h' THEN 'Votre Classroom est demain' ELSE 'Votre Classroom commence bientôt' END
    END,
    CASE
      WHEN prof.preferred_language='ar' THEN coalesce(room.title_ar,room.title_fr)
       || ' · ' || to_char(s.starts_at AT TIME ZONE 'Africa/Nouakchott','DD/MM/YYYY HH24:MI') || ' (نواكشوط)'
      WHEN prof.preferred_language='en' THEN coalesce(room.title_en,room.title_fr)
       || ' · ' || to_char(s.starts_at AT TIME ZONE 'Africa/Nouakchott','DD/MM/YYYY HH24:MI') || ' (Nouakchott)'
      ELSE room.title_fr
       || ' · ' || to_char(s.starts_at AT TIME ZONE 'Africa/Nouakchott','DD/MM/YYYY HH24:MI') || ' (Nouakchott)'
    END,
    '/classroom/' || room.slug || '/session/' || s.id::text,
    'classroom:' || v_kind || ':' || s.id::text
  FROM public.classroom_sessions AS s
  JOIN public.classrooms AS room ON room.id=s.classroom_id
  CROSS JOIN LATERAL (
    SELECT e.user_id
    FROM public.classroom_enrollments AS e
    WHERE e.classroom_id=room.id AND e.status='active'
    UNION
    SELECT e.user_id
    FROM public.enrollments AS e
    WHERE room.course_id IS NOT NULL
      AND e.course_id=room.course_id AND e.status IN ('active','completed')
  ) AS students
  JOIN public.student_reminder_preferences AS preference
    ON preference.user_id=students.user_id AND preference.classroom_reminders=true
  LEFT JOIN public.profiles AS prof ON prof.id=students.user_id
  WHERE room.status='published'
    AND s.status='scheduled'
    AND s.starts_at>=v_now+v_from
    AND s.starts_at<v_now+v_until
  ON CONFLICT (user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_added=ROW_COUNT;
  v_total:=v_total+v_added;
 END LOOP;

 -- A maximum of one gentle study reminder per ISO week, only for learners
 -- who have explicitly enabled it and have an active, unfinished course.
 IF extract(hour FROM v_now AT TIME ZONE 'Africa/Nouakchott')=8 THEN
  INSERT INTO public.notifications
   (user_id, notification_type, title, body, link, dedupe_key)
  SELECT preference.user_id, 'study_reminder',
    CASE
      WHEN prof.preferred_language='ar' THEN 'واصل تعلمك على Vydys'
      WHEN prof.preferred_language='en' THEN 'Your learning is ready when you are'
      ELSE 'Reprenez votre apprentissage sur Vydys'
    END,
    CASE
      WHEN prof.preferred_language='ar' THEN 'تابع دورتك: ' || coalesce(course.title_ar,course.title_fr)
      WHEN prof.preferred_language='en' THEN 'Continue your course: ' || coalesce(course.title_en,course.title_fr)
      ELSE 'Continuez votre formation : ' || course.title_fr
    END,
    '/apprendre/' || course.slug,
    'study:' || to_char(v_now AT TIME ZONE 'Africa/Nouakchott','IYYY-IW')
  FROM public.student_reminder_preferences AS preference
  JOIN LATERAL (
    SELECT c.slug,c.title_fr,c.title_en,c.title_ar
    FROM public.enrollments AS e
    JOIN public.courses AS c ON c.id=e.course_id
    WHERE e.user_id=preference.user_id
      AND e.status='active'
      AND e.activated_at < v_now-interval '7 days'
    ORDER BY e.activated_at DESC
    LIMIT 1
  ) AS course ON TRUE
  LEFT JOIN public.profiles AS prof ON prof.id=preference.user_id
  WHERE preference.study_reminders=true
    AND NOT EXISTS (
      SELECT 1 FROM public.lesson_progress AS lp
      WHERE lp.user_id=preference.user_id
        AND lp.completed_at>=v_now-interval '7 days'
    )
  ON CONFLICT (user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_added=ROW_COUNT;
  v_total:=v_total+v_added;
 END IF;
 RETURN v_total;
END;
$function$
;
CREATE OR REPLACE FUNCTION app_private.notify_student_lesson_milestone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_total integer;
 v_done integer;
 v_percent integer;
 v_previous integer;
 v_milestone integer;
 v_course public.courses%ROWTYPE;
 v_language text;
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.student_reminder_preferences
   WHERE user_id=NEW.user_id AND study_reminders=true
 ) THEN RETURN NEW; END IF;

 SELECT count(*) INTO v_total FROM public.course_lessons
 WHERE course_id=NEW.course_id;
 IF v_total=0 THEN RETURN NEW; END IF;
 SELECT count(DISTINCT lesson_id) INTO v_done FROM public.lesson_progress
 WHERE user_id=NEW.user_id AND course_id=NEW.course_id;
 v_percent:=floor(100.0*v_done/v_total)::integer;
 v_previous:=floor(100.0*greatest(0,v_done-1)/v_total)::integer;
 v_milestone:=CASE
  WHEN v_previous<100 AND v_percent>=100 THEN 100
  WHEN v_previous<75 AND v_percent>=75 THEN 75
  WHEN v_previous<50 AND v_percent>=50 THEN 50
  WHEN v_previous<25 AND v_percent>=25 THEN 25
  ELSE 0 END;
 IF v_milestone=0 THEN RETURN NEW; END IF;

 SELECT * INTO v_course FROM public.courses WHERE id=NEW.course_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 SELECT preferred_language INTO v_language FROM public.profiles WHERE id=NEW.user_id;

 INSERT INTO public.notifications(user_id,notification_type,title,body,link,dedupe_key)
 VALUES (
  NEW.user_id,
  'learning_milestone',
  CASE
   WHEN v_language='ar' THEN 'إنجاز جديد في تعلمك!'
   WHEN v_language='en' THEN 'A new learning milestone!'
   ELSE 'Une nouvelle étape franchie !'
  END,
  CASE
   WHEN v_language='ar' THEN 'أكملت '||v_milestone||'% من دورة '||coalesce(v_course.title_ar,v_course.title_fr)
   WHEN v_language='en' THEN 'You completed '||v_milestone||'% of '||coalesce(v_course.title_en,v_course.title_fr)
   ELSE 'Vous avez terminé '||v_milestone||'% de '||v_course.title_fr
  END,
  '/apprendre/'||v_course.slug,
  'milestone:'||NEW.course_id::text||':'||v_milestone::text
 ) ON CONFLICT (user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 RETURN NEW;
END;
$function$
;
REVOKE ALL ON FUNCTION app_private.enqueue_student_retention_notifications() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION app_private.notify_student_lesson_milestone() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS lesson_progress_vydys_milestone ON public.lesson_progress;
CREATE TRIGGER lesson_progress_vydys_milestone
 AFTER INSERT ON public.lesson_progress FOR EACH ROW
 EXECUTE FUNCTION app_private.notify_student_lesson_milestone();

DO $cron$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM cron.job
                WHERE jobname='vydys-optin-retention-reminders')
 THEN
   PERFORM cron.schedule('vydys-optin-retention-reminders',
     '15 * * * *',
     'SELECT app_private.enqueue_student_retention_notifications();');
 END IF;
END $cron$;
