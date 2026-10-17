import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

function source(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8")}

test("Legacy payment cannot charge a hard-coded or draft course",()=>{
  const page=source("app/paiement/page.tsx");
  assert.match(page,/redirect\("\/formations"\)/);
  assert.match(page,/redirect\("\/formation\/"/);
  assert.doesNotMatch(page,/submit_platform_course_payment|BASE_PRICE|COURSE_ID/);
});

test("The public course pages render on server and filter to published courses",()=>{
  const catalog=source("app/formations/page.tsx");
  const detail=source("app/formation/[slug]/page.tsx");
  assert.doesNotMatch(catalog,/^"use client"/);
  assert.doesNotMatch(detail,/^"use client"/);
  assert.match(catalog,/initialCourses=/);
  assert.match(detail,/generateMetadata/);
  assert.match(detail,/notFound\(\)/);
  assert.match(catalog,/\.eq\("status","published"\)/);
  assert.match(detail,/\.eq\("slug",slug\)\.eq\("status","published"\)/);
});

test("Sitemap discovers only published and public content",()=>{
  const sitemap=source("app/sitemap.ts");
  assert.match(sitemap,/\.eq\("status", "published"\)/);
  assert.match(sitemap,/\.eq\("is_public", true\)/);
  assert.match(sitemap,/\.is\("course_id", null\)/);
  assert.doesNotMatch(sitemap,/lastModified:new Date\(\)/);
});

test("Offline service worker refuses to cache protected routes",()=>{
  const handlers={};
  const self={location:{origin:"https://www.vydys.com"},addEventListener(type,handler){handlers[type]=handler},skipWaiting(){},clients:{claim(){}}};
  const caches={open:async()=>({add:async()=>{},put:async()=>{}}),match:async()=>null,keys:async()=>[]};
  runInNewContext(source("public/sw.js"),{self,caches,URL,Promise,Response:{error:()=>({status:0})},fetch:async()=>({ok:true,type:"basic",clone(){return this}})});
  assert.equal(typeof handlers.fetch,"function");
  for(const path of ["/dashboard","/formateur/classrooms","/api/private","/paiement","/apprendre/a","/notifications"]){
    let responded=false;
    handlers.fetch({request:{method:"GET",url:"https://www.vydys.com"+path,mode:"navigate"},respondWith(){responded=true}});
    assert.equal(responded,false,"Protected route unexpectedly intercepted: "+path);
  }
  let intercepted=false;
  handlers.fetch({request:{method:"GET",url:"https://www.vydys.com/formations",mode:"navigate"},respondWith(){intercepted=true}});
  assert.equal(intercepted,true,"Public navigation must have offline fallback");
});

test("PWA has a standalone manifest and a safe offline page",()=>{
  const manifest=JSON.parse(source("public/manifest.webmanifest"));
  assert.equal(manifest.display,"standalone");
  assert.ok(manifest.icons?.length);
  assert.match(source("public/offline.html"),/Connexion momentanément indisponible/);
});

test("Published instructor profiles remain indexable without exposing the private studio",()=>{
  const robots=source("app/robots.ts");
  const trainer=source("app/formateur/[slug]/page.tsx");
  assert.ok(!robots.includes('"/formateur/"'),"Public trainer profiles must not be blocked");
  assert.ok(robots.includes('"/formateur$"'),"Private instructor root must be excluded");
  assert.ok(robots.includes('"/formateur/classrooms"'));
  assert.ok(robots.includes('"/formateur/paiements"'));
  assert.ok(trainer.includes("generateMetadata"));
  assert.ok(trainer.includes("initialTrainer="));
  assert.ok(trainer.includes('.eq("is_public",true)'));
});

test("Course content and checkout status are server-ready without a misleading payment error",()=>{
  const detail=source("app/formation/[slug]/page.tsx");
  const interactive=source("app/formation/[slug]/formation-client.tsx");
  assert.ok(detail.includes("initialModules="));
  assert.ok(interactive.includes("detailsLoaded"));
  assert.ok(interactive.includes("Loading payment methods"));
});

test("Private instructor studio routes are excluded from crawler indexing",()=>{
  const robots=source("app/robots.ts");
  for(const route of ["/formateur/marketing","/formateur/nouvelle-formation","/formateur/projets"]){
    assert.ok(robots.includes('"'+route+'"'),"Missing crawler exclusion for "+route);
  }
});

test("Public homepage features existing published courses with authoritative active prices",()=>{
  const homepage=source("app/page.tsx");
  const featured=source("components/home-growth.tsx");
  assert.match(homepage,/\.eq\("status","published"\)/);
  assert.match(homepage,/\.from\("course_prices"\)/);
  assert.match(homepage,/\.eq\("is_active",true\)/);
  assert.match(homepage,/featuredCourses=/);
  assert.match(featured,/\/formation\//);
  assert.match(featured,/utm_source=community/);
  assert.match(featured,/navigator\.share/);
  assert.match(featured,/aria-pressed=/);
});

test("Redirect after login only permits learner pages on the same origin",()=>{
  const typescript=source("lib/post-auth-path.ts");
  const javascript=typescript
    .replace("] as const;","];" )
    .replace("export function safeStudentReturnPath(value: string | null | undefined): string {","function safeStudentReturnPath(value) {");
  const safe=new Function(javascript+"\nreturn safeStudentReturnPath;")();
  for(const malicious of [
    "https://evil.example/steal","//evil.example","/\\\\evil.example",
    "/admin","/formateur","/api/private","/formation/../admin",
    "/payment","/practice\nnext=http://evil.example"
  ]) assert.equal(safe(malicious),"",malicious);
  assert.equal(safe("/practice"),"/practice");
  assert.equal(safe("/skill-engine?focus=ai"),"/skill-engine?focus=ai");
  assert.equal(safe("/formation/introduction-intelligence-artificielle-2026"),"/formation/introduction-intelligence-artificielle-2026");
  const login=source("app/connexion/page.tsx");
  const callback=source("app/auth/complete/page.tsx");
  assert.match(login,/nextAfterAuth/);
  assert.match(callback,/safeStudentReturnPath/);
});

test("Growth journeys are transparent about illustrative content and paid courses",()=>{
  const homepage=source("components/home-page-client.tsx");
  const section=source("components/home-growth.tsx");
  assert.match(homepage,/Illustrative preview of Vydys/);
  assert.match(homepage,/href="\/connexion\?mode=register/);
  assert.match(section,/some courses are paid/);
  assert.match(section,/\/devenir-formateur/);
});

test("UTM campaign tracking uses sanitized tags and management-only report",()=>{
  const tracking=source("components/site-analytics-tracker.tsx");
  const report=source("components/admin-visitor-analytics.tsx");
  assert.match(tracking,/utm_source/);
  assert.match(tracking,/\[\^a-z0-9_-\]/);
  assert.match(tracking,/isEntry\?campaignTags/);
  assert.match(report,/vydys_acquisition_campaigns/);
});
