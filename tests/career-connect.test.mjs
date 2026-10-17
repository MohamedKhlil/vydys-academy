import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("New CVs are private and only deliberately published entries appear in recruiters' search",()=>{
 const harden=read("supabase/migrations/202610170130_cv_privacy_hardening.sql");
 const existing=read("supabase/migrations/202610170109_vydys_talents_cv.sql");
 assert.match(harden,/ALTER COLUMN is_public SET DEFAULT false/);
 assert.match(harden,/discoverable=false AND updated_at=created_at/);
 assert.match(existing,/discoverable boolean NOT NULL DEFAULT false/);
 assert.match(existing,/sp.is_public=true AND sp.discoverable=true/);
 const profile=read("app/portfolio/page.tsx");
 assert.match(profile,/discoverable:isPublic&&discoverable/);
 assert.match(profile,/setDiscoverable\(false\)/);
 assert.match(profile,/career-cv-onboarding/);
 assert.match(profile,/educationCount/);
 assert.match(profile,/experienceCount/);
});

test("Sensitive RPCs cannot be executed anonymously",()=>{
 const sql=read("supabase/migrations/202610170130_cv_privacy_hardening.sql");
 for(const fn of ["auto_issue_certificate_trigger","issue_certificate_if_eligible","has_classroom_session_access","create_manual_classroom_order"]){
   assert.ok(sql.includes(fn),"missing hardening for "+fn);
 }
 assert.match(sql,/REVOKE EXECUTE.*FROM PUBLIC,anon/);
});

test("Employer approval is protected from owner elevation and unpublished offers stay private",()=>{
 const sql=read("supabase/migrations/202610170200_career_connect.sql");
 assert.match(sql,/status text NOT NULL DEFAULT 'pending'/);
 assert.match(sql,/NEW.status IS DISTINCT FROM OLD.status/);
 assert.match(sql,/career_guard_company_review/);
 assert.match(sql,/is_management_user\(\(SELECT auth.uid\(\)\)\)/);
 assert.match(sql,/status='published'/);
 assert.match(sql,/co.status='approved'/);
 assert.match(sql,/ALTER TABLE public.career_companies ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/ALTER TABLE public.career_jobs ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/employment_type IN \('full_time','part_time','internship','freelance','contract','apprenticeship'\)/);
});

test("Applications are tied to authenticated owners and can only be reviewed through guarded RPC",()=>{
 const sql=read("supabase/migrations/202610170200_career_connect.sql");
 assert.match(sql,/ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/GRANT SELECT,INSERT ON public.career_applications TO authenticated/);
 assert.match(sql,/UNIQUE \(job_id,applicant_id\)/);
 assert.match(sql,/applicant_id=\(SELECT auth.uid\(\)\) AND status='submitted'/);
 assert.match(sql,/career_review_application/);
 assert.match(sql,/j.employer_user_id=v_me/);
 assert.match(sql,/career_withdraw_application/);
 assert.match(sql,/applicant_id=v_me AND status IN/);
 assert.doesNotMatch(sql,/GRANT.*UPDATE ON public.career_applications TO authenticated/);
});

test("Recruiter contact requires opt-in and open-to-work, with consent before chat",()=>{
 const sql=read("supabase/migrations/202610170200_career_connect.sql");
 const chat=read("app/carriere/contacts/page.tsx");
 const form=read("components/talent-contact-form.tsx");
 assert.match(sql,/WHERE public_slug=p_slug AND is_public AND discoverable AND open_to_work/);
 assert.match(sql,/created_at>now\(\)-interval '24 hours'\)>=5/);
 assert.match(sql,/status='accepted'/);
 assert.match(sql,/GRANT SELECT,INSERT ON public.career_contact_messages TO authenticated/);
 assert.match(sql,/sender_id=\(SELECT auth.uid\(\)\)/);
 assert.match(sql,/career_contact_not_self/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public.career_request_talent_contact\(text,text\) FROM PUBLIC,anon/);
 assert.match(chat,/career_respond_contact/);
 assert.match(chat,/career_contact_messages/);
 assert.match(form,/career_request_talent_contact/);
 const cv=read("components/talent-profile-client.tsx");
 assert.match(cv,/available=\{profile.discoverable&&profile.open_to_work\}/);
});

