"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

const modelDefaults:any={openai:"gpt-6-luna",anthropic:"claude-sonnet-4-5",google:"gemini-2.5-flash"};
const providerNames:any={openai:"OpenAI",anthropic:"Claude",google:"Gemini"};

export default function InterviewSimulator(){
  const {t,lang}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [paths,setPaths]=useState<any[]>([]),[credentials,setCredentials]=useState<any[]>([]);
  const [career,setCareer]=useState(""),[type,setType]=useState("technical"),[provider,setProvider]=useState("openai"),[model,setModel]=useState(modelDefaults.openai);
  const [sessionId,setSessionId]=useState(""),[messages,setMessages]=useState<any[]>([]),[answer,setAnswer]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[evaluation,setEvaluation]=useState<any>(null);
  const endRef=useRef<HTMLDivElement|null>(null);

  function txt(x:any,k:string){return lang==="ar"?(x?.[k+"_ar"]||x?.[k+"_fr"]):lang==="en"?(x?.[k+"_en"]||x?.[k+"_fr"]):x?.[k+"_fr"]}
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    const [{data:cp},{data:keys}]=await Promise.all([
      supabase.from("career_paths").select("*").eq("is_active",true).order("name_en"),
      supabase.from("user_ai_credentials").select("provider,key_hint,status").eq("user_id",user.id).eq("status","active")
    ]);
    setPaths(cp||[]);setCredentials(keys||[]);
    if(cp?.length)setCareer(cp[0].id);
    if(keys?.length){setProvider(keys[0].provider);setModel(modelDefaults[keys[0].provider]||"")}
  })()},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[messages,busy]);

  async function start(){
    setBusy(true);setError("");setEvaluation(null);
    const {data,error:e}=await supabase.functions.invoke("vydys-interview",{body:{action:"start",career_path_id:career||null,interview_type:type,language:lang,provider,model}});
    setBusy(false);if(e||data?.error){setError(data?.detail||data?.error||e?.message||"Interview error");return}
    setSessionId(data.session_id);setMessages([{role:"assistant",content:data.message}]);
  }
  async function send(event?:FormEvent){
    event?.preventDefault();if(!answer.trim()||busy||!sessionId)return;
    const a=answer.trim();setAnswer("");setMessages(v=>[...v,{role:"user",content:a}]);setBusy(true);setError("");
    const {data,error:invokeError}=await supabase.functions.invoke("vydys-interview",{body:{action:"answer",session_id:sessionId,answer:a}});
    setBusy(false);if(invokeError||data?.error){setError(data?.detail||data?.error||invokeError?.message||"Interview error");return}
    setMessages(v=>[...v,{role:"assistant",content:data.message}]);
  }
  async function finish(){
    if(!sessionId||busy)return;setBusy(true);setError("");
    const {data,error:e}=await supabase.functions.invoke("vydys-interview",{body:{action:"finish",session_id:sessionId}});
    setBusy(false);if(e||data?.error){setError(data?.detail||data?.error||e?.message||"Evaluation error");return}
    setEvaluation(data.feedback||{score:data.score});setSessionId("");
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Interview Simulator...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Interview Simulator · BYOK</span><h1>{t({fr:"Entraînez-vous avant le vrai entretien.",ar:"تدرّب قبل المقابلة الحقيقية.",en:"Practice before the real interview."})}</h1><p>{t({fr:"Un intervieweur IA adapte les questions à votre objectif métier, puis évalue votre communication, raisonnement, technique et sécurité.",ar:"يكيّف محاور AI الأسئلة حسب هدفك المهني ثم يقيّم التواصل والمنطق والتقنية والأمان.",en:"An AI interviewer adapts questions to your career goal, then scores communication, reasoning, technical judgment and security."})}</p></div><Link className="btn" href="/skill-engine">Skill Engine →</Link></div>

    {credentials.length===0?<article className="panel prompt-no-key"><span>🎤</span><div><h2>{t({fr:"Une clé BYOK est nécessaire.",ar:"يلزم مفتاح BYOK.",en:"A BYOK key is required."})}</h2><p>{t({fr:"L’interview utilise votre fournisseur IA personnel.",ar:"تستخدم المقابلة مزود AI الشخصي.",en:"The interview uses your personal AI provider."})}</p><Link className="btn" href="/ai-lab">Connect AI →</Link></div></article>:!messages.length&&!evaluation?<div className="interview-setup panel">
      <div><span className="eyebrow">{t({fr:"Configuration",ar:"الإعداد",en:"Setup"})}</span><h2>{t({fr:"Préparez votre session",ar:"جهّز جلستك",en:"Prepare your session"})}</h2></div>
      <label className="form-field"><span>{t({fr:"Objectif métier",ar:"الهدف المهني",en:"Career goal"})}</span><select value={career} onChange={e=>setCareer(e.target.value)}>{paths.map(p=><option value={p.id} key={p.id}>{txt(p,"name")}</option>)}</select></label>
      <label className="form-field"><span>{t({fr:"Type",ar:"النوع",en:"Type"})}</span><select value={type} onChange={e=>setType(e.target.value)}><option value="technical">{t({fr:"Technique",ar:"تقني",en:"Technical"})}</option><option value="behavioral">{t({fr:"Comportemental",ar:"سلوكي",en:"Behavioral"})}</option><option value="mixed">{t({fr:"Mixte",ar:"مختلط",en:"Mixed"})}</option></select></label>
      <label className="form-field"><span>{t({fr:"Fournisseur",ar:"المزود",en:"Provider"})}</span><select value={provider} onChange={e=>{setProvider(e.target.value);setModel(modelDefaults[e.target.value]||"")}}>{credentials.map(c=><option value={c.provider} key={c.provider}>{providerNames[c.provider]} · {c.key_hint}</option>)}</select></label>
      <label className="form-field"><span>{t({fr:"Modèle",ar:"النموذج",en:"Model"})}</span><input value={model} onChange={e=>setModel(e.target.value)}/></label>
      <button className="btn interview-start" onClick={start} disabled={busy}>{busy?"...":t({fr:"Commencer l’entretien",ar:"بدء المقابلة",en:"Start interview"})} →</button>
    </div>:evaluation?<div className="interview-evaluation">
      <div className="assessment-result-hero"><div><span className="eyebrow">Interview Practice Score</span><h1>{Math.round(Number(evaluation.score||0))}%</h1><strong>{t({fr:"Measured practice",ar:"تدريب مقاس",en:"Measured practice"})}</strong><p>{evaluation.summary}</p></div><div className="assessment-result-mark">{Number(evaluation.score||0)>=70?"✓":"↗"}</div></div>
      <div className="interview-feedback-grid"><article className="panel"><h3>{t({fr:"Points forts",ar:"نقاط القوة",en:"Strengths"})}</h3><ul>{(evaluation.strengths||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></article><article className="panel"><h3>{t({fr:"Lacunes",ar:"الفجوات",en:"Gaps"})}</h3><ul>{(evaluation.gaps||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></article><article className="panel"><h3>{t({fr:"Prochaines étapes",ar:"الخطوات التالية",en:"Next steps"})}</h3><ul>{(evaluation.next_steps||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></article></div><button className="btn" onClick={()=>{setEvaluation(null);setMessages([])}}>{t({fr:"Nouvelle interview",ar:"مقابلة جديدة",en:"New interview"})}</button>
    </div>:<div className="interview-room">
      <section className="panel interview-chat"><div className="practice-editor-head"><strong>{t({fr:"Entretien en cours",ar:"المقابلة جارية",en:"Interview in progress"})}</strong><button onClick={finish} disabled={busy}>{t({fr:"Terminer & évaluer",ar:"إنهاء وتقييم",en:"Finish & evaluate"})}</button></div><div className="interview-messages">{messages.map((m,i)=><article className={m.role} key={i}><span>{m.role==="assistant"?"V":"ME"}</span><p>{m.content}</p></article>)}{busy&&<article className="assistant"><span>V</span><p>...</p></article>}<div ref={endRef}/></div><form onSubmit={send}><textarea rows={4} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={t({fr:"Répondez comme dans un vrai entretien...",ar:"أجب كما لو كانت مقابلة حقيقية...",en:"Answer as if this were a real interview..."})}/><button className="btn" disabled={busy||!answer.trim()}>{t({fr:"Répondre",ar:"إجابة",en:"Answer"})} →</button></form></section>
      <aside className="panel interview-coach"><span className="eyebrow">{t({fr:"Conseils",ar:"نصائح",en:"Interview tips"})}</span><ul><li>{t({fr:"Expliquez votre raisonnement.",ar:"اشرح طريقة تفكيرك.",en:"Explain your reasoning."})}</li><li>{t({fr:"Parlez des compromis.",ar:"تحدث عن المفاضلات.",en:"Discuss tradeoffs."})}</li><li>{t({fr:"Mentionnez sécurité et erreurs.",ar:"اذكر الأمان وحالات الفشل.",en:"Mention security and failure modes."})}</li><li>{t({fr:"Donnez des exemples concrets.",ar:"قدم أمثلة عملية.",en:"Use concrete examples."})}</li></ul><p>{t({fr:"Ce score est un entraînement Measured, pas une compétence Verified.",ar:"هذه نتيجة تدريب Measured وليست مهارة Verified.",en:"This is Measured practice, not a Verified skill."})}</p></aside>
    </div>}
    {error&&<p className="manual-note">{error}</p>}
  </div></section>
}
