import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8")}

test("Recruiter directory is explicitly opt-in and contains no private contact data",()=>{
  const sql=read("supabase/migrations/202610170109_vydys_talents_cv.sql");
  assert.match(sql,/discoverable boolean NOT NULL DEFAULT false/);
  assert.match(sql,/sp\.is_public=true AND sp\.discoverable=true/);
  assert.match(sql,/WITH \(security_invoker=true\)/);
  assert.match(sql,/REVOKE ALL ON public\.vydys_public_talent_directory FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT SELECT ON public\.vydys_public_talent_directory TO anon,authenticated/);
  const view=sql.slice(sql.indexOf("CREATE OR REPLACE VIEW public.vydys_public_talent_directory"));
  assert.doesNotMatch(view,/\bemail\b|\bphone\b|\buser_id\b/);
});

test("Private CV education and work entries enforce user ownership",()=>{
  const sql=read("supabase/migrations/202610170109_vydys_talents_cv.sql");
  assert.match(sql,/ALTER TABLE public\.student_education ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/ALTER TABLE public\.student_experience ENABLE ROW LEVEL SECURITY/);
  for(const table of ["student_education","student_experience"]){
    assert.match(sql,new RegExp("CREATE POLICY talent_.*_insert ON public\\."+table));
    assert.match(sql,new RegExp("CREATE POLICY talent_.*_update ON public\\."+table));
    assert.match(sql,new RegExp("CREATE POLICY talent_.*_delete ON public\\."+table));
    assert.match(sql,new RegExp("FROM public\\.student_profiles sp[\\s\\S]+sp\\.is_public=true"));
  }
  assert.match(sql,/is_public boolean NOT NULL DEFAULT false/);
  assert.match(sql,/user_id=\(SELECT auth\.uid\(\)\)/);
});

test("Portfolio allows separate consent for public link and recruiter listing",()=>{
  const portfolio=read("app/portfolio/page.tsx");
  const editor=read("components/student-cv-editor.tsx");
  assert.match(portfolio,/setDiscoverable/);
  assert.match(portfolio,/discoverable:isPublic&&discoverable/);
  assert.match(portfolio,/setIsPublic/);
  assert.match(portfolio,/open_to_work:openToWork/);
  assert.match(portfolio,/self_reported_skills:selfSkills/);
  assert.match(portfolio,/StudentCvEditor/);
  assert.match(editor,/student_education/);
  assert.match(editor,/student_experience/);
  assert.match(editor,/is_public:educationForm\.is_public/);
  assert.match(editor,/is_public:experienceForm\.is_public/);
  assert.match(editor,/\.eq\("user_id",userId\)/);
});

test("Directory is searchable, recruiter accessible, and listed in navigation and homepage",()=>{
  const directory=read("app/talents/page.tsx");
  const client=read("components/talents-directory.tsx");
  const header=read("components/header.tsx");
  const homepage=read("components/home-page-client.tsx");
  const sitemap=read("app/sitemap.ts");
  assert.match(directory,/vydys_public_talent_directory/);
  assert.match(directory,/export const metadata/);
  assert.match(client,/availableOnly/);
  assert.match(client,/open_to_work/);
  assert.match(client,/\/talent\//);
  assert.match(header,/href="\/talents"/);
  assert.match(homepage,/VYDYS TALENTS/);
  assert.match(sitemap,/\.eq\("discoverable",true\)/);
  assert.match(sitemap,/\.eq\("is_public",true\)/);
});

test("Public CV has verified skill filter, private-row filter and print option",()=>{
  const profile=read("app/talent/[slug]/page.tsx");
  const client=read("components/talent-profile-client.tsx");
  assert.match(profile,/\.eq\("is_public",true\)/);
  assert.match(profile,/\.eq\("verification_status","verified"\)/);
  assert.match(profile,/student_education/);
  assert.match(profile,/student_experience/);
  assert.match(profile,/\.eq\("is_public",true\)/);
  assert.match(profile,/robots:\{index:person\.discoverable===true/);
  assert.match(client,/window\.print\(\)/);
  assert.match(client,/Self-reported by the profile owner/);
  assert.match(client,/Vydys-approved projects/);
  assert.match(read("app/talents.css"),/@media print/);
});
