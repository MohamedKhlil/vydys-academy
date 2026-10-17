-- Harden portfolio consent defaults and revoke anonymous access to
-- sensitive internal routines without disabling public course discovery.
BEGIN;
ALTER TABLE public.student_profiles ALTER COLUMN is_public SET DEFAULT false;
-- These rows were never edited after automatic creation: their public state
-- came from the old default, not an explicit visibility choice.
UPDATE public.student_profiles
SET is_public=false,updated_at=now()
WHERE is_public=true AND discoverable=false AND updated_at=created_at;

REVOKE EXECUTE ON FUNCTION public.auto_issue_certificate_trigger() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_certificate_if_eligible(uuid,uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.has_classroom_session_access(uuid,uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.create_manual_classroom_order(uuid,uuid,text,text,text,uuid) FROM PUBLIC,anon;
COMMIT;