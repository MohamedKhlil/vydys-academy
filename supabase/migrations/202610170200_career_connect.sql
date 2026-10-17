-- Career Connect MVP: company approval, genuine job offers, private applications
-- and consent-based recruiter contact, layered over the existing public CVs.
BEGIN;

CREATE TABLE IF NOT EXISTS public.career_companies (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 company_name text NOT NULL CHECK (char_length(btrim(company_name)) BETWEEN 2 AND 120),
 website text CHECK (website IS NULL OR char_length(website)<=250),
 country text CHECK (country IS NULL OR char_length(country)<=90),
 description text CHECK (description IS NULL OR char_length(description)<=1200),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.career_companies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_companies FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.career_companies TO anon,authenticated;
GRANT INSERT,UPDATE ON public.career_companies TO authenticated;
DROP POLICY IF EXISTS career_companies_select ON public.career_companies;
CREATE POLICY career_companies_select ON public.career_companies FOR SELECT TO anon,authenticated
USING (status='approved' OR user_id=(SELECT auth.uid()) OR public.is_management_user((SELECT auth.uid())));
DROP POLICY IF EXISTS career_companies_insert ON public.career_companies;
CREATE POLICY career_companies_insert ON public.career_companies FOR INSERT TO authenticated
WITH CHECK (user_id=(SELECT auth.uid()) AND status='pending');
DROP POLICY IF EXISTS career_companies_update ON public.career_companies;
CREATE POLICY career_companies_update ON public.career_companies FOR UPDATE TO authenticated
USING (user_id=(SELECT auth.uid()) OR public.is_management_user((SELECT auth.uid())))
WITH CHECK (user_id=(SELECT auth.uid()) OR public.is_management_user((SELECT auth.uid())));

CREATE SCHEMA IF NOT EXISTS app_private;
CREATE OR REPLACE FUNCTION app_private.career_guard_company_review()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path=''
AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
   IF (NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
     AND NOT coalesce(public.is_management_user((SELECT auth.uid())),false)
   THEN RAISE EXCEPTION 'Company verification may only be changed by management' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS career_company_review_guard ON public.career_companies;
CREATE TRIGGER career_company_review_guard BEFORE UPDATE ON public.career_companies
FOR EACH ROW EXECUTE FUNCTION app_private.career_guard_company_review();

CREATE TABLE IF NOT EXISTS public.career_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 employer_user_id uuid NOT NULL REFERENCES public.career_companies(user_id) ON DELETE CASCADE,
 title text NOT NULL CHECK(char_length(btrim(title)) BETWEEN 5 AND 150),
 description text NOT NULL CHECK(char_length(btrim(description)) BETWEEN 50 AND 5000),
 required_skills text[] NOT NULL DEFAULT '{}' CHECK(cardinality(required_skills)<=15),
 country text CHECK(country IS NULL OR char_length(country)<=90),
 city text CHECK(city IS NULL OR char_length(city)<=90),
 remote_allowed boolean NOT NULL DEFAULT false,
 employment_type text NOT NULL DEFAULT 'full_time'
   CHECK(employment_type IN ('full_time','part_time','internship','freelance','contract','apprenticeship')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.career_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.career_jobs TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.career_jobs TO authenticated;
DROP POLICY IF EXISTS career_jobs_read ON public.career_jobs;
CREATE POLICY career_jobs_read ON public.career_jobs FOR SELECT TO anon,authenticated
USING (
 employer_user_id=(SELECT auth.uid())
 OR public.is_management_user((SELECT auth.uid()))
 OR (status='published' AND (expires_at IS NULL OR expires_at>now())
     AND EXISTS(SELECT 1 FROM public.career_companies co
                WHERE co.user_id=career_jobs.employer_user_id AND co.status='approved'))
);
DROP POLICY IF EXISTS career_jobs_insert ON public.career_jobs;
CREATE POLICY career_jobs_insert ON public.career_jobs FOR INSERT TO authenticated
WITH CHECK (
 employer_user_id=(SELECT auth.uid())
 AND (status='draft' OR EXISTS(SELECT 1 FROM public.career_companies co
 WHERE co.user_id=career_jobs.employer_user_id AND co.status='approved'))
);
DROP POLICY IF EXISTS career_jobs_update ON public.career_jobs;
CREATE POLICY career_jobs_update ON public.career_jobs FOR UPDATE TO authenticated
USING (employer_user_id=(SELECT auth.uid()) OR public.is_management_user((SELECT auth.uid())))
WITH CHECK (
 public.is_management_user((SELECT auth.uid()))
 OR (employer_user_id=(SELECT auth.uid())
 AND (status<>'published' OR EXISTS(SELECT 1 FROM public.career_companies co
 WHERE co.user_id=career_jobs.employer_user_id AND co.status='approved')))
);
DROP POLICY IF EXISTS career_jobs_delete ON public.career_jobs;
CREATE POLICY career_jobs_delete ON public.career_jobs FOR DELETE TO authenticated
USING (employer_user_id=(SELECT auth.uid()) OR public.is_management_user((SELECT auth.uid())));

CREATE TABLE IF NOT EXISTS public.career_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES public.career_jobs(id) ON DELETE CASCADE,
 applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 cover_letter text NOT NULL CHECK(char_length(btrim(cover_letter)) BETWEEN 20 AND 2000),
 status text NOT NULL DEFAULT 'submitted'
   CHECK(status IN ('submitted','shortlisted','rejected','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (job_id,applicant_id)
);
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_applications FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.career_applications TO authenticated;
DROP POLICY IF EXISTS career_applications_read ON public.career_applications;
CREATE POLICY career_applications_read ON public.career_applications FOR SELECT TO authenticated
USING (
 applicant_id=(SELECT auth.uid())
 OR public.is_management_user((SELECT auth.uid()))
 OR EXISTS(SELECT 1 FROM public.career_jobs j
     WHERE j.id=career_applications.job_id AND j.employer_user_id=(SELECT auth.uid()))
);
DROP POLICY IF EXISTS career_applications_insert ON public.career_applications;
CREATE POLICY career_applications_insert ON public.career_applications FOR INSERT TO authenticated
WITH CHECK (
 applicant_id=(SELECT auth.uid()) AND status='submitted'
 AND EXISTS(SELECT 1 FROM public.career_jobs j
 JOIN public.career_companies co ON co.user_id=j.employer_user_id
 WHERE j.id=career_applications.job_id
 AND j.employer_user_id<>(SELECT auth.uid())
 AND j.status='published' AND (j.expires_at IS NULL OR j.expires_at>now())
 AND co.status='approved')
);

CREATE TABLE IF NOT EXISTS public.career_contact_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 talent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 message text NOT NULL CHECK(char_length(btrim(message)) BETWEEN 20 AND 1000),
 status text NOT NULL DEFAULT 'pending'
   CHECK(status IN ('pending','accepted','declined','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT career_contact_not_self CHECK(recruiter_id<>talent_id)
);
ALTER TABLE public.career_contact_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_contact_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.career_contact_requests TO authenticated;
DROP POLICY IF EXISTS career_contact_read ON public.career_contact_requests;
CREATE POLICY career_contact_read ON public.career_contact_requests FOR SELECT TO authenticated
USING (recruiter_id=(SELECT auth.uid()) OR talent_id=(SELECT auth.uid())
 OR public.is_management_user((SELECT auth.uid())));
CREATE UNIQUE INDEX IF NOT EXISTS career_one_pending_contact
ON public.career_contact_requests(recruiter_id,talent_id) WHERE status='pending';

CREATE TABLE IF NOT EXISTS public.career_contact_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.career_contact_requests(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(char_length(btrim(body)) BETWEEN 2 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.career_contact_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_contact_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.career_contact_messages TO authenticated;
DROP POLICY IF EXISTS career_messages_read ON public.career_contact_messages;
CREATE POLICY career_messages_read ON public.career_contact_messages FOR SELECT TO authenticated
USING (EXISTS(SELECT 1 FROM public.career_contact_requests r
  WHERE r.id=career_contact_messages.request_id AND r.status='accepted'
  AND (r.recruiter_id=(SELECT auth.uid()) OR r.talent_id=(SELECT auth.uid()))));
DROP POLICY IF EXISTS career_messages_insert ON public.career_contact_messages;
CREATE POLICY career_messages_insert ON public.career_contact_messages FOR INSERT TO authenticated
WITH CHECK(sender_id=(SELECT auth.uid()) AND EXISTS(
  SELECT 1 FROM public.career_contact_requests r
  WHERE r.id=career_contact_messages.request_id AND r.status='accepted'
  AND (r.recruiter_id=(SELECT auth.uid()) OR r.talent_id=(SELECT auth.uid()))
));

-- Privileged mutations validate current actor explicitly; no caller-supplied
-- owner IDs are trusted. Not available to anonymous/API public roles.
CREATE OR REPLACE FUNCTION public.career_request_talent_contact(p_slug text,p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_user uuid:=(SELECT auth.uid()); v_target uuid; v_id uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF char_length(btrim(coalesce(p_message,''))) NOT BETWEEN 20 AND 1000
 THEN RAISE EXCEPTION 'Message length must be between 20 and 1000 characters' USING ERRCODE='22023'; END IF;
 SELECT user_id INTO v_target FROM public.student_profiles
 WHERE public_slug=p_slug AND is_public AND discoverable AND open_to_work;
 IF v_target IS NULL OR v_target=v_user
 THEN RAISE EXCEPTION 'This candidate is unavailable for contact' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.career_contact_requests
     WHERE recruiter_id=v_user AND created_at>now()-interval '24 hours')>=5
 THEN RAISE EXCEPTION 'Daily contact limit reached' USING ERRCODE='22023'; END IF;
 IF EXISTS (SELECT 1 FROM public.career_contact_requests
    WHERE recruiter_id=v_user AND talent_id=v_target AND status='pending')
 THEN RAISE EXCEPTION 'A request to this talent is already pending' USING ERRCODE='22023'; END IF;
 INSERT INTO public.career_contact_requests(recruiter_id,talent_id,message)
 VALUES(v_user,v_target,btrim(p_message)) RETURNING id INTO v_id;
 INSERT INTO public.notifications(user_id,notification_type,title,body,link,dedupe_key)
 VALUES (v_target,'career_contact','Nouvelle demande professionnelle',
 'Un recruteur souhaite vous contacter. Vous pouvez accepter ou refuser sa demande.',
 '/carriere/contacts','career-contact:'||v_id::text)
 ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.career_respond_contact(p_request_id uuid,p_decision text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_me uuid:=(SELECT auth.uid()); v_row public.career_contact_requests%rowtype;
BEGIN
 IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_decision NOT IN ('accepted','declined','closed') THEN RAISE EXCEPTION 'Invalid decision' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_row FROM public.career_contact_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND OR v_row.talent_id<>v_me THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='42501'; END IF;
 IF NOT (
   (v_row.status='pending' AND p_decision IN ('accepted','declined'))
   OR (v_row.status='accepted' AND p_decision='closed')
 ) THEN RAISE EXCEPTION 'Request cannot be changed' USING ERRCODE='22023'; END IF;
 UPDATE public.career_contact_requests SET status=p_decision,updated_at=now() WHERE id=p_request_id;
 INSERT INTO public.notifications(user_id,notification_type,title,body,link,dedupe_key)
 VALUES(v_row.recruiter_id,'career_response','Réponse à votre demande Vydys Talents',
 CASE WHEN p_decision='accepted' THEN 'Le candidat a accepté votre demande de contact.'
 ELSE 'Le candidat a mis à jour votre demande de contact.' END,
 '/carriere/contacts','career-response:'||p_request_id::text||':'||p_decision)
 ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.career_review_application(p_application_id uuid,p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_me uuid:=(SELECT auth.uid()); v_row public.career_applications%rowtype;
BEGIN
 IF v_me IS NULL OR p_status NOT IN ('shortlisted','rejected')
 THEN RAISE EXCEPTION 'Invalid recruiter review' USING ERRCODE='42501'; END IF;
 SELECT a.* INTO v_row FROM public.career_applications a
 JOIN public.career_jobs j ON j.id=a.job_id
 WHERE a.id=p_application_id AND j.employer_user_id=v_me FOR UPDATE OF a;
 IF NOT FOUND OR v_row.status NOT IN ('submitted','shortlisted')
 THEN RAISE EXCEPTION 'Application not available' USING ERRCODE='42501'; END IF;
 UPDATE public.career_applications SET status=p_status,updated_at=now() WHERE id=p_application_id;
 INSERT INTO public.notifications(user_id,notification_type,title,body,link,dedupe_key)
 VALUES(v_row.applicant_id,'career_application','Votre candidature a été mise à jour',
 CASE WHEN p_status='shortlisted' THEN 'Votre candidature est présélectionnée.'
 ELSE 'Votre candidature a reçu une réponse.' END,
 '/carriere/mes-candidatures','career-application:'||p_application_id::text||':'||p_status)
 ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.career_withdraw_application(p_application_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_me uuid:=(SELECT auth.uid());
BEGIN
 IF v_me IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 UPDATE public.career_applications SET status='withdrawn',updated_at=now()
 WHERE id=p_application_id AND applicant_id=v_me AND status IN ('submitted','shortlisted');
 RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.career_request_talent_contact(text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.career_respond_contact(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.career_review_application(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.career_withdraw_application(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.career_request_talent_contact(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.career_respond_contact(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.career_review_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.career_withdraw_application(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS career_jobs_recent ON public.career_jobs(status,created_at DESC);
CREATE INDEX IF NOT EXISTS career_jobs_employer ON public.career_jobs(employer_user_id,status);
CREATE INDEX IF NOT EXISTS career_applications_owner ON public.career_applications(applicant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS career_applications_job ON public.career_applications(job_id,created_at DESC);
CREATE INDEX IF NOT EXISTS career_contacts_talent ON public.career_contact_requests(talent_id,created_at DESC);
CREATE INDEX IF NOT EXISTS career_contacts_recruiter ON public.career_contact_requests(recruiter_id,created_at DESC);
CREATE INDEX IF NOT EXISTS career_messages_recent ON public.career_contact_messages(request_id,created_at ASC);
COMMIT;