"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function PracticeHub(){
  const {t,lang}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [challenges,setChallenges]=useState<any[]>([]);
  const [attempts,setAttempts]=useState<any[]>([]);

  function txt(x:any,k:string){
    if(lang==="ar")return x?.[k+"_ar"]||x?.[k+"_fr"]||"";
    if(lang==="en")return x?.[k+"_en"]||x?.[k+"_fr"]||"";
    return x?.[k+"_fr"]||"";
  }

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    const [{data:c},{data:a}]=await Promise.all([
      supabase.from("practice_challenges").select("id,slug,challenge_type,difficulty,title_fr,title_ar,title_en,description_fr,description_ar,description_en,xp,duration_minutes,skills:skill_id(slug,name_fr,name_ar,name_en)").eq("is_active",true).order("difficulty"),
      supabase.from("practice_challenge_attempts").select("challenge_id,score,status,completed_at").eq("user_id",user.id).eq("status","completed").order("completed_at",{ascending:false})
    ]);
    setChallenges(c||[]);setAttempts(a||[]);
  })()},[]);

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Vydys Practice...</div></div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Practice Hub est réservé aux étudiants.",ar:"مركز التدريب مخصص للطلاب.",en:"Practice Hub is for students."})}</h1></article></div></section>;

  const best=(id:string)=>Math.max(0,...attempts.filter(a=>a.challenge_id===id).map(a=>Number(a.score||0)));
  const tools=[
    {href:"/ai-lab/code",icon:"</>",title:"Code Lab",desc:t({fr:"Python & JavaScript libres, console et snippets.",ar:"Python وJavaScript مع وحدة تحكم وحفظ الأكواد.",en:"Free-form Python & JavaScript with console and snippets."})},
    {href:"/practice/sql",icon:"SQL",title:"SQL Lab",desc:t({fr:"Requêtes SQL sur des datasets d’entraînement.",ar:"استعلامات SQL على بيانات تدريبية.",en:"Run SQL queries against training datasets."})},
    {href:"/practice/api",icon:"API",title:"API Lab",desc:t({fr:"Construisez et inspectez des requêtes HTTP réelles.",ar:"أنشئ وافحص طلبات HTTP حقيقية.",en:"Build and inspect real HTTP requests."})},
    {href:"/practice/data",icon:"CSV",title:"Data Lab",desc:t({fr:"Chargez un CSV, profilez les colonnes et explorez les données.",ar:"حمّل CSV وحلل الأعمدة واستكشف البيانات.",en:"Upload CSV, profile columns and explore data."})},
    {href:"/practice/prompt",icon:"A/B",title:"Prompt Lab",desc:t({fr:"Comparez deux prompts avec votre propre clé IA.",ar:"قارن بين Promptين باستخدام مفتاحك.",en:"Compare two prompts with your own AI key."})},
    {href:"/ai-lab/knowledge",icon:"RAG",title:"RAG Lab",desc:t({fr:"Créez une base documentaire pour vos agents.",ar:"أنشئ قاعدة معرفة لوكلائك.",en:"Build a knowledge base for your agents."})},
    {href:"/ai-lab",icon:"AI",title:"Agent Lab",desc:t({fr:"Créez, configurez et testez vos agents.",ar:"أنشئ واضبط واختبر وكلاءك.",en:"Build, configure and test your agents."})},
    {href:"/projects",icon:"◆",title:t({fr:"Projects",ar:"المشاريع",en:"Projects"}),desc:t({fr:"Transformez vos exercices en preuves de compétence.",ar:"حوّل تدريباتك إلى أدلة مهارة.",en:"Turn practice into skill evidence."})}
  ];

  return <section className="practice-page"><div className="container">
    <div className="practice-hero">
      <div><span className="eyebrow">Vydys Practice Hub · Learn by doing</span><h1>{t({fr:"La pratique avant la théorie.",ar:"التطبيق قبل النظرية.",en:"Practice before theory."})}</h1><p>{t({fr:"Codez, interrogez des données, testez des API, comparez des prompts, construisez du RAG et transformez vos résultats en preuves Vydys.",ar:"اكتب الكود، حلل البيانات، اختبر API، قارن الـ prompts، ابنِ RAG وحوّل النتائج إلى أدلة داخل Vydys.",en:"Code, query data, test APIs, compare prompts, build RAG and turn your work into Vydys evidence."})}</p></div>
      <Link className="btn" href="/skill-engine">{t({fr:"Voir mon Skill Engine",ar:"عرض Skill Engine",en:"Open Skill Engine"})} →</Link>
    </div>

    <section className="practice-tools-section">
      <div className="section-head compact"><div><span className="eyebrow">{t({fr:"Votre laboratoire",ar:"مختبرك",en:"Your lab"})}</span><h2>{t({fr:"Tous les outils pour pratiquer",ar:"كل أدوات التدريب",en:"All the tools you need to practice"})}</h2></div></div>
      <div className="practice-tool-grid">{tools.map(tool=><Link className="practice-tool-card" href={tool.href} key={tool.href}><span>{tool.icon}</span><div><strong>{tool.title}</strong><p>{tool.desc}</p></div><i>→</i></Link>)}</div>
    </section>

    <section className="practice-challenges-section">
      <div className="section-head compact"><div><span className="eyebrow">{t({fr:"Challenges pratiques",ar:"تحديات عملية",en:"Hands-on challenges"})}</span><h2>{t({fr:"Mesurez vos compétences avec du vrai travail",ar:"قِس مهاراتك بعمل حقيقي",en:"Measure skill with real work"})}</h2></div><p>{t({fr:"Les scores alimentent Measured Readiness, jamais Verified automatiquement.",ar:"تغذي النتائج Measured Readiness ولا تمنح Verified تلقائياً.",en:"Scores feed Measured Readiness, never Verified automatically."})}</p></div>
      <div className="practice-challenge-grid">{challenges.map(ch=>{
        const score=best(ch.id); const skill=Array.isArray(ch.skills)?ch.skills[0]:ch.skills;
        return <article className="practice-challenge-card" key={ch.id}>
          <div className="practice-challenge-top"><span>{ch.challenge_type.includes("python")?"PY":ch.challenge_type.includes("javascript")?"JS":"SQL"}</span><small>{"●".repeat(ch.difficulty)}{"○".repeat(4-ch.difficulty)}</small></div>
          <h3>{txt(ch,"title")}</h3><p>{txt(ch,"description")}</p>
          <div className="practice-challenge-meta"><span>{txt(skill,"name")}</span><span>◷ {ch.duration_minutes} min</span><span>+{ch.xp} XP</span>{score>0&&<b>{t({fr:"Meilleur",ar:"الأفضل",en:"Best"})} {Math.round(score)}%</b>}</div>
          <Link className="btn btn-small" href={"/practice/challenge/"+ch.slug}>{score>0?t({fr:"Reprendre",ar:"إعادة",en:"Retry"}):t({fr:"Commencer",ar:"ابدأ",en:"Start"})} →</Link>
        </article>
      })}</div>
    </section>

    <article className="practice-principle panel"><span>✓</span><div><strong>{t({fr:"Vydys distingue pratique, mesure et preuve.",ar:"Vydys تفرق بين التدريب والقياس والدليل.",en:"Vydys separates practice, measurement and proof."})}</strong><p>{t({fr:"Un challenge réussi augmente votre niveau Measured. Pour devenir Verified, vous devez produire une preuve plus forte : projet approuvé, assessment certifiant ou certificat.",ar:"نجاح التحدي يرفع مستوى Measured. للحصول على Verified يجب تقديم دليل أقوى مثل مشروع معتمد أو تقييم موثق أو شهادة.",en:"A successful challenge increases Measured level. Verified status still requires stronger evidence: approved project, certifying assessment, or certificate."})}</p></div></article>
  </div></section>
}
