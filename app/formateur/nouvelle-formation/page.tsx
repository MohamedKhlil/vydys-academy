"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function NouvelleFormationPage(){
  const {t}=useLanguage();
  const [userId,setUserId]=useState<string|null>(null);
  const [active,setActive]=useState(false);
  const [titleFr,setTitleFr]=useState("");
  const [titleAr,setTitleAr]=useState("");
  const [titleEn,setTitleEn]=useState("");
  const [descriptionFr,setDescriptionFr]=useState("");
  const [descriptionAr,setDescriptionAr]=useState("");
  const [descriptionEn,setDescriptionEn]=useState("");
  const [category,setCategory]=useState("");
  const [price,setPrice]=useState("1500");
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    setUserId(user.id);
    const {data}=await supabase.rpc("has_active_trainer_subscription",{p_user_id:user.id});
    setActive(Boolean(data));
  })()},[]);

  async function submit(e:FormEvent,status:"draft"|"pending"){
    e.preventDefault(); setMessage("");
    if(!userId){window.location.href="/connexion";return}
    if(status==="pending"&&!active){setMessage(t({fr:"Un abonnement formateur actif est requis.",ar:"يلزم اشتراك مدرب نشط.",en:"An active instructor subscription is required."}));return}
    const slug=(titleFr||titleEn||"formation").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Date.now().toString().slice(-6);
    const {error}=await supabase.from("courses").insert({
      instructor_id:userId,slug,title_fr:titleFr,title_ar:titleAr||titleFr,title_en:titleEn||titleFr,
      description_fr:descriptionFr,description_ar:descriptionAr||descriptionFr,description_en:descriptionEn||descriptionFr,
      base_price_mru:Number(price),category,status,is_published:false,submitted_at:status==="pending"?new Date().toISOString():null
    });
    if(error){setMessage(error.message);return}
    setMessage(status==="pending"?t({fr:"Formation envoyée à la Direction pour validation.",ar:"تم إرسال الدورة للإدارة للمراجعة.",en:"Course submitted to Management for approval."}):t({fr:"Brouillon enregistré.",ar:"تم حفظ المسودة.",en:"Draft saved."}));
  }

  return <section className="section page-top"><div className="container"><div className="page-hero"><span className="eyebrow">{t({fr:"Créateur de cours",ar:"منشئ الدورات",en:"Course builder"})}</span><h1>{t({fr:"Créer une nouvelle formation",ar:"إنشاء دورة جديدة",en:"Create a new course"})}</h1></div>
    <form className="panel trainer-form">
      <div className="form-grid">
        <label className="form-field"><span>Titre FR</span><input value={titleFr} onChange={e=>setTitleFr(e.target.value)} required/></label>
        <label className="form-field"><span>العنوان AR</span><input value={titleAr} onChange={e=>setTitleAr(e.target.value)}/></label>
        <label className="form-field"><span>Title EN</span><input value={titleEn} onChange={e=>setTitleEn(e.target.value)}/></label>
        <label className="form-field"><span>{t({fr:"Catégorie",ar:"الفئة",en:"Category"})}</span><input value={category} onChange={e=>setCategory(e.target.value)}/></label>
        <label className="form-field"><span>{t({fr:"Prix MRU",ar:"السعر بالأوقية",en:"Price MRU"})}</span><input type="number" min="1" value={price} onChange={e=>setPrice(e.target.value)} required/></label>
        <label className="form-field full-row"><span>Description FR</span><textarea rows={5} value={descriptionFr} onChange={e=>setDescriptionFr(e.target.value)} required/></label>
        <label className="form-field full-row"><span>الوصف AR</span><textarea rows={5} value={descriptionAr} onChange={e=>setDescriptionAr(e.target.value)}/></label>
        <label className="form-field full-row"><span>Description EN</span><textarea rows={5} value={descriptionEn} onChange={e=>setDescriptionEn(e.target.value)}/></label>
      </div>
      <div className="form-actions"><button className="btn btn-ghost" onClick={e=>submit(e,"draft")} type="button">{t({fr:"Enregistrer brouillon",ar:"حفظ المسودة",en:"Save draft"})}</button><button className="btn" onClick={e=>submit(e,"pending")} type="button">{t({fr:"Soumettre pour publication",ar:"إرسال للنشر",en:"Submit for publication"})}</button></div>
      {message&&<p className="manual-note">{message}</p>}
    </form>
  </div></section>
}
