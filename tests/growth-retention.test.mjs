import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Growth RPC is guarded, INVOKER-secured and callable only by authenticated users",()=>{
  const sql=read("supabase/migrations/202610170044_vydys_growth_retention.sql");
  assert.match(sql,/SECURITY INVOKER/);
  assert.match(sql,/is_management_user\(\(SELECT auth\.uid\(\)\)\)/);
  assert.match(sql,/RAISE EXCEPTION 'Accès réservé/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.vydys_admin_growth_metrics\(integer\) FROM PUBLIC,anon/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.vydys_admin_growth_metrics\(integer\) TO authenticated/);
  assert.match(sql,/CREATE POLICY enrollments_management_read_for_growth/);
  assert.match(sql,/FOR SELECT TO authenticated/);
  assert.doesNotMatch(sql,/SECURITY DEFINER/);
});

test("Report uses actual registrations, authenticated visits and completed lessons",()=>{
  const sql=read("supabase/migrations/202610170044_vydys_growth_retention.sql");
  assert.match(sql,/FROM public\.profiles/);
  assert.match(sql,/FROM public\.site_page_views/);
  assert.match(sql,/v\.user_id IS NOT NULL/);
  assert.match(sql,/JOIN public\.enrollments e/);
  assert.match(sql,/JOIN public\.course_lessons l/);
  assert.match(sql,/FROM public\.lesson_progress/);
  assert.match(sql,/HAVING count\(DISTINCT lp\.lesson_id\)/);
  assert.match(sql,/FROM public\.certificates/);
  assert.match(sql,/HAVING count\(DISTINCT day\)>=2/);
  assert.match(sql,/p_days NOT IN \(7,30,90\)/);
  assert.match(sql,/Africa\/Nouakchott/);
});

test("Admin dashboard includes the new metrics, trends and date controls",()=>{
  const admin=read("app/admin/analytics/page.tsx");
  const landing=read("app/admin/page.tsx");
  const widget=read("components/admin-growth-retention.tsx");
  assert.match(admin,/import AdminGrowthRetention/);
  assert.match(admin,/<AdminGrowthRetention \/>/);
  assert.match(landing,/\/admin\/analytics#growth-retention/);
  assert.match(widget,/\.rpc\("vydys_admin_growth_metrics",\{p_days:days\}\)/);
  assert.match(widget,/(\[7,30,90\] as const)/);
  assert.match(widget,/returning_students/);
  assert.match(widget,/courses_completed/);
  assert.match(widget,/new_accounts/);
  assert.match(widget,/active_users/);
  assert.match(widget,/tracking_started_at/);
  assert.match(widget,/role="img"/);
  assert.match(widget,/<details className="growth-data-details">/);
});

test("Activity definitions distinguish daily activity from unique users",()=>{
  const widget=read("components/admin-growth-retention.tsx");
  assert.match(widget,/daily-unique activity summed across weeks/);
  assert.match(widget,/at least two different days/);
  assert.match(widget,/Anonymous visits are excluded/);
  assert.match(widget,/Summed daily active users do not equal period-wide unique users/);
  assert.match(widget,/returningRate===null/);
  assert.match(widget,/No recorded events/);
});
