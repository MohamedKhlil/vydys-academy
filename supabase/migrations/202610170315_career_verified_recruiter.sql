-- Ensure only Vydys-approved company accounts can send unsolicited
-- initial requests to public opt-in talents. Existing consent for job
-- applicants follows the separate application-contact workflow.
CREATE OR REPLACE FUNCTION public.career_request_talent_contact(p_slug text, p_message text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_user uuid:=(SELECT auth.uid()); v_target uuid; v_id uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.career_companies
    WHERE user_id=v_user AND status='approved') THEN
   RAISE EXCEPTION 'An approved employer account is required to contact public talent'
   USING ERRCODE='42501';
 END IF;
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
$function$
;
REVOKE ALL ON FUNCTION public.career_request_talent_contact(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.career_request_talent_contact(text,text) TO authenticated;
