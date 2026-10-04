"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function NouvelleFormationPage(){
  const {t}=useLanguage();
  const [userId,setUserId]=useState<string|null>(null);
  const [currencies,setCurrencies]=useState<any[]>([]);
  const [titleFr,setTitleFr]=useState("");
  const [titleAr,setTitleAr]=useState("");
  const [titleEn,setTitleEn]=useState("");
  const [descriptionFr,setDescriptionFr]=useState("");
  const [descriptionAr,setDescriptionAr]=useState("");
  const [descriptionEn,setDescriptionEn]=useState("");
  const [category,setCategory]=useState("");
  const [price,setPrice]=useState("25");
  const [currency,setCurrency]=useState("USD");
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);
    const [{data:p},{data:c}]=await Promise.all([
      supabase.from("profiles").select("preferred_currency").eq("id",user.id).maybeSingle(),
      supabase.from("currency_catalog").select("code,name,symbol").eq("enabled",true).order("code")
    ]);
    setCurrencies(c||[]);
    if(p?.preferred_currency){setCurrency(p.preferred_currency);setPrice(p.preferred_currency==="MRU"?"1500":"25")}
  })()},[]);

  async function submit(e:FormEvent){
    e.preventDefault();setMessage("");
    if(!userId){window.location.href="/connexion";return}
    const amount=Number(price);
    if(!Number.isFinite(amount)||amount<=0){setMessage(t({fr:"Prix invalide.",ar:"السعر غير صالح.",en:"Invalid price."}));return}
    const slug=(titleFr||titleEn||"formation").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Date.now().toString().slice(-6);
    const {data,error}=await supabase.from("courses").insert({
      instructor_id:userId,slug,title_fr:titleFr,title_ar:titleAr||titleFr,title_en:titleEn||titleFr,
      description_fr:descriptionFr,description_ar:descriptionAr||descriptionFr,description_en:descriptionEn||descriptionFr,
      base_price_mru:currency==="MRU"?Math.max(1,Math.round(amount)):1,
      base_price_amount:amount,base_currency:currency,category,status:"draft",is_published:false
    }).select("id").single();
    if(error||!data){setMessage(error?.message||"Error");return}
    await supabase.from("course_prices").upsert({course_id:data.id,currency,amount,is_active:true},{onConflict:"course_id,currency"});
    window.location.href="/formateur/formation/"+data.id+"/builder";
  }

  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Créateur de cours international",ar:"منشئ دورات دولي",en:"International course builder"})}</span><h1>{t({fr:"Créer une nouvelle formation",ar:"إنشاء دورة جديدة",en:"Create a new course"})}</h1><p>{t({fr:"Choisissez votre devise de vente. Vous pourrez ensuite ajouter d’autres prix locaux pour la même formation.",ar:"اختر عملة البيع. يمكنك لاحقاً إضافة أسعار محلية أخرى لنفس الدورة.",en:"Choose your selling currency. You can add additional local prices for the same course later."})}</p></div>
    <form className="panel trainer-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field"><span>Titre FR</span><input value={titleFr} onChange={e=>setTitleFr(e.target.value)} required/></label>
        <label className="form-field"><span>العنوان AR</span><input value={titleAr} onChange={e=>setTitleAr(e.target.value)}/></label>
        <label className="form-field"><span>Title EN</span><input value={titleEn} onChange={e=>setTitleEn(e.target.value)}/></label>
        <label className="form-field"><span>{t({fr:"Catégorie",ar:"الفئة",en:"Category"})}</span><input value={category} onChange={e=>setCategory(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Prix",ar:"السعر",en:"Price"})}</span><input type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Devise",ar:"العملة",en:"Currency"})}</span><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option value={c.code} key={c.code}>{c.code} · {c.name}</option>)}</select></label>
        <label className="form-field full-row"><span>Description FR</span><textarea rows={5} value={descriptionFr} onChange={e=>setDescriptionFr(e.target.value)} required/></label>
        <label className="form-field full-row"><span>الوصف AR</span><textarea rows={5} value={descriptionAr} onChange={e=>setDescriptionAr(e.target.value)}/></label>
        <label className="form-field full-row"><span>Description EN</span><textarea rows={5} value={descriptionEn} onChange={e=>setDescriptionEn(e.target.value)}/></label>
      </div>
      <article className="international-price-note">🌍 {t({fr:"Le prix principal est enregistré dans sa vraie devise. Les paiements internationaux automatiques utilisent ce montant, sans conversion inventée par Vydys.",ar:"يُحفظ السعر الأساسي بعملته الحقيقية. تستخدم المدفوعات الدولية التلقائية هذا المبلغ دون سعر صرف مخترع من Vydys.",en:"The base price is stored in its real currency. Automatic international payments use that amount without an invented Vydys exchange rate."})}</article>
      <button className="btn" type="submit">{t({fr:"Créer et construire la formation →",ar:"إنشاء وبناء الدورة ←",en:"Create & build course →"})}</button>
      {message&&<p className="manual-note">{message}</p>}
    </form>
  </div></section>
}
