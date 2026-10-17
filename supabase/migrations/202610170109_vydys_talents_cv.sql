-- Opt-in searchable student CV directory and learner-maintained experience.
-- Profiles remain private in the directory until explicitly opted in.
BEGIN;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_to_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS self_reported_skills text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.student_profiles.discoverable
 IS 'Explicit opt-in to public searchable recruiter talent directory; distinct from the portfolio public URL.';
COMMENT ON COLUMN public.student_profiles.self_reported_skills
 IS 'Self-reported skill tags; NEVER treated as Vydys-verified skills.';

ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_city_length;
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_city_length CHECK (city IS NULL OR char_length(city)<=100);
ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_country_length;
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_country_length CHECK (country IS NULL OR char_length(country)<=100);
ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_self_skills_limit;
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_self_skills_limit CHECK (cardinality(self_reported_skills)<=20);

CREATE TABLE IF NOT EXISTS public.student_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution text NOT NULL CHECK (char_length(trim(institution)) BETWEEN 2 AND 150),
  degree text NOT NULL CHECK (char_length(trim(degree)) BETWEEN 2 AND 150),
  field_of_study text CHECK (field_of_study IS NULL OR char_length(field_of_study)<=150),
  started_on date,
  ended_on date,
  description text CHECK (description IS NULL OR char_length(description)<=1000),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_education_dates CHECK (ended_on IS NULL OR started_on IS NULL OR ended_on>=started_on)
);
CREATE TABLE IF NOT EXISTS public.student_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title text NOT NULL CHECK (char_length(trim(job_title)) BETWEEN 2 AND 150),
  organization text NOT NULL CHECK (char_length(trim(organization)) BETWEEN 2 AND 150),
  employment_type text CHECK (employment_type IS NULL OR employment_type IN ('full_time','part_time','internship','freelance','contract','volunteer')),
  started_on date,
  ended_on date,
  description text CHECK (description IS NULL OR char_length(description)<=1500),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_experience_dates CHECK (ended_on IS NULL OR started_on IS NULL OR ended_on>=started_on)
);

ALTER TABLE public.student_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_experience ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_education,public.student_experience FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.student_education,public.student_experience TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.student_education,public.student_experience TO authenticated;

DROP POLICY IF EXISTS talent_education_read ON public.student_education;
CREATE POLICY talent_education_read ON public.student_education FOR SELECT TO anon,authenticated
USING (
  user_id=(SELECT auth.uid())
  OR (is_public=true AND EXISTS(
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id=student_education.user_id AND sp.is_public=true
  ))
);
DROP POLICY IF EXISTS talent_education_insert ON public.student_education;
CREATE POLICY talent_education_insert ON public.student_education FOR INSERT TO authenticated
WITH CHECK (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS talent_education_update ON public.student_education;
CREATE POLICY talent_education_update ON public.student_education FOR UPDATE TO authenticated
USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS talent_education_delete ON public.student_education;
CREATE POLICY talent_education_delete ON public.student_education FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS talent_experience_read ON public.student_experience;
CREATE POLICY talent_experience_read ON public.student_experience FOR SELECT TO anon,authenticated
USING (
  user_id=(SELECT auth.uid())
  OR (is_public=true AND EXISTS(
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id=student_experience.user_id AND sp.is_public=true
  ))
);
DROP POLICY IF EXISTS talent_experience_insert ON public.student_experience;
CREATE POLICY talent_experience_insert ON public.student_experience FOR INSERT TO authenticated
WITH CHECK (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS talent_experience_update ON public.student_experience;
CREATE POLICY talent_experience_update ON public.student_experience FOR UPDATE TO authenticated
USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS talent_experience_delete ON public.student_experience;
CREATE POLICY talent_experience_delete ON public.student_experience FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_student_profiles_talent_search
ON public.student_profiles (updated_at DESC)
WHERE is_public=true AND discoverable=true;
CREATE INDEX IF NOT EXISTS idx_student_education_user
ON public.student_education(user_id,started_on DESC);
CREATE INDEX IF NOT EXISTS idx_student_experience_user
ON public.student_experience(user_id,started_on DESC);

-- Explicit security-invoker projection: no private email, phone, full account,
-- paid order, raw user ID, or hidden credentials are exposed to recruiters.
CREATE OR REPLACE VIEW public.vydys_public_talent_directory
WITH (security_invoker=true)
AS
SELECT sp.public_slug,sp.display_name,sp.headline,sp.bio,sp.avatar_url,
       sp.city,sp.country,sp.open_to_work,sp.self_reported_skills,
       sp.updated_at
FROM public.student_profiles sp
WHERE sp.is_public=true AND sp.discoverable=true
  AND sp.display_name IS NOT NULL AND char_length(trim(sp.display_name))>1;
REVOKE ALL ON public.vydys_public_talent_directory FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.vydys_public_talent_directory TO anon,authenticated;

COMMIT;