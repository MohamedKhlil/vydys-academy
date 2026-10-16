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
