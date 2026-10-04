"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function CloudLab(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null),[userId,setUserId]=useState("");
  const [title,setTitle]=useState("Vydys AI App"),[runtime,setRuntime]=useState("nextjs"),[database,setDatabase]=useState("supabase");
  const [ai,setAi]=useState(true),[storage,setStorage]=useState(true),[jobs,setJobs]=useState(false),[notice,setNotice]=useState("");
  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}setUserId(user.id);const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();setAllowed(p?.role==="student")})()},[]);
  const arch=useMemo(()=>{
    const parts=[{n:"Client",d:"Browser / mobile",i:"UI"},{n:"App",d:runtime==="nextjs"?"Next.js":"Node API",i:"APP"},{n:"Database",d:database,i:"DB"}];
    if(ai)parts.push({n:"AI Provider",d:"BYOK via server proxy",i:"AI"});if(storage)parts.push({n:"Object Storage",d:"Private bucket",i:"S3"});if(jobs)parts.push({n:"Jobs",d:"Queue / worker",i:"JOB"});return parts;
  },[runtime,database,ai,storage,jobs]);
  const checklist=[
    ["Secrets","Server-side only, never NEXT_PUBLIC"],["Auth","RLS / authorization checks"],["Database","Migrations + indexes"],["Storage","Private bucket + policies"],
    ["AI","Quota, logs, provider errors"],["Observability","Errors, latency, alerts"],["Backups","Database recovery plan"],["Deploy","Production env + smoke tests"]
  ].filter(([k])=>k!=="AI"||ai).filter(([k])=>k!=="Storage"||storage);
  async function save(){
    const {error}=await supabase.from("cloud_lab_blueprints").insert({user_id:userId,title,app_type:"web",runtime,database_type:database,has_ai:ai,has_storage:storage,has_background_jobs:jobs,architecture:{parts:arch},checklist:checklist.map(([name,detail])=>({name,detail,done:false})),status:"ready"});setNotice(error?error.message:t({fr:"Blueprint sauvegardé.",ar:"تم حفظ المخطط.",en:"Blueprint saved."}))
  }
  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Cloud Lab...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Cloud Lab</span><h1>{t({fr:"Pensez production dès le premier projet.",ar:"فكر في الإنتاج منذ أول مشروع.",en:"Think production from day one."})}</h1><p>{t({fr:"Dessinez votre architecture, vérifiez sécurité, secrets, données, observabilité et préparation au déploiement.",ar:"صمم المعمارية وتحقق من الأمان والأسرار والبيانات والمراقبة والاستعداد للنشر.",en:"Design architecture and check security, secrets, data, observability and deployment readiness."})}</p></div><Link className="btn" href="/projects">Create Project →</Link></div>
    {notice&&<p className="manual-note">{notice}</p>}
    <div className="cloud-lab-grid">
      <section className="panel cloud-config"><label className="form-field"><span>Blueprint name</span><input value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="form-field"><span>Runtime</span><select value={runtime} onChange={e=>setRuntime(e.target.value)}><option value="nextjs">Next.js</option><option value="node">Node.js API</option></select></label><label className="form-field"><span>Database</span><select value={database} onChange={e=>setDatabase(e.target.value)}><option value="supabase">Supabase/Postgres</option><option value="postgres">PostgreSQL</option></select></label><div className="cloud-toggles"><label><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)}/> AI integration</label><label><input type="checkbox" checked={storage} onChange={e=>setStorage(e.target.checked)}/> Object storage</label><label><input type="checkbox" checked={jobs} onChange={e=>setJobs(e.target.checked)}/> Background jobs</label></div><button className="btn" onClick={save}>{t({fr:"Sauvegarder le blueprint",ar:"حفظ المخطط",en:"Save blueprint"})}</button></section>
      <section className="panel cloud-architecture"><div className="practice-editor-head"><strong>Architecture</strong><span>{arch.length} components</span></div><div className="cloud-arch-flow">{arch.map((p,i)=><div key={p.n}>{i>0&&<i>→</i>}<article><span>{p.i}</span><strong>{p.n}</strong><small>{p.d}</small></article></div>)}</div></section>
    </div>
    <section className="lab-section"><div className="section-head compact"><div><span className="eyebrow">Production Readiness</span><h2>{t({fr:"Checklist de déploiement",ar:"قائمة جاهزية النشر",en:"Deployment checklist"})}</h2></div></div><div className="cloud-check-grid">{checklist.map(([name,detail],i)=><article className="panel" key={name}><span>{String(i+1).padStart(2,"0")}</span><strong>{name}</strong><p>{detail}</p></article>)}</div></section>
    <article className="panel practice-tip"><strong>{t({fr:"Important",ar:"مهم",en:"Important"})}</strong><p>{t({fr:"Cloud Lab enseigne l’architecture et la préparation. Un vrai déploiement nécessite ensuite le compte cloud/Git du projet.",ar:"Cloud Lab يعلّم المعمارية والاستعداد. النشر الحقيقي يتطلب حساب cloud/Git للمشروع.",en:"Cloud Lab teaches architecture and readiness. Real deployment still requires the project’s cloud/Git account."})}</p></article>
  </div></section>
}
