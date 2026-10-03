"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function SupportPage(){
  const {t}=useLanguage();
  const [userId,setUserId]=useState<string|null>(null);
  const [category,setCategory]=useState("technical");
  const [subject,setSubject]=useState("");
  const [description,setDescription]=useState("");
  const [message,setMessage]=useState("");
  const [cases,setCases]=useState<any[]>([]);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    setUserId(user?.id||null);
    if(user){
      const {data}=await supabase.from("support_cases").select("*").eq("created_by",user.id).order("created_at",{ascending:false});
      setCases(data||[]);
    }
  }
  useEffect(()=>{load()},[]);

  async function submit(e:FormEvent){
    e.preventDefault();setMessage("");
    if(!userId){window.location.href="/connexion";return}
    const {error}=await supabase.from("support_cases").insert({
      created_by:userId,category,subject,description,status:"open"
    });
    if(error){setMessage(error.message);return}
    setSubject("");setDescription("");
    setMessage(t({fr:"Votre demande a été envoyée à la Direction.",ar:"تم إرسال طلبك إلى الإدارة.",en:"Your request has been sent to Management."}));
    await load();
  }

  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Assistance",ar:"المساعدة",en:"Support"})}</span><h1>{t({fr:"Centre d'aide Vydys",ar:"مركز مساعدة Vydys",en:"Vydys Help Center"})}</h1><p>{t({fr:"Paiement, accès à une formation, problème technique ou litige : envoyez une demande suivie par la Direction.",ar:"الدفع أو الوصول إلى دورة أو مشكلة تقنية أو نزاع: أرسل طلباً تتبعه الإدارة.",en:"Payment, course access, technical issue or dispute: submit a request tracked by Management."})}</p></div>

    <div className="dash-grid">
      <form className="panel trainer-form" onSubmit={submit}>
        <h2>{t({fr:"Nouvelle demande",ar:"طلب جديد",en:"New request"})}</h2>
        <label className="form-field"><span>{t({fr:"Catégorie",ar:"الفئة",en:"Category"})}</span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="payment">{t({fr:"Paiement",ar:"الدفع",en:"Payment"})}</option><option value="course">{t({fr:"Formation",ar:"الدورة",en:"Course"})}</option><option value="instructor">{t({fr:"Formateur",ar:"المدرب",en:"Instructor"})}</option><option value="technical">{t({fr:"Technique",ar:"تقني",en:"Technical"})}</option><option value="refund">{t({fr:"Remboursement",ar:"استرداد",en:"Refund"})}</option><option value="other">{t({fr:"Autre",ar:"أخرى",en:"Other"})}</option></select></label>
        <label className="form-field"><span>{t({fr:"Objet",ar:"الموضوع",en:"Subject"})}</span><input value={subject} onChange={e=>setSubject(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Description",ar:"الوصف",en:"Description"})}</span><textarea rows={7} value={description} onChange={e=>setDescription(e.target.value)} required/></label>
        <button className="btn">{t({fr:"Envoyer",ar:"إرسال",en:"Submit"})}</button>
        {message&&<p className="manual-note">{message}</p>}
      </form>

      <aside className="panel"><h2>{t({fr:"Mes demandes",ar:"طلباتي",en:"My requests"})}</h2>
        <div className="support-case-list">{cases.length===0?<p>{t({fr:"Aucune demande.",ar:"لا توجد طلبات.",en:"No requests."})}</p>:cases.map(c=><div className="support-case" key={c.id}><div><strong>{c.subject}</strong><span>{c.category} · {new Date(c.created_at).toLocaleDateString()}</span></div><span className={c.status==="resolved"||c.status==="closed"?"status":"status pending"}>{c.status}</span>{c.resolution&&<p>{c.resolution}</p>}</div>)}</div>
      </aside>
    </div>
  </div></section>
}
