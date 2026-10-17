-- Vydys growth and learner-retention analytics.
-- Uses existing profiles, page views, enrollments and lesson progress.
-- Security invoker + management role check; only aggregates are returned.
BEGIN;
DROP POLICY IF EXISTS enrollments_management_read_for_growth ON public.enrollments;
CREATE POLICY enrollments_management_read_for_growth ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.is_management_user((SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.vydys_admin_growth_metrics(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO ''
AS $function$
DECLARE
  v_start timestamptz;
  v_payload jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT public.is_management_user((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Accès réservé à la direction Vydys'
      USING ERRCODE = '42501';
  END IF;

  IF p_days IS NULL OR p_days NOT IN (7,30,90) THEN
    RAISE EXCEPTION 'Période non autorisée' USING ERRCODE = '22023';
  END IF;

  v_start := (
    (now() AT TIME ZONE 'Africa/Nouakchott')::date - (p_days - 1)
  )::timestamp AT TIME ZONE 'Africa/Nouakchott';

  WITH
  student_views AS (
    SELECT v.user_id,v.created_at,
      (v.created_at AT TIME ZONE 'Africa/Nouakchott')::date AS day
    FROM public.site_page_views v
    JOIN public.profiles p ON p.id=v.user_id AND p.role='student'
    WHERE v.created_at >= v_start AND v.user_id IS NOT NULL
  ),
  student_signups AS (
    SELECT (p.created_at AT TIME ZONE 'Africa/Nouakchott')::date AS day,
      count(*)::integer AS count
    FROM public.profiles p
    WHERE p.created_at >= v_start AND p.role='student'
    GROUP BY 1
  ),
  activity_by_day AS (
    SELECT day,count(DISTINCT user_id)::integer AS count
    FROM student_views
    GROUP BY 1
  ),
  lesson_completions AS (
    SELECT (lp.completed_at AT TIME ZONE 'Africa/Nouakchott')::date AS day,
      count(*)::integer AS count
    FROM public.lesson_progress lp
    WHERE lp.completed_at >= v_start
    GROUP BY 1
  ),
  full_courses AS (
    SELECT lp.user_id,lp.course_id,max(lp.completed_at) AS finished_at
    FROM public.lesson_progress lp
    JOIN public.enrollments e ON e.user_id=lp.user_id AND e.course_id=lp.course_id
      AND e.status IN ('active','completed')
    JOIN public.course_lessons l ON l.id=lp.lesson_id AND l.course_id=lp.course_id
    GROUP BY lp.user_id,lp.course_id
    HAVING count(DISTINCT lp.lesson_id) >= (
      SELECT count(*) FROM public.course_lessons cl WHERE cl.course_id=lp.course_id
    )
  ),
  course_completions AS (
    SELECT (finished_at AT TIME ZONE 'Africa/Nouakchott')::date AS day,
      count(*)::integer AS count
    FROM full_courses
    WHERE finished_at >= v_start
    GROUP BY 1
  ),
  calendar_days AS (
    SELECT ((v_start AT TIME ZONE 'Africa/Nouakchott')::date + n)::date AS day
    FROM generate_series(0,p_days-1) AS g(n)
  ),
  daily_totals AS (
    SELECT d.day,
      coalesce(s.count,0) AS signups,
      coalesce(a.count,0) AS active_students,
      coalesce(l.count,0) AS completed_lessons,
      coalesce(c.count,0) AS completed_courses
    FROM calendar_days d
    LEFT JOIN student_signups s ON s.day=d.day
    LEFT JOIN activity_by_day a ON a.day=d.day
    LEFT JOIN lesson_completions l ON l.day=d.day
    LEFT JOIN course_completions c ON c.day=d.day
  )
  SELECT jsonb_build_object(
    'period_days',p_days,
    'period_start',(v_start AT TIME ZONE 'Africa/Nouakchott')::date::text,
    'period_end',(now() AT TIME ZONE 'Africa/Nouakchott')::date::text,
    'tracking_started_at',(SELECT min(created_at) FROM public.site_page_views),
    'definitions',jsonb_build_object(
      'timezone','Africa/Nouakchott',
      'active','Étudiants identifiés ayant consulté au moins une page durant la période.',
      'returning','Étudiants identifiés actifs durant au moins deux jours distincts de la période.',
      'completed','Couples étudiant-formation inscrits ayant terminé toutes les leçons de la formation.',
      'signups','Comptes présents dans les profils Vydys, par date de création.'
    ),
    'summary',jsonb_build_object(
      'new_accounts',(SELECT count(*) FROM public.profiles WHERE created_at >= v_start),
      'new_students',(SELECT count(*) FROM public.profiles WHERE created_at >= v_start AND role='student'),
      'active_users',(SELECT count(DISTINCT user_id) FROM public.site_page_views WHERE created_at >= v_start AND user_id IS NOT NULL),
      'active_students',(SELECT count(DISTINCT user_id) FROM student_views),
      'returning_students',(SELECT count(*) FROM (
          SELECT user_id FROM student_views
          GROUP BY user_id HAVING count(DISTINCT day)>=2
      ) AS returned),
      'new_enrollments',(SELECT count(*) FROM public.enrollments WHERE activated_at >= v_start),
      'lessons_completed',(SELECT count(*) FROM public.lesson_progress WHERE completed_at >= v_start),
      'courses_completed',(SELECT coalesce(sum(count),0) FROM course_completions),
      'certificates_issued',(SELECT count(*) FROM public.certificates WHERE issued_at >= v_start),
      'onboarded_students',(SELECT count(*) FROM public.profiles
          WHERE role='student' AND onboarding_completed_at >= v_start)
    ),
    'daily',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'day',day::text,
      'new_students',signups,
      'active_students',active_students,
      'lessons_completed',completed_lessons,
      'courses_completed',completed_courses
    ) ORDER BY day),'[]'::jsonb) FROM daily_totals)
  )
  INTO v_payload;

  RETURN v_payload;
END;
$function$
;
REVOKE ALL ON FUNCTION public.vydys_admin_growth_metrics(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vydys_admin_growth_metrics(integer) TO authenticated;
COMMIT;
