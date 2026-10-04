"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../../components/language-provider";
import { supabase } from "../../../../lib/supabase";

const levelLabels:any={
  none:{fr:"À découvrir",ar:"غير مكتسب",en:"Not yet"},
  beginner:{fr:"Débutant",ar:"مبتدئ",en:"Beginner"},
  intermediate:{fr:"Intermédiaire",ar:"متوسط",en:"Intermediate"},
  advanced:{fr:"Avancé",ar:"متقدم",en:"Advanced"},
  expert:{fr:"Expert",ar:"خبير",en:"Expert"}
};

export default function SkillAssessmentPage(){
  const params=useParams<{slug:string}>();
  const {t,lang}=useLanguage();
  const [loading,setLoading]=useState(true);
  const [data,setData]=useState<any>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [index,setIndex]=useState(0);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState("");

  function textOf(x:any,key:string){
    if(lang==="ar")return x?.[key+"_ar"]||x?.[key+"_fr"]||"";
    if(lang==="en")return x?.[key+"_en"]||x?.[key+"_fr"]||"";
    return x?.[key+"_fr"]||"";
  }
  function levelLabel(level:string){return t(levelLabels[level]||levelLabels.none)}

  async function start(){
    setLoading(true);setError("");setResult(null);setAnswers({});setIndex(0);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    if(p?.role!=="student"){setError(t({fr:"Évaluation réservée aux étudiants.",ar:"التقييم مخصص للطلاب.",en:"Assessment is for students."}));setLoading(false);return}
    const {data:r,error:e}=await supabase.rpc("start_skill_assessment",{p_assessment_slug:String(params.slug||"")});
    if(e){setError(e.message);setLoading(false);return}
    setData(r);setLoading(false);
  }
  useEffect(()=>{start()},[params.slug]);

  const items=data?.items||[];
  const item=items[index];
  const answered=useMemo(()=>items.filter((q:any)=>String(answers[q.id]||"").trim()).length,[items,answers]);
  const progress=items.length?Math.round(answered/items.length*100):0;

  function selectAnswer(id:string,value:string){setAnswers(v=>({...v,[id]:value}))}

  async function submit(){
    if(answered!==items.length){setError(t({fr:"Répondez à toutes les questions avant de terminer.",ar:"أجب عن جميع الأسئلة قبل الإنهاء.",en:"Answer all questions before finishing."}));return}
    setBusy(true);setError("");
    const {data:r,error:e}=await supabase.rpc("submit_skill_assessment",{p_attempt_id:data.attempt_id,p_answers:answers});
    setBusy(false);
    if(e){setError(e.message);return}
    setResult(r);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  if(loading)return <section className="assessment-page"><div className="container"><div className="skill-engine-loading">Vydys Assessment...</div></div></section>;
  if(error&&!data)return <section className="assessment-page"><div className="container"><article className="panel assessment-error"><h1>{error}</h1><Link className="btn" href="/skill-engine">← Skill Engine</Link></article></div></section>;

  if(result){
    const feedback=result.feedback||[];
    return <section className="assessment-page"><div className="container">
      <div className="assessment-result-hero">
        <div><span className="eyebrow">Vydys Skill Engine · Measured</span><h1>{result.score}%</h1><strong>{levelLabel(result.measured_level)}</strong><p>{result.is_new_best?t({fr:"Nouveau meilleur score. Votre Measured Readiness a été recalculé.",ar:"أفضل نتيجة جديدة. تمت إعادة حساب الجاهزية المقاسة.",en:"New best score. Your Measured Readiness has been recalculated."}):t({fr:"Tentative terminée. Votre meilleur score précédent reste conservé.",ar:"اكتملت المحاولة. تم الاحتفاظ بأفضل نتيجة سابقة.",en:"Attempt complete. Your previous best score is kept."})}</p></div>
        <div className="assessment-result-mark">{Number(result.score)>=70?"✓":"↗"}</div>
      </div>
      <div className="assessment-result-actions"><Link className="btn" href="/skill-engine">{t({fr:"Voir mon Skill Engine",ar:"عرض محرك المهارات",en:"View Skill Engine"})}</Link><button className="btn btn-ghost" onClick={start}>{t({fr:"Repasser le test",ar:"إعادة الاختبار",en:"Retake assessment"})}</button></div>
      <section className="assessment-review">
        <div className="skill-section-head"><div><span className="eyebrow">{t({fr:"Correction",ar:"التصحيح",en:"Review"})}</span><h2>{t({fr:"Comprendre vos réponses",ar:"فهم إجاباتك",en:"Understand your answers"})}</h2></div><span className="assessment-score-chip">{feedback.filter((f:any)=>f.correct).length}/{feedback.length}</span></div>
        <div className="assessment-feedback-list">{feedback.map((f:any)=><article className={f.correct?"assessment-feedback correct":"assessment-feedback wrong"} key={f.item_id}><span>{f.correct?"✓":"×"}</span><div><strong>{t({fr:`Question ${f.position}`,ar:`السؤال ${f.position}`,en:`Question ${f.position}`})}</strong><p>{textOf(f,"explanation")}</p></div></article>)}</div>
      </section>
      <article className="panel assessment-proof-note"><strong>{t({fr:"Measured ≠ Verified",ar:"Measured لا يساوي Verified",en:"Measured ≠ Verified"})}</strong><p>{t({fr:"Ce test mesure votre niveau actuel. Pour obtenir une compétence Verified, Vydys exige toujours une preuve plus forte : projet validé, évaluation certifiante ou certificat.",ar:"يقيس هذا الاختبار مستواك الحالي. للحصول على مهارة Verified، تتطلب Vydys دليلاً أقوى مثل مشروع معتمد أو تقييم موثق أو شهادة.",en:"This assessment measures your current level. Verified skills still require stronger evidence such as an approved project, certified assessment, or certificate."})}</p></article>
    </div></section>
  }

  return <section className="assessment-page"><div className="container">
    <div className="assessment-topbar"><Link href="/skill-engine">← {t({fr:"Skill Engine",ar:"محرك المهارات",en:"Skill Engine"})}</Link><div><span>{answered}/{items.length}</span><div className="assessment-progress"><i style={{width:progress+"%"}}/></div><strong>{progress}%</strong></div></div>
    <div className="assessment-hero"><div><span className="eyebrow">Vydys Micro-Assessment</span><h1>{textOf(data.assessment,"title")}</h1><p>{textOf(data.assessment,"description")}</p></div><div className="assessment-meta"><span>◷ {data.assessment.duration_minutes} min</span><span>{items.length} {t({fr:"questions",ar:"أسئلة",en:"questions"})}</span>{data.best&&<span>★ {t({fr:"Meilleur",ar:"الأفضل",en:"Best"})}: {Math.round(Number(data.best.score))}%</span>}</div></div>
    {error&&<p className="manual-note">{error}</p>}
    <div className="assessment-layout">
      <main className="assessment-card panel">
        <div className="assessment-question-head"><span>{String(index+1).padStart(2,"0")}</span><div><small>{t({fr:"Difficulté",ar:"الصعوبة",en:"Difficulty"})} · {item?.difficulty}/4</small><h2>{textOf(item,"prompt")}</h2></div></div>
        {item?.code_snippet&&<div className="assessment-code"><div><span>{item.code_language}</span><Link href="/ai-lab/code">{t({fr:"Ouvrir Code Lab",ar:"فتح Code Lab",en:"Open Code Lab"})} ↗</Link></div><pre>{item.code_snippet}</pre></div>}
        {item?.item_type==="single_choice"?<div className="assessment-options">{(item.options||[]).map((o:any)=><button className={answers[item.id]===o.value?"selected":""} onClick={()=>selectAnswer(item.id,o.value)} key={o.value}><span>{o.value.toUpperCase()}</span><strong>{lang==="ar"?(o.ar||o.fr):lang==="en"?(o.en||o.fr):o.fr}</strong><i>{answers[item.id]===o.value?"✓":""}</i></button>)}</div>:<label className="assessment-code-answer"><span>{t({fr:"Sortie attendue",ar:"المخرجات المتوقعة",en:"Expected output"})}</span><input value={answers[item.id]||""} onChange={e=>selectAnswer(item.id,e.target.value)} placeholder={t({fr:"Écrivez exactement ce que le code affiche",ar:"اكتب بالضبط ما يعرضه الكود",en:"Type exactly what the code prints"})}/></label>}
        <div className="assessment-nav"><button className="btn btn-ghost" disabled={index===0} onClick={()=>setIndex(v=>Math.max(0,v-1))}>← {t({fr:"Précédent",ar:"السابق",en:"Previous"})}</button>{index<items.length-1?<button className="btn" disabled={!String(answers[item.id]||"").trim()} onClick={()=>setIndex(v=>Math.min(items.length-1,v+1))}>{t({fr:"Suivant",ar:"التالي",en:"Next"})} →</button>:<button className="btn" disabled={busy||answered!==items.length} onClick={submit}>{busy?"...":t({fr:"Terminer & mesurer",ar:"إنهاء وقياس",en:"Finish & measure"})}</button>}</div>
      </main>
      <aside className="panel assessment-sidebar">
        <span className="eyebrow">{t({fr:"Questions",ar:"الأسئلة",en:"Questions"})}</span><div className="assessment-question-map">{items.map((q:any,i:number)=><button className={(i===index?"active ":"")+(answers[q.id]?"answered":"")} onClick={()=>setIndex(i)} key={q.id}>{i+1}</button>)}</div>
        <div className="assessment-legend"><p><i className="answered"/> {t({fr:"Répondu",ar:"تمت الإجابة",en:"Answered"})}</p><p><i className="current"/> {t({fr:"Question actuelle",ar:"السؤال الحالي",en:"Current"})}</p></div>
        <hr/><strong>{t({fr:"Ce que Vydys mesure",ar:"ما الذي تقيسه Vydys",en:"What Vydys measures"})}</strong><p>{t({fr:"Ce test alimente votre niveau Measured. Les réponses correctes restent côté serveur et ne sont jamais envoyées au navigateur.",ar:"يغذي هذا الاختبار مستوى Measured. تبقى الإجابات الصحيحة على الخادم ولا يتم إرسالها إلى المتصفح.",en:"This test feeds your Measured level. Correct answers stay server-side and are never sent to the browser."})}</p>
      </aside>
    </div>
  </div></section>
}
