"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

const defaults:any={openai:"gpt-6-luna",anthropic:"claude-sonnet-4-5",google:"gemini-2.5-flash"};
const names:any={openai:"OpenAI",anthropic:"Claude",google:"Gemini"};

export default function PromptLab(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [providers,setProviders]=useState<any[]>([]);
  const [provider,setProvider]=useState("openai");
  const [model,setModel]=useState(defaults.openai);
  const [system,setSystem]=useState("Tu es un assistant pédagogique clair, précis et structuré.");
  const [promptA,setPromptA]=useState("Explique RAG simplement en 5 points.");
  const [promptB,setPromptB]=useState("Tu es un mentor IA. Explique RAG en 5 points, donne un exemple concret puis termine par une question de vérification.");
  const [resultA,setResultA]=useState<any>(null);
  const [resultB,setResultB]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    const {data:c}=await supabase.from("user_ai_credentials").select("provider,key_hint,status").eq("user_id",user.id).eq("status","active");
    setProviders(c||[]);
    if(c?.length){setProvider(c[0].provider);setModel(defaults[c[0].provider]||"")}
  })()},[]);

  useEffect(()=>{setModel(defaults[provider]||"")},[provider]);

  async function runOne(prompt:string){
    const {data,error}=await supabase.functions.invoke("vydys-prompt-lab",{body:{provider,model,system,prompt}});
    if(error||data?.error)throw new Error(data?.detail||data?.error||error?.message||"Prompt Lab error");
    return data;
  }

  async function runCompare(){
    if(!promptA.trim()||!promptB.trim()||busy)return;
    setBusy(true);setError("");setResultA(null);setResultB(null);
    try{
      const a=await runOne(promptA.trim());setResultA(a);
      const b=await runOne(promptB.trim());setResultB(b);
    }catch(e:any){setError(String(e?.message||e))}
    finally{setBusy(false)}
  }

  const metrics=useMemo(()=>{
    const words=(x:any)=>String(x?.text||"").trim().split(/\s+/).filter(Boolean).length;
    return {a:words(resultA),b:words(resultB)}
  },[resultA,resultB]);

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Prompt Lab...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Prompt Lab · BYOK</span><h1>{t({fr:"Testez vos prompts comme un ingénieur.",ar:"اختبر الـ prompts كمهندس.",en:"Test prompts like an engineer."})}</h1><p>{t({fr:"Comparez deux formulations sur le même modèle, observez la réponse, la latence et les tokens, puis itérez.",ar:"قارن صياغتين على نفس النموذج وراقب الاستجابة والسرعة والـ tokens ثم حسّن.",en:"Compare two prompt variants on the same model, inspect output, latency and tokens, then iterate."})}</p></div><Link className="btn" href="/skill-engine/assessment/prompt-engineering-diagnostic">{t({fr:"Test Prompt Engineering",ar:"اختبار Prompt Engineering",en:"Prompt assessment"})} →</Link></div>

    {providers.length===0?<article className="panel prompt-no-key"><span>🔐</span><div><h2>{t({fr:"Connectez d’abord une clé IA.",ar:"اربط مفتاح AI أولاً.",en:"Connect an AI key first."})}</h2><p>{t({fr:"Prompt Lab utilise votre clé BYOK déjà protégée dans Supabase Vault.",ar:"يستخدم Prompt Lab مفتاح BYOK المحمي في Supabase Vault.",en:"Prompt Lab uses your BYOK key already protected in Supabase Vault."})}</p><Link className="btn" href="/ai-lab">{t({fr:"Ouvrir AI Lab",ar:"فتح AI Lab",en:"Open AI Lab"})}</Link></div></article>:<>
      <div className="prompt-config panel">
        <label className="form-field"><span>{t({fr:"Fournisseur",ar:"المزود",en:"Provider"})}</span><select value={provider} onChange={e=>setProvider(e.target.value)}>{providers.map(p=><option value={p.provider} key={p.provider}>{names[p.provider]} · {p.key_hint}</option>)}</select></label>
        <label className="form-field"><span>{t({fr:"Modèle",ar:"النموذج",en:"Model"})}</span><input value={model} onChange={e=>setModel(e.target.value)}/></label>
        <label className="form-field prompt-system"><span>System prompt</span><textarea rows={3} value={system} onChange={e=>setSystem(e.target.value)}/></label>
      </div>

      {error&&<p className="manual-note">{error}</p>}
      <div className="prompt-ab-grid">
        <section className="panel prompt-variant"><div className="prompt-variant-head"><span>A</span><strong>{t({fr:"Prompt de base",ar:"Prompt أساسي",en:"Baseline prompt"})}</strong></div><textarea rows={8} value={promptA} onChange={e=>setPromptA(e.target.value)}/>{resultA&&<div className="prompt-output"><div><span>{resultA.latency_ms} ms</span><span>{resultA.input_tokens} in</span><span>{resultA.output_tokens} out</span><span>{metrics.a} words</span></div><pre>{resultA.text}</pre></div>}</section>
        <section className="panel prompt-variant"><div className="prompt-variant-head"><span>B</span><strong>{t({fr:"Prompt amélioré",ar:"Prompt محسّن",en:"Improved prompt"})}</strong></div><textarea rows={8} value={promptB} onChange={e=>setPromptB(e.target.value)}/>{resultB&&<div className="prompt-output"><div><span>{resultB.latency_ms} ms</span><span>{resultB.input_tokens} in</span><span>{resultB.output_tokens} out</span><span>{metrics.b} words</span></div><pre>{resultB.text}</pre></div>}</section>
      </div>
      <div className="prompt-actions"><button className="btn" disabled={busy} onClick={runCompare}>{busy?"...":"A/B · "+t({fr:"Comparer les prompts",ar:"مقارنة الـ prompts",en:"Compare prompts"})}</button><button className="btn btn-ghost" onClick={()=>{const a=promptA;setPromptA(promptB);setPromptB(a);setResultA(null);setResultB(null)}}>⇄ {t({fr:"Permuter A/B",ar:"تبديل A/B",en:"Swap A/B"})}</button></div>
      <article className="panel practice-tip"><strong>{t({fr:"Méthode de travail",ar:"طريقة العمل",en:"Workflow"})}</strong><p>{t({fr:"Changez une seule variable à la fois : rôle, contexte, exemples, format de sortie ou critères de réussite. Comparez ensuite qualité, coût et latence.",ar:"غيّر متغيراً واحداً كل مرة: الدور أو السياق أو الأمثلة أو شكل المخرجات أو معايير النجاح. ثم قارن الجودة والتكلفة والسرعة.",en:"Change one variable at a time: role, context, examples, output format, or success criteria. Then compare quality, cost and latency."})}</p></article>
    </>}
  </div></section>
}
