"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type Payment = {
  id:string;
  payment_method:string;
  expected_amount_mru:number;
  transaction_reference:string|null;
  proof_path:string;
  created_at:string;
  profiles:{full_name:string|null;phone:string|null}|null;
  proofUrl?:string;
};

export default function AdminPage(){
  const {t}=useLanguage();
  const [payments,setPayments]=useState<Payment[]>([]);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const roleRes=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=roleRes.data?.role==="direction"||roleRes.data?.role==="admin";
    setAllowed(ok);
    if(!ok)return;
    const {data,error}=await supabase.from("payment_submissions")
      .select("id,payment_method,expected_amount_mru,transaction_reference,proof_path,created_at,profiles:user_id(full_name,phone)")
      .eq("status","pending").order("created_at",{ascending:true});
    if(error){setMessage(error.message);return}
    const rows=(data||[]) as unknown as Payment[];
    const enriched=await Promise.all(rows.map(async p=>{
      const {data:signed}=await supabase.storage.from("payment-proofs").createSignedUrl(p.proof_path,3600);
      return {...p,proofUrl:signed?.signedUrl};
    }));
    setPayments(enriched);
  }

  useEffect(()=>{load()},[]);

  async function approve(id:string){
    setMessage("");
    const {error}=await supabase.rpc("approve_payment",{p_payment_id:id});
    if(error){setMessage(error.message);return}
    setPayments(v=>v.filter(p=>p.id!==id));
  }

  async function reject(id:string){
    const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));
    if(reason===null)return;
    const {error}=await supabase.rpc("reject_payment",{p_payment_id:id,p_reason:reason});
    if(error){setMessage(error.message);return}
    setPayments(v=>v.filter(p=>p.id!==id));
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container"><p>...</p></div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1><p>{t({fr:"Cette page est réservée à la Direction Vydys Academy.",ar:"هذه الصفحة مخصصة لإدارة Vydys Academy.",en:"This page is reserved for Vydys Academy Management."})}</p></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Direction / Administration",ar:"الإدارة",en:"Management / Admin"})}</span><h1>{t({fr:"Tableau de bord",ar:"لوحة التحكم",en:"Dashboard"})}</h1><p>{t({fr:"Pilotez les paiements, formateurs, tarifs et la marketplace.",ar:"إدارة المدفوعات والمدربين والأسعار والسوق.",en:"Manage payments, instructors, pricing and the marketplace."})}</p></div></div>
    <div className="admin-nav-cards">
      <a className="panel admin-nav-card" href="/admin/formateurs"><strong>{t({fr:"Demandes formateurs",ar:"طلبات المدربين",en:"Instructor applications"})}</strong><span>{t({fr:"Valider ou refuser les nouveaux profils",ar:"قبول أو رفض ملفات المدربين",en:"Approve or reject new instructor profiles"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/abonnements"><strong>{t({fr:"Abonnements",ar:"الاشتراكات",en:"Subscriptions"})}</strong><span>{t({fr:"Valider les paiements des formateurs",ar:"مراجعة مدفوعات المدربين",en:"Approve instructor subscription payments"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/formations"><strong>{t({fr:"Formations à publier",ar:"دورات للنشر",en:"Courses to publish"})}</strong><span>{t({fr:"Contrôler les nouvelles formations",ar:"مراجعة الدورات الجديدة",en:"Review new courses"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/tarifs"><strong>{t({fr:"Tarifs plateforme",ar:"أسعار المنصة",en:"Platform pricing"})}</strong><span>{t({fr:"Abonnements, commission et règles",ar:"الاشتراكات والعمولة والقواعد",en:"Subscriptions, commission and rules"})}</span></a>
    </div>

    <div className="stat-grid">
      <article className="panel stat"><span>{t({fr:"Paiements à valider",ar:"دفعات للمراجعة",en:"Payments to review"})}</span><strong>{payments.length}</strong><small>{t({fr:"en attente",ar:"قيد الانتظار",en:"pending"})}</small></article>
      <article className="panel stat"><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><strong>1</strong><small>Marketing Digital & IA</small></article>
      <article className="panel stat"><span>Click</span><strong>1 350</strong><small>MRU</small></article>
      <article className="panel stat"><span>Bankily / Sedad / Masrvi</span><strong>1 500</strong><small>MRU</small></article>
    </div>

    <article className="panel admin-payments">
      <div className="admin-section-head"><div><span className="tag">{t({fr:"Validation manuelle",ar:"مراجعة يدوية",en:"Manual approval"})}</span><h2>{t({fr:"Preuves de paiement en attente",ar:"إثباتات الدفع قيد المراجعة",en:"Pending payment proofs"})}</h2></div><p>{t({fr:"Vérifiez la capture, le montant et le numéro 34540455 avant validation.",ar:"تحقق من الصورة والمبلغ والرقم 34540455 قبل القبول.",en:"Check the screenshot, amount and number 34540455 before approval."})}</p></div>
      {message&&<p className="manual-note">{message}</p>}
      <div className="payment-review-list">
        {payments.length===0&&<p>{t({fr:"Aucun paiement en attente.",ar:"لا توجد دفعات قيد المراجعة.",en:"No pending payments."})}</p>}
        {payments.map(p=><div className="payment-review" key={p.id}>
          {p.proofUrl?<a className="proof-thumb proof-link" href={p.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">IMG</div>}
          <div className="payment-review-main"><strong>{p.profiles?.full_name||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</strong><span>{p.payment_method.toUpperCase()} · {p.expected_amount_mru.toLocaleString("fr-FR")} MRU</span><small>{(p.profiles?.phone||"") + (p.transaction_reference ? " · Ref: " + p.transaction_reference : "")}</small></div>
          <div className="review-actions"><button className="approve" onClick={()=>approve(p.id)}>{t({fr:"Valider",ar:"قبول",en:"Approve"})}</button><button className="reject" onClick={()=>reject(p.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div>
        </div>)}
      </div>
    </article>
  </div></section>
}
