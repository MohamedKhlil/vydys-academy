import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function file(path) {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

test("reminders are explicitly opted in and stored with owner-only RLS", () => {
  const sql=file("supabase/migrations/202610170025_student_retention.sql");
  assert.match(sql,/classroom_reminders boolean NOT NULL DEFAULT false/);
  assert.match(sql,/study_reminders boolean NOT NULL DEFAULT false/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.student_reminder_preferences FROM PUBLIC,anon/);
  assert.match(sql,/WITH CHECK \(user_id=\(SELECT auth\.uid\(\)\)\)/);
  assert.match(sql,/USING \(user_id=\(SELECT auth\.uid\(\)\)\)/);
  assert.match(sql,/REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated/);
  assert.match(sql,/notifications_user_dedupe_unique/);
  assert.match(sql,/ON CONFLICT \(user_id,dedupe_key\).*DO NOTHING/);
});

test("retention automation runs as an internal cron with no external messaging", () => {
  const sql=file("supabase/migrations/202610170025_student_retention.sql");
  assert.match(sql,/cron\.schedule\('vydys-optin-retention-reminders'/);
  assert.match(sql,/app_private\.enqueue_student_retention_notifications/);
  assert.match(sql,/preference\.classroom_reminders=true/);
  assert.match(sql,/preference\.study_reminders=true/);
  assert.match(sql,/s\.status='scheduled'/);
  assert.match(sql,/s\.starts_at>=v_now\+v_from/);
  assert.match(sql,/e\.status IN \('active','completed'\)/);
  assert.match(sql,/interval '7 days'/);
  assert.doesNotMatch(sql,/https:\/\/api\.whatsapp|send_sms\(|send_email\(/i);
});

test("student dashboard uses real next uncompleted lesson and existing calendar", () => {
  const dashboard=file("app/dashboard/page.tsx");
  const learner=file("app/apprendre/[slug]/page.tsx");
  assert.match(dashboard,/nextLessonFor/);
  assert.match(dashboard,/StudentRetentionHub/);
  assert.match(dashboard,/modulePositions/);
  assert.match(dashboard,/calendarEvents=\{allCalendarEvents\}/);
  assert.match(dashboard,/retention-progress-bar/);
  assert.match(learner,/new URLSearchParams\(window\.location\.search\)\.get\("lesson"\)/);
  assert.match(learner,/can_access_course_content/);
  assert.match(learner,/ordered\.find\(\(lesson:any\)=>lesson\.id===requestedId\)/);
});

test("recommendations use profile interests, published courses, true prices and exclusions", () => {
  const source=file("components/student-retention-hub.tsx");
  assert.match(source,/learning_interests/);
  assert.match(source,/scoreCourse/);
  assert.match(source,/\.eq\("status","published"\)/);
  assert.match(source,/\.from\("course_prices"\)/);
  assert.match(source,/!owned\.has\(course\.id\)/);
  assert.match(source,/registration_deadline>=today/);
  assert.match(source,/\/onboarding/);
  assert.match(source,/\/practice/);
});

test("notification center exposes opt-in controls and friendly reminder categories", () => {
  const notices=file("app/notifications/page.tsx");
  const panel=file("components/student-retention-hub.tsx");
  assert.match(panel,/id="learning-reminders"/);
  assert.match(panel,/classroom_reminders/);
  assert.match(panel,/study_reminders/);
  assert.match(panel,/upsert\(\{user_id:userId/);
  assert.match(panel,/Off by default\. No email, SMS or WhatsApp is sent/);
  assert.match(notices,/\/dashboard#learning-reminders/);
  assert.match(notices,/classroom_reminder/);
  assert.match(notices,/learning_milestone/);
});