test("Employer workspace and management review are actual authenticated workflows",()=>{
 const employer=read("app/carriere/entreprise/page.tsx");
 const admin=read("app/admin/entreprises/page.tsx");
 assert.match(employer,/career_companies/);
 assert.match(employer,/career_jobs/);
 assert.match(employer,/career_applications/);
 assert.match(employer,/career_review_application/);
 assert.match(employer,/company.status==="approved"/);
 assert.match(admin,/includes\(data\?\.role\|\|""\)/);
 assert.match(admin,/reviewed_by:me/);
 assert.match(read("app/admin/page.tsx"),/href="\/admin\/entreprises"/);
});

test("Job board is public and responsive, applications never email private CVs automatically",()=>{
 const board=read("app/carriere/page.tsx");
 const listings=read("components/career-job-board.tsx");
 const detail=read("app/carriere/[id]/page.tsx");
 const apply=read("components/career-apply-form.tsx");
 const css=read("app/career.css");
 assert.match(board,/\.eq\("status","published"\)/);
 assert.match(board,/revalidate=60/);
 assert.match(detail,/https:\/\/schema.org/);
 assert.match(detail,/JobPosting/);
 assert.match(listings,/Open to work|Open to opportunities|Remote possible/);
 assert.match(apply,/career_applications/);
 assert.match(apply,/your email address is not automatically shared/i);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:400px\)/);
 assert.match(read("app/sitemap.ts"),/\/carriere/);
});

test("Activation events contain pseudonymous IDs, no private CV, payment or contact details",()=>{
 const sql=read("supabase/migrations/202610170215_activation_funnel.sql");
 const tracker=read("lib/growth-events.ts");
 const dashboard=read("components/admin-activation-funnel.tsx");
 assert.match(sql,/ALTER TABLE public.vydys_growth_events ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/user_id IS NULL OR user_id=\(SELECT auth.uid\(\)\)/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/is_management_user\(\(SELECT auth.uid\(\)\)\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public.vydys_admin_activation_funnel\(integer\) FROM PUBLIC,anon/);
 assert.doesNotMatch(sql,/cover_letter|full_name|email|phone|proof_path/);
 assert.match(tracker,/vydys_analytics_visitor/);
 assert.match(tracker,/window.location.pathname/);
 assert.doesNotMatch(tracker,/searchParams|queryParams|localStorage.getItem\("email"\)/);
 assert.match(dashboard,/Totals are independent, not step-to-step conversion rates/);
 assert.match(read("app/admin/analytics/page.tsx"),/AdminActivationFunnel/);
});

test("Notifications are internal and anti-spam rate limits constrain private career chat",()=>{
 const sql=read("supabase/migrations/202610170245_career_notifications.sql");
 assert.match(sql,/career_notify_new_application/);
 assert.match(sql,/career_guard_chat_rate/);
 assert.match(sql,/interval '1 hour'\)>=20/);
 assert.match(sql,/career_notify_new_message/);
 assert.doesNotMatch(sql,/twilio|send_email|whatsapp\.com/);
});

test("New public navigation and authentication return paths are coherent",()=>{
 const header=read("components/header.tsx");
 const footer=read("components/footer.tsx");
 const homepage=read("components/home-page-client.tsx");
 const auth=read("lib/post-auth-path.ts");
 assert.match(header,/href="\/carriere"/);
 assert.match(footer,/href="\/carriere"/);
 assert.match(homepage,/href="\/carriere"/);
 assert.match(auth,/"\/carriere"/);
 assert.match(auth,/"\/talent"/);
 assert.match(read("app/admin/page.tsx"),/\/admin\/entreprises/);
 assert.match(read("app/robots.ts"),/\/admin/);
});
