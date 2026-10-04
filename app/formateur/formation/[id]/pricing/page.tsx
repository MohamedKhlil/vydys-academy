"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../../components/language-provider";
import { supabase } from "../../../../../lib/supabase";

export default function CoursePricingPage(){
  const {id}=useParams<{id:string}>();
  const {t}=useLanguage();
  const [course,setCourse]=useState<any>(null);
  const [prices,setPrices]=useState<any[]>([]);
  const [currencies,setCurrencies]=useState<any[]>([]);
  const [currency,setCurrency]=useState("MRU");
  const [amount,setAmount]=useState("");
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const [{data:c},{data:p},{data:cur}]=await Promise.all([
      supabase.from("courses").select("id,title_fr,base_price_amount,base_currency,status").eq("id",id).eq("instructor_id",user.id).maybeSingle(),
      supabase.from("course_prices").select("currency,amount,is_active").eq("course_id",id).order("currency"),
      supabase.from("currency_catalog").select("code,name,symbol").eq("enabled",true).order("code")
    ]);
    setCourse(c||false);setPrices(p||[]);setCurrencies(cur||[]);
    const used=new Set((p||[]).map((x:any)=>x.currency));
    const next=(cur||[]).find((x:any)=>!used.has(x.code));if(next)setCurrency(next.code);
  }
  useEffect(()=>{load()},[id]);

  async function add(e:FormEvent){
    e.preventDefault();setMessage("");
    const n=Number(amount);if(!Number.isFinite(n)||n<=0){setMessage(t({fr:"Montant invalide.",ar:"المبلغ غير صالح.",en:"Invalid amount."}));return}
    const {error}=await supabase.from("course_prices").upsert({course_id:id,currency,amount:n,is_active:true,updated_at:new Date().toISOString()},{onConflict:"course_id,currency"});
    if(error){setMessage(error.message);return}
    setAmount("");setMessage(t({fr:"Prix ajouté.",ar:"تمت إضافة السعر.",en:"Price added."}));await load();
  }
  async function toggle(row:any){
    await supabase.from("course_prices").update({is_active:!row.is_active,updated_at:new Date().toISOString()}).eq("course_id",id).eq("currency",row.currency);await load();
  }

  if(course===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(course===false)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Formation introuvable",ar:"الدورة غير موجودة",en:"Course not found"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Global Pricing</span><h1>{course.title_fr}</h1><p>{t({fr:"Ajoutez les prix réels que vous souhaitez accepter dans chaque devise. Vydys ne convertit pas automatiquement un prix sans votre validation.",ar:"أضف الأسعار الحقيقية التي تريد قبولها بكل عملة. لا يحول Vydys الأسعار تلقائياً دون موافقتك.",en:"Add the real prices you want to accept in each currency. Vydys does not automatically convert prices without your approval."})}</p></div><Link className="btn btn-ghost" href={"/formateur/formation/"+id+"/builder"}>← Course Builder</Link></div>

    {message&&<p className="manual-note">{message}</p>}
    <div className="course-pricing-layout">
      <form className="panel trainer-form" onSubmit={add}><span className="eyebrow">{t({fr:"Prix local",ar:"سعر محلي",en:"Local price"})}</span><h2>{t({fr:"Ajouter une devise",ar:"إضافة عملة",en:"Add currency"})}</h2>
        <label className="form-field"><span>{t({fr:"Devise",ar:"العملة",en:"Currency"})}</span><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option value={c.code} key={c.code}>{c.code} · {c.name}</option>)}</select></label>
        <label className="form-field"><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
        <button className="btn">{t({fr:"Ajouter / mettre à jour",ar:"إضافة / تحديث",en:"Add / update"})}</button>
      </form>
      <aside className="panel"><h2>{t({fr:"Prix disponibles",ar:"الأسعار المتاحة",en:"Available prices"})}</h2><div className="course-price-list">{prices.map(p=><article key={p.currency}><span>{p.currency}</span><strong>{Number(p.amount).toLocaleString("fr-FR")} {p.currency}</strong><button className={p.is_active?"":"enable"} onClick={()=>toggle(p)}>{p.is_active?t({fr:"Désactiver",ar:"تعطيل",en:"Disable"}):t({fr:"Activer",ar:"تفعيل",en:"Enable"})}</button></article>)}</div><p className="pricing-help">{t({fr:"Les méthodes Bankily/Masrvi/Sedad/Click utilisent un prix MRU. Les providers automatiques utilisent la devise choisie au checkout si vous avez configuré ce prix.",ar:"تستخدم Bankily/Masrvi/Sedad/Click سعراً بالأوقية. يستخدم المزود التلقائي عملة الدفع إذا كنت قد حددت سعرها.",en:"Bankily/Masrvi/Sedad/Click use an MRU price. Automatic providers use the checkout currency when you have configured that price."})}</p></aside>
    </div>
  </div></section>
}
