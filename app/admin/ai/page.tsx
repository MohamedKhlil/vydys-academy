"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminAIPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [tutor,setTutor]=useState(true);
  const [copilot,setCopilot]=useState(true);
  const [model,setModel]=useState("gpt-6-luna");
  const [studentLimit,setStudentLimit]=useState("30");
  const [instructorLimit,setInstructorLimit]=useState("50");
  const [usage,setUsage]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const start=new Date();start.setUTCHours(0,0,0,0);
    const [{data:s},{data:u}]=await Promise.all([
      supabase.from("platform_settings")
        .select("ai_tutor_enabled,ai_copilot_enabled,ai_model,ai_daily_student_messages,ai_daily_instructor_messages")
        .eq("id",1).single(),
      supabase.from("ai_usage").select("mode,model,input_tokens,output_tokens,created_at").gte("created_at",start.toISOString()).order("created_at",{ascending:false})
    ]);
    if(s){setTutor(Boolean(s.ai_tutor_enabled));setCopilot(Boolean(s.ai_copilot_enabled));setModel(s.ai_model||"gpt-6-luna");setStudentLimit(String(s.ai_daily_student_messages||30));setInstructorLimit(String(s.ai_daily_instructor_messages||50))}
    setUsage(u||[]);
  }
  useEffect(()=>{load()},[]);

  const metrics=useMemo(()=>{
    const input=usage.reduce((a,x)=>a+Number(x.input_tokens||0),0);
    const output=usage.reduce((a,x)=>a+Number(x.output_tokens||0),0);
    return {
      calls:usage.length,
      tutor:usage.filter(x=>x.mode==="student_tutor").length,
      copilot:usage.filter(x=>x.mode==="instructor_copilot").length,
      tokens:input+output
    };
  },[usage]);

  async function save(){
    const {error}=await supabase.from("platform_settings").update({
      ai_tutor_enabled:tutor,ai_copilot_enabled:copilot,ai_model:model,
      ai_daily_student_messages:Number(studentLimit),ai_daily_instructor_messages:Number(instructorLimit),
      updated_at:new Date().toISOString()
    }).eq("id",1);
    setMessage(error?error.message:t({fr:"Configuration Vydys AI enregistrée.",ar:"تم حفظ إعدادات Vydys AI.",en:"Vydys AI settings saved."}));
    if(!error)await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys AI Control Center</span><h1>{t({fr:"Pilotage de l’intelligence artificielle",ar:"إدارة الذكاء الاصطناعي",en:"AI control center"})}</h1><p>{t({fr:"Activez les assistants, choisissez le modèle, maîtrisez les quotas et suivez l’usage.",ar:"فعّل المساعدين واختر النموذج وحدد الحصص وتابع الاستخدام.",en:"Enable assistants, choose the model, control quotas and track usage."})}</p></div></div>

    <div className="metric-grid ai-metrics">
      <article className="panel metric"><span>{t({fr:"Requêtes aujourd’hui",ar:"طلبات اليوم",en:"Requests today"})}</span><strong>{metrics.calls}</strong></article>
      <article className="panel metric"><span>AI Tutor</span><strong>{metrics.tutor}</strong></article>
      <article className="panel metric"><span>Copilot</span><strong>{metrics.copilot}</strong></article>
      <article className="panel metric"><span>{t({fr:"Tokens aujourd’hui",ar:"الرموز اليوم",en:"Tokens today"})}</span><strong>{metrics.tokens.toLocaleString("fr-FR")}</strong></article>
    </div>

    <div className="dash-grid">
      <article className="panel trainer-form">
        <h2>{t({fr:"Fonctionnalités",ar:"الميزات",en:"Features"})}</h2>
        <label className="checkbox-line"><input type="checkbox" checked={tutor} onChange={e=>setTutor(e.target.checked)}/><span><strong>AI Tutor</strong> · {t({fr:"Assistant pédagogique étudiant",ar:"المساعد التعليمي للطالب",en:"Student learning assistant"})}</span></label>
        <label className="checkbox-line"><input type="checkbox" checked={copilot} onChange={e=>setCopilot(e.target.checked)}/><span><strong>Instructor Copilot</strong> · {t({fr:"Copilote de création formateur",ar:"مساعد إنشاء المحتوى للمدرب",en:"Instructor creation copilot"})}</span></label>
        <label className="form-field"><span>{t({fr:"Modèle IA",ar:"نموذج الذكاء الاصطناعي",en:"AI model"})}</span><select value={model} onChange={e=>setModel(e.target.value)}><option value="gpt-6-luna">GPT-6 Luna</option><option value="gpt-6.1-sol">GPT-6.1 Sol</option></select></label>
      </article>

      <article className="panel trainer-form">
        <h2>{t({fr:"Quotas journaliers",ar:"الحصص اليومية",en:"Daily quotas"})}</h2>
        <label className="form-field"><span>{t({fr:"Messages / étudiant / jour",ar:"رسائل لكل طالب يومياً",en:"Messages / student / day"})}</span><input type="number" min="1" max="500" value={studentLimit} onChange={e=>setStudentLimit(e.target.value)}/></label>
        <label className="form-field"><span>{t({fr:"Messages / formateur / jour",ar:"رسائل لكل مدرب يومياً",en:"Messages / instructor / day"})}</span><input type="number" min="1" max="1000" value={instructorLimit} onChange={e=>setInstructorLimit(e.target.value)}/></label>
        <p className="ai-admin-note">{t({fr:"La clé du fournisseur IA est conservée uniquement comme secret serveur OPENAI_API_KEY dans Supabase Edge Functions. Elle n’est jamais exposée aux étudiants ou formateurs.",ar:"يتم حفظ مفتاح مزود الذكاء الاصطناعي كسر خادم فقط ولا يظهر للطلاب أو المدربين.",en:"The AI provider key is stored only as the server secret OPENAI_API_KEY in Supabase Edge Functions and is never exposed to users."})}</p>
      </article>
    </div>

    <button className="btn" onClick={save}>{t({fr:"Enregistrer la configuration",ar:"حفظ الإعدادات",en:"Save configuration"})}</button>
    {message&&<p className="manual-note">{message}</p>}
  </div></section>
}
