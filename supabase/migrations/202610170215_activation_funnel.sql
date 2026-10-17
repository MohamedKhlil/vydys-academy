-- Real activation funnel measured with anonymous pseudonymous visit IDs.
-- Never capture names, emails, CV contents, payments, URLs with query parameters,
-- or third-party identifiers.
BEGIN;
CREATE TABLE IF NOT EXISTS public.vydys_growth_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_type text NOT NULL CHECK(event_type IN (
  'signup_started','course_viewed','course_checkout_started','course_order_submitted',
  'portfolio_opened','portfolio_saved','talent_opt_in',
  'talents_viewed','talent_contact_requested',
  'jobs_viewed','job_application_submitted','company_application_submitted'
 )),
 visitor_id uuid NOT NULL,
 session_id uuid NOT NULL,
 user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 path text NOT NULL CHECK(char_length(path) BETWEEN 1 AND 180 AND left(path,1)='/'),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vydys_growth_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vydys_growth_events FROM PUBLIC,anon,authenticated;
GRANT INSERT ON public.vydys_growth_events TO anon,authenticated;
GRANT SELECT ON public.vydys_growth_events TO authenticated;
DROP POLICY IF EXISTS growth_events_insert ON public.vydys_growth_events;
CREATE POLICY growth_events_insert ON public.vydys_growth_events
FOR INSERT TO anon,authenticated WITH CHECK (
  visitor_id IS NOT NULL AND session_id IS NOT NULL
  AND (user_id IS NULL OR user_id=(SELECT auth.uid()))
);
DROP POLICY IF EXISTS growth_events_management_read ON public.vydys_growth_events;
CREATE POLICY growth_events_management_read ON public.vydys_growth_events
FOR SELECT TO authenticated
USING (public.is_management_user((SELECT auth.uid())));
CREATE INDEX IF NOT EXISTS growth_events_period ON public.vydys_growth_events(created_at DESC,event_type);
CREATE INDEX IF NOT EXISTS growth_events_visitor ON public.vydys_growth_events(visitor_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.vydys_admin_activation_funnel(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_start timestamptz;v_json jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT public.is_management_user((SELECT auth.uid()))
 THEN RAISE EXCEPTION 'Management access required' USING ERRCODE='42501'; END IF;
 IF p_days NOT IN (7,30,90) OR p_days IS NULL THEN
 RAISE EXCEPTION 'Invalid reporting period' USING ERRCODE='22023'; END IF;
 v_start:=((now() AT TIME ZONE 'Africa/Nouakchott')::date-(p_days-1))::timestamp
   AT TIME ZONE 'Africa/Nouakchott';
 SELECT jsonb_build_object(
  'period_days',p_days,
  'events',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'name',event_type,'events',event_count,'visitors',visitor_count,'signed_in',signed_in_count
  ) ORDER BY event_type),'[]'::jsonb)
  FROM (
    SELECT event_type,count(*)::int AS event_count,
      count(DISTINCT visitor_id)::int AS visitor_count,
      count(DISTINCT user_id)::int AS signed_in_count
    FROM public.vydys_growth_events
    WHERE created_at>=v_start
    GROUP BY event_type
  ) e),
  'anonymous_visitors_website',(SELECT count(DISTINCT visitor_id)
     FROM public.site_page_views WHERE created_at>=v_start),
  'tracked_from',(SELECT min(created_at) FROM public.vydys_growth_events)
 ) INTO v_json;
 RETURN v_json;
END;
$$;
REVOKE ALL ON FUNCTION public.vydys_admin_activation_funnel(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vydys_admin_activation_funnel(integer) TO authenticated;
COMMIT;