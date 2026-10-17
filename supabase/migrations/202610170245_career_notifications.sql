BEGIN;
CREATE OR REPLACE FUNCTION app_private.career_notify_new_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_owner uuid;
BEGIN
 SELECT employer_user_id INTO v_owner FROM public.career_jobs WHERE id=NEW.job_id;
 IF v_owner IS NOT NULL THEN
  INSERT INTO public.notifications(user_id,notification_type,title,body,link,dedupe_key)
  VALUES(v_owner,'career_application','Nouvelle candidature Vydys',
     'Une candidature a été envoyée pour l’une de vos offres.',
     '/carriere/entreprise','career-apply:'||NEW.id::text)
  ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS career_application_notice ON public.career_applications;
CREATE TRIGGER career_application_notice AFTER INSERT ON public.career_applications
FOR EACH ROW EXECUTE FUNCTION app_private.career_notify_new_application();

CREATE OR REPLACE FUNCTION app_private.career_guard_chat_rate()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
 IF (SELECT count(*) FROM public.career_contact_messages
     WHERE sender_id=NEW.sender_id AND created_at>=now()-interval '1 hour')>=20
 THEN RAISE EXCEPTION 'Messaging rate limit reached' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS career_guard_chat_rate ON public.career_contact_messages;
CREATE TRIGGER career_guard_chat_rate BEFORE INSERT ON public.career_contact_messages
FOR EACH ROW EXECUTE FUNCTION app_private.career_guard_chat_rate();

CREATE OR REPLACE FUNCTION app_private.career_notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_request public.career_contact_requests%rowtype;
DECLARE v_recipient uuid;
BEGIN
 SELECT * INTO v_request FROM public.career_contact_requests WHERE id=NEW.request_id;
 IF v_request.status<>'accepted' THEN RETURN NEW; END IF;
 v_recipient:=CASE WHEN NEW.sender_id=v_request.recruiter_id
   THEN v_request.talent_id ELSE v_request.recruiter_id END;
 INSERT INTO public.notifications(user_id,notification_type,title,body,link,dedupe_key)
 VALUES(v_recipient,'career_message','Nouveau message professionnel',
   'Vous avez reçu un message dans Vydys Career Connect.',
   '/carriere/contacts','career-chat:'||NEW.id::text)
 ON CONFLICT(user_id,dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS career_notify_message ON public.career_contact_messages;
CREATE TRIGGER career_notify_message AFTER INSERT ON public.career_contact_messages
FOR EACH ROW EXECUTE FUNCTION app_private.career_notify_new_message();
COMMIT;