BEGIN;
ALTER TABLE public.career_applications
 ADD COLUMN IF NOT EXISTS candidate_name text CHECK(candidate_name IS NULL OR char_length(candidate_name)<=120),
 ADD COLUMN IF NOT EXISTS share_cv boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS shared_public_slug text CHECK(shared_public_slug IS NULL OR char_length(shared_public_slug)<=160);

CREATE OR REPLACE FUNCTION app_private.career_capture_applicant_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 SELECT left(coalesce(nullif(btrim(full_name),''),'Vydys candidate'),120)
 INTO NEW.candidate_name FROM public.profiles WHERE id=NEW.applicant_id;
 NEW.candidate_name:=coalesce(NEW.candidate_name,'Vydys candidate');
 IF NEW.share_cv=true THEN
   SELECT public_slug INTO NEW.shared_public_slug
   FROM public.student_profiles
   WHERE user_id=NEW.applicant_id AND is_public=true;
   IF NEW.shared_public_slug IS NULL THEN
     RAISE EXCEPTION 'Your CV must be public by link before you can share it with this recruiter'
       USING ERRCODE='22023';
   END IF;
 ELSE NEW.shared_public_slug:=NULL;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS career_capture_identity ON public.career_applications;
CREATE TRIGGER career_capture_identity BEFORE INSERT ON public.career_applications
FOR EACH ROW EXECUTE FUNCTION app_private.career_capture_applicant_identity();

CREATE OR REPLACE FUNCTION public.career_request_applicant_contact(
 p_application_id uuid,p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_me uuid:=(SELECT auth.uid());v_candidate uuid;v_id uuid;
BEGIN
 IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF char_length(btrim(coalesce(p_message,''))) NOT BETWEEN 20 AND 1000 THEN
   RAISE EXCEPTION 'Please write a 20–1000 character request' USING ERRCODE='22023'; END IF;
 SELECT a.applicant_id INTO v_candidate FROM public.career_applications a
 JOIN public.career_jobs j ON j.id=a.job_id
 JOIN public.career_companies co ON co.user_id=j.employer_user_id
 WHERE a.id=p_application_id
   AND j.employer_user_id=v_me
   AND co.status='approved'
   AND a.status='shortlisted';
 IF v_candidate IS NULL OR v_candidate=v_me THEN
   RAISE EXCEPTION 'This application is not available for contact' USING ERRCODE='42501'; END IF;
 IF (SELECT count(*) FROM public.career_contact_requests
    WHERE recruiter_id=v_me AND created_at>now()-interval '24 hours')>=5 THEN
   RAISE EXCEPTION 'Daily contact limit reached' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.career_contact_requests
    WHERE recruiter_id=v_me AND talent_id=v_candidate
      AND status IN ('pending','accepted')) THEN
   RAISE EXCEPTION 'A contact request is already active' USING ERRCODE='22023'; END IF;
 INSERT INTO public.career_contact_requests(recruiter_id,talent_id,message)
 VALUES(v_me,v_candidate,btrim(p_message)) RETURNING id INTO v_id;
 INSERT INTO public.notifications(user_id,notification_type,title,body,link,dedupe_key)
 VALUES(v_candidate,'career_contact','Proposition d’entretien Vydys',
   'Un recruteur souhaite échanger au sujet de votre candidature.',
   '/carriere/contacts','career-application-contact:'||v_id::text)
 ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.career_request_applicant_contact(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.career_request_applicant_contact(uuid,text) TO authenticated;
COMMIT;