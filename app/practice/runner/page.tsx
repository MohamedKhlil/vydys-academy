"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function SecureRunner(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null),[jobs,setJobs]=useState<any[]>([]);
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    const {data:j}=await supabase.from("secure_sandbox_jobs").select("id,runtime,status,provider,limits,result,created_at,completed_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10);setJobs(j||[]);
  })()},[]);

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Secure Runner...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Secure Runner</span><h1>{t({fr:"Le futur moteur des évaluations Verified.",ar:"محرك التقييمات Verified القادم.",en:"The future engine for Verified assessments."})}</h1><p>{t({fr:"Architecture prête pour exécuter des projets Python/Node dans des environnements éphémères isolés avec réseau coupé, limites CPU/RAM, timeout et tests privés.",ar:"معمارية جاهزة لتشغيل مشاريع Python/Node في بيئات مؤقتة معزولة، بلا شبكة، مع حدود CPU/RAM واختبارات خاصة.",en:"Architecture ready to run Python/Node projects in isolated ephemeral environments with network off, CPU/RAM limits, timeout and private tests."})}</p></div><span className="runner-status">Provider required</span></div>

    <div className="runner-architecture-grid">
      <article className="panel"><span>01</span><strong>{t({fr:"Upload du projet",ar:"رفع المشروع",en:"Project bundle"})}</strong><p>{t({fr:"Bundle temporaire signé, jamais rendu public.",ar:"حزمة مؤقتة موقعة وغير عامة.",en:"Temporary signed bundle, never public."})}</p></article>
      <article className="panel"><span>02</span><strong>{t({fr:"Sandbox isolé",ar:"بيئة معزولة",en:"Isolated sandbox"})}</strong><p>CPU 10s · RAM 256 MB · network off · timeout 20s</p></article>
      <article className="panel"><span>03</span><strong>{t({fr:"Tests privés",ar:"اختبارات خاصة",en:"Private tests"})}</strong><p>{t({fr:"Les tests certifiants restent hors du navigateur.",ar:"تبقى اختبارات التحقق خارج المتصفح.",en:"Certification tests stay outside the browser."})}</p></article>
      <article className="panel"><span>04</span><strong>{t({fr:"Preuve",ar:"الدليل",en:"Evidence"})}</strong><p>{t({fr:"Résultat signé pouvant ensuite alimenter Verified.",ar:"نتيجة موقعة يمكن أن تغذي Verified.",en:"Signed result can later feed Verified."})}</p></article>
    </div>

    <article className="panel runner-provider-card"><div><span className="eyebrow">{t({fr:"État",ar:"الحالة",en:"Status"})}</span><h2>{t({fr:"La couche Vydys est prête. Il manque le fournisseur d’exécution isolée.",ar:"طبقة Vydys جاهزة. ينقص فقط مزود التنفيذ المعزول.",en:"The Vydys layer is ready. The isolated execution provider is the missing piece."})}</h2><p>{t({fr:"Je n’exécute volontairement pas du code arbitraire dans Supabase Edge Functions. Le provider final doit offrir un vrai sandbox éphémère par job.",ar:"لن نشغل عمداً كوداً عشوائياً داخل Supabase Edge Functions. يجب أن يوفر المزود النهائي sandbox مؤقتاً لكل job.",en:"Vydys intentionally does not run arbitrary code inside Supabase Edge Functions. The final provider must supply a real ephemeral sandbox per job."})}</p></div><div className="runner-limits"><span>Network <b>OFF</b></span><span>Timeout <b>20s</b></span><span>Memory <b>256 MB</b></span><span>Runtimes <b>Python / Node</b></span></div></article>

    <section className="lab-section"><div className="section-head compact"><div><span className="eyebrow">Jobs</span><h2>{t({fr:"Historique Secure Runner",ar:"سجل Secure Runner",en:"Secure Runner history"})}</h2></div></div>{jobs.length===0?<article className="panel"><p>{t({fr:"Aucun job distant pour le moment. Utilisez Code Lab et les challenges sandboxés en attendant l’activation du provider.",ar:"لا توجد jobs بعيدة حالياً. استخدم Code Lab والتحديات المعزولة حتى تفعيل المزود.",en:"No remote jobs yet. Use Code Lab and sandboxed challenges until the provider is activated."})}</p></article>:<div className="runner-job-list">{jobs.map(j=><article className="panel" key={j.id}><strong>{j.runtime}</strong><span>{j.status}</span><small>{new Date(j.created_at).toLocaleString()}</small></article>)}</div>}</section>
    <div className="runner-actions"><Link className="btn" href="/ai-lab/code">{t({fr:"Utiliser Code Lab maintenant",ar:"استخدام Code Lab الآن",en:"Use Code Lab now"})}</Link><Link className="btn btn-ghost" href="/practice">{t({fr:"Voir tous les labs",ar:"عرض كل المختبرات",en:"View all labs"})}</Link></div>
  </div></section>
}
