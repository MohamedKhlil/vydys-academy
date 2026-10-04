"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

const starters:any={
  python:`# Runs in an isolated Vercel Firecracker microVM
def analyze(values):
    return {
        "count": len(values),
        "sum": sum(values),
        "average": sum(values) / len(values),
    }

print(analyze([10, 20, 30, 40]))
`,
  node:`// Runs in an isolated Vercel Firecracker microVM
function analyze(values) {
  return {
    count: values.length,
    sum: values.reduce((a, b) => a + b, 0),
    average: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

console.log(analyze([10, 20, 30, 40]));
`
};

export default function SecureRunner(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null),[jobs,setJobs]=useState<any[]>([]);
  const [language,setLanguage]=useState<"python"|"node">("python");
  const [code,setCode]=useState(starters.python);
  const [busy,setBusy]=useState(false),[result,setResult]=useState<any>(null),[error,setError]=useState("");

  async function loadJobs(userId?:string){
    let uid=userId;
    if(!uid){const {data:{user}}=await supabase.auth.getUser();uid=user?.id}
    if(!uid)return;
    const {data:j}=await supabase.from("secure_sandbox_jobs").select("id,runtime,status,provider,limits,result,created_at,completed_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(10);
    setJobs(j||[]);
  }

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    await loadJobs(user.id);
  })()},[]);

  function switchLang(next:"python"|"node"){setLanguage(next);setCode(starters[next]);setResult(null);setError("")}

  async function run(){
    if(!code.trim()||busy)return;setBusy(true);setError("");setResult(null);
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token){setBusy(false);window.location.href="/connexion";return}
    try{
      const res=await fetch("/api/practice/run",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
        body:JSON.stringify({language,code})
      });
      const data=await res.json();
      if(!res.ok||data?.error)throw new Error(data?.stderr||data?.detail||data?.error||"Sandbox error");
      setResult(data);
      await loadJobs(session.user.id);
    }catch(e:any){
      setError(String(e?.message||e));
      await loadJobs(session.user.id);
    }finally{setBusy(false)}
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Secure Runner...</div></div></section>;
  if(!allowed)return <section className="practice-page"><div className="container"><article className="panel"><h1>{t({fr:"Secure Runner est réservé aux étudiants.",ar:"Secure Runner مخصص للطلاب.",en:"Secure Runner is for students."})}</h1></article></div></section>;

  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Secure Runner · Firecracker</span><h1>{t({fr:"Exécutez du vrai code dans une microVM isolée.",ar:"شغّل كوداً حقيقياً داخل microVM معزولة.",en:"Run real code inside an isolated microVM."})}</h1><p>{t({fr:"Python et Node s’exécutent hors de Vydys, dans un environnement éphémère avec réseau coupé, timeout et ressources limitées.",ar:"يعمل Python وNode خارج Vydys داخل بيئة مؤقتة معزولة بدون شبكة ومع حدود للوقت والموارد.",en:"Python and Node run outside Vydys in an ephemeral environment with networking disabled, a timeout and resource limits."})}</p></div><span className="runner-status live">● Vercel Sandbox</span></div>

    <div className="runner-architecture-grid">
      <article className="panel"><span>01</span><strong>{t({fr:"Code étudiant",ar:"كود الطالب",en:"Student code"})}</strong><p>{t({fr:"30 000 caractères maximum par exécution.",ar:"حد أقصى 30000 حرف لكل تشغيل.",en:"30,000 characters maximum per run."})}</p></article>
      <article className="panel"><span>02</span><strong>{t({fr:"MicroVM isolée",ar:"microVM معزولة",en:"Isolated microVM"})}</strong><p>1 vCPU · ~2 GB RAM · ephemeral</p></article>
      <article className="panel"><span>03</span><strong>{t({fr:"Réseau coupé",ar:"الشبكة مغلقة",en:"Network denied"})}</strong><p>networkPolicy = deny-all</p></article>
      <article className="panel"><span>04</span><strong>{t({fr:"Limites anti-abus",ar:"حدود الاستخدام",en:"Usage limits"})}</strong><p>12 runs/hour · 60/day · execution ~12s</p></article>
    </div>

    <div className="secure-runner-grid">
      <section className="panel secure-runner-editor">
        <div className="runner-toolbar"><div><button className={language==="python"?"active":""} onClick={()=>switchLang("python")}>Python</button><button className={language==="node"?"active":""} onClick={()=>switchLang("node")}>Node.js</button></div><span>{language==="python"?"python3":"node"} · network off</span></div>
        <textarea spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} maxLength={30000}/>
        <div className="practice-editor-actions"><button className="btn" disabled={busy||!code.trim()} onClick={run}>{busy?"Launching microVM...":"▶ "+t({fr:"Exécuter isolément",ar:"تشغيل معزول",en:"Run isolated"})}</button><button className="btn btn-ghost" onClick={()=>{setCode(starters[language]);setResult(null);setError("")}}>{t({fr:"Réinitialiser",ar:"إعادة تعيين",en:"Reset"})}</button></div>
      </section>

      <section className="panel secure-runner-console">
        <div className="practice-editor-head"><strong>{t({fr:"Console distante",ar:"وحدة التحكم البعيدة",en:"Remote console"})}</strong>{result&&<span>{result.duration_ms} ms · exit {result.exit_code}</span>}</div>
        {error?<pre className="runner-console-error">{error}</pre>:result?<><div className="runner-result-meta"><span className={result.status==="passed"?"pass":"fail"}>{result.status}</span><span>{result.network}</span><span>{result.provider}</span><span>job {String(result.job_id).slice(0,8)}</span></div><pre>{result.stdout||result.stderr||"(no output)"}</pre>{result.stderr&&result.stdout&&<details><summary>stderr</summary><pre>{result.stderr}</pre></details>}</>:<div className="practice-tests-empty"><span>RUN</span><p>{t({fr:"Votre sortie apparaîtra ici. Aucun secret Vydys n’est injecté dans la microVM.",ar:"ستظهر المخرجات هنا. لا يتم حقن أي أسرار Vydys داخل microVM.",en:"Your output will appear here. No Vydys secrets are injected into the microVM."})}</p></div>}
      </section>
    </div>

    <article className="panel runner-provider-card"><div><span className="eyebrow">{t({fr:"Sécurité",ar:"الأمان",en:"Security"})}</span><h2>{t({fr:"La pratique distante est maintenant active.",ar:"التدريب البعيد مفعل الآن.",en:"Remote practice is now active."})}</h2><p>{t({fr:"Le code ne s’exécute ni dans le navigateur principal ni dans Supabase Edge. Chaque run démarre une microVM Vercel éphémère, sans réseau, puis elle est arrêtée après l’exécution.",ar:"لا يعمل الكود داخل المتصفح الرئيسي ولا داخل Supabase Edge. كل تشغيل يبدأ microVM مؤقتة من Vercel بدون شبكة ثم يتم إيقافها بعد التنفيذ.",en:"Code runs neither in the main browser nor in Supabase Edge. Each run starts an ephemeral Vercel microVM with networking denied, then stops it after execution."})}</p></div><div className="runner-limits"><span>Network <b>DENY ALL</b></span><span>Run limit <b>~12s</b></span><span>Memory <b>~2 GB</b></span><span>Runtime <b>Python / Node</b></span></div></article>

    <section className="lab-section"><div className="section-head compact"><div><span className="eyebrow">Jobs</span><h2>{t({fr:"Historique des exécutions",ar:"سجل التشغيل",en:"Execution history"})}</h2></div></div>{jobs.length===0?<article className="panel"><p>{t({fr:"Aucune exécution distante pour le moment.",ar:"لا توجد عمليات تشغيل بعيدة حتى الآن.",en:"No remote execution yet."})}</p></article>:<div className="runner-job-list">{jobs.map(j=><article className="panel" key={j.id}><strong>{j.runtime}</strong><span className={"runner-job-status "+j.status}>{j.status}</span><small>{new Date(j.created_at).toLocaleString()}</small></article>)}</div>}</section>

    <article className="panel practice-tip"><strong>Measured ≠ Verified</strong><p>{t({fr:"Secure Runner est maintenant une vraie sandbox de pratique. Pour l’utiliser comme preuve Verified, nous ajouterons des tests privés signés côté serveur et une politique anti-triche dédiée.",ar:"Secure Runner أصبح sandbox حقيقية للتدريب. لاستخدامه كدليل Verified سنضيف اختبارات خاصة موقعة وسياسة مخصصة لمنع الغش.",en:"Secure Runner is now a real practice sandbox. To use it as Verified evidence, we will add server-side signed private tests and dedicated anti-cheat controls."})}</p></article>
  </div></section>
}
