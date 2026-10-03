"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

type Method="click"|"bankily"|"sedad"|"masrvi"|"bank_transfer";

export default function FormateurPaiementsPage(){
  const {t}=useLanguage();
  const [rows,setRows]=useState<any[]>([]);
  const [method,setMethod]=useState<Method>("click");
  const [account,setAccount]=useState("");
  const [discount,setDiscount]=useState("0");
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    const {data}=await supabase.from("instructor_payment_methods").select("*").eq("instructor_id",user.id).order("created_at");
    setRows(data||[]);
  }
  useEffect(()=>{load()},[]);

  async function add(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {error}=await supabase.from("instructor_payment_methods").insert({instructor_id:user.id,method,account_number:account,discount_percent:Number(discount)||0,is_active:true});
    if(error){setMessage(error.message);return}
    setAccount("");setDiscount("0");setMessage(t({fr:"Moyen de paiement ajouté.",ar:"تمت إضافة وسيلة الدفع.",en:"Payment method added."}));await load();
  }

  async function disable(id:string){await supabase.from("instructor_payment_methods").update({is_active:false}).eq("id",id);await load()}

  return <section className="section page-top"><div className="container"><div className="page-hero"><span className="eyebrow">{t({fr:"Encaissement",ar:"التحصيل",en:"Payments"})}</span><h1>{t({fr:"Mes moyens de paiement",ar:"وسائل الدفع الخاصة بي",en:"My payment methods"})}</h1><p>{t({fr:"Les étudiants verront ces informations lorsqu'ils achèteront vos formations.",ar:"سيرى الطلاب هذه المعلومات عند شراء دوراتك.",en:"Students will see these details when buying your courses."})}</p></div>
    <div className="dash-grid"><form className="panel trainer-form" onSubmit={add}><h2>{t({fr:"Ajouter un moyen",ar:"إضافة وسيلة",en:"Add method"})}</h2><label className="form-field"><span>{t({fr:"Type",ar:"النوع",en:"Type"})}</span><select value={method} onChange={e=>setMethod(e.target.value as Method)}><option value="click">Click</option><option value="bankily">Bankily</option><option value="sedad">Sedad</option><option value="masrvi">Masrvi</option><option value="bank_transfer">{t({fr:"Virement bancaire",ar:"تحويل بنكي",en:"Bank transfer"})}</option></select></label><label className="form-field"><span>{t({fr:"Numéro / Compte",ar:"الرقم / الحساب",en:"Number / Account"})}</span><input value={account} onChange={e=>setAccount(e.target.value)} required/></label><label className="form-field"><span>{t({fr:"Réduction %",ar:"الخصم ٪",en:"Discount %"})}</span><input type="number" min="0" max="100" step="0.1" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><button className="btn">{t({fr:"Ajouter",ar:"إضافة",en:"Add"})}</button>{message&&<p className="manual-note">{message}</p>}</form>
      <aside className="panel"><h2>{t({fr:"Moyens actifs",ar:"الوسائل النشطة",en:"Active methods"})}</h2><div className="method-list">{rows.filter(r=>r.is_active).map(r=><div className="method-row" key={r.id}><div><strong>{r.method.toUpperCase()}</strong><span>{r.account_number} · {r.discount_percent}%</span></div><button onClick={()=>disable(r.id)}>{t({fr:"Désactiver",ar:"تعطيل",en:"Disable"})}</button></div>)}</div></aside>
    </div>
  </div></section>
}
