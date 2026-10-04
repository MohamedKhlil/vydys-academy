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
  risk_status:string;
  risk_reason:string|null;
  profiles:{full_name:string|null;phone:string|null}|null;
  proofUrl?:string;
};

export default function AdminPage(){
  const {t}=useLanguage();
  const [payments,setPayments]=useState<Payment[]>([]);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [message,setMessage]=useState("");
  const [overview,setOverview]=useState({applications:0,courses:0,classrooms:0,subscriptions:0,support:0});

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const roleRes=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=roleRes.data?.role==="direction"||roleRes.data?.role==="admin";
    setAllowed(ok);
    if(!ok)return;
    const [{data,error},{count:applications},{count:courses},{count:classrooms},{count:subscriptions},{count:support}]=await Promise.all([
      supabase.from("payment_submissions")
        .select("id,user_id,payment_method,expected_amount_mru,transaction_reference,proof_path,created_at,risk_status,risk_reason")
        .eq("status","pending").order("created_at",{ascending:true}),
      supabase.from("trainer_applications").select("id",{count:"exact",head:true}).in("status",["pending","more_info"]),
      supabase.from("courses").select("id",{count:"exact",head:true}).eq("status","pending"),
      supabase.from("classrooms").select("id",{count:"exact",head:true}).eq("status","pending"),
      supabase.from("trainer_subscriptions").select("id",{count:"exact",head:true}).eq("status","pending"),
      supabase.from("support_cases").select("id",{count:"exact",head:true}).in("status",["open","in_review"])
    ]);
    if(error){setMessage(error.message);return}
    const raw=(data||[]) as any[];
    const userIds=[...new Set(raw.map(x=>x.user_id).filter(Boolean))];
    const profileMap:Record<string,any>={};
    if(userIds.length){
      const {data:profiles}=await supabase.from("profiles").select("id,full_name,phone").in("id",userIds);
      (profiles||[]).forEach((p:any)=>profileMap[p.id]=p);
    }
    const enriched=await Promise.all(raw.map(async p=>{
      const {data:signed}=await supabase.storage.from("payment-proofs").createSignedUrl(p.proof_path,3600);
      return {...p,profiles:profileMap[p.user_id]||null,proofUrl:signed?.signedUrl};
    }));
    setPayments(enriched as Payment[]);
    setOverview({applications:applications||0,courses:courses||0,classrooms:classrooms||0,subscriptions:subscriptions||0,support:support||0});
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
      <a className="panel admin-nav-card" href="/admin/classrooms"><strong>Vydys Classroom</strong><span>{t({fr:"Valider cohortes live, frais et publications",ar:"اعتماد الفصول المباشرة والرسوم والنشر",en:"Review live cohorts, fees and publishing"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/tarifs"><strong>{t({fr:"Tarifs plateforme",ar:"أسعار المنصة",en:"Platform pricing"})}</strong><span>{t({fr:"Abonnements, commission et règles",ar:"الاشتراكات والعمولة والقواعد",en:"Subscriptions, commission and rules"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/analytics"><strong>{t({fr:"Analytics marketplace",ar:"تحليلات السوق",en:"Marketplace analytics"})}</strong><span>{t({fr:"Revenus, commissions, étudiants et croissance",ar:"الإيرادات والعمولات والطلاب والنمو",en:"Revenue, fees, students and growth"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/support"><strong>{t({fr:"Support & litiges",ar:"الدعم والنزاعات",en:"Support & disputes"})}</strong><span>{t({fr:"Traiter les demandes des étudiants et formateurs",ar:"معالجة طلبات الطلاب والمدربين",en:"Handle student and instructor requests"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/export"><strong>{t({fr:"Exports financiers",ar:"التقارير المالية",en:"Financial exports"})}</strong><span>{t({fr:"Télécharger ventes et abonnements en CSV",ar:"تنزيل المبيعات والاشتراكات بصيغة CSV",en:"Download sales and subscriptions as CSV"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/moderation"><strong>{t({fr:"Modération des avis",ar:"إدارة التقييمات",en:"Review moderation"})}</strong><span>{t({fr:"Masquer ou rétablir les avis problématiques",ar:"إخفاء أو إعادة التقييمات المخالفة",en:"Hide or restore problematic reviews"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/audit"><strong>{t({fr:"Journal d’audit",ar:"سجل التدقيق",en:"Audit log"})}</strong><span>{t({fr:"Tracer les modifications sensibles",ar:"تتبع التغييرات الحساسة",en:"Track sensitive changes"})}</span></a>
      <a className="panel admin-nav-card" href="/admin/ai"><strong>Vydys AI</strong><span>{t({fr:"Modèles, quotas et activation AI Tutor / Copilote",ar:"النماذج والحصص وتفعيل المدرس والمساعد الذكي",en:"Models, quotas and AI Tutor / Copilot controls"})}</span></a>
    </div>

    <div className="admin-ops-grid">
      <a className="panel admin-op-stat" href="#payments"><span>MRU</span><div><small>{t({fr:"Paiements étudiants",ar:"مدفوعات الطلاب",en:"Student payments"})}</small><strong>{payments.length}</strong><p>{t({fr:"à valider",ar:"بانتظار المراجعة",en:"awaiting review"})}</p></div></a>
      <a className="panel admin-op-stat" href="/admin/formateurs"><span>◎</span><div><small>{t({fr:"Candidatures formateurs",ar:"طلبات المدربين",en:"Instructor applications"})}</small><strong>{overview.applications}</strong><p>{t({fr:"à traiter",ar:"للمعالجة",en:"to process"})}</p></div></a>
      <a className="panel admin-op-stat" href="/admin/formations"><span>▤</span><div><small>{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</small><strong>{overview.courses}</strong><p>{t({fr:"à publier",ar:"للنشر",en:"to review"})}</p></div></a>
      <a className="panel admin-op-stat" href="/admin/classrooms"><span>LIVE</span><div><small>Classrooms</small><strong>{overview.classrooms}</strong><p>{t({fr:"à valider",ar:"للمراجعة",en:"to review"})}</p></div></a>
      <a className="panel admin-op-stat" href="/admin/abonnements"><span>◇</span><div><small>{t({fr:"Abonnements",ar:"الاشتراكات",en:"Subscriptions"})}</small><strong>{overview.subscriptions}</strong><p>{t({fr:"paiements en attente",ar:"دفعات معلقة",en:"payments pending"})}</p></div></a>
      <a className="panel admin-op-stat" href="/admin/support"><span>?</span><div><small>{t({fr:"Support",ar:"الدعم",en:"Support"})}</small><strong>{overview.support}</strong><p>{t({fr:"dossiers ouverts",ar:"طلبات مفتوحة",en:"open cases"})}</p></div></a>
    </div>

    <article id="payments" className="panel admin-payments">
      <div className="admin-section-head"><div><span className="tag">{t({fr:"Validation manuelle",ar:"مراجعة يدوية",en:"Manual approval"})}</span><h2>{t({fr:"Preuves de paiement en attente",ar:"إثباتات الدفع قيد المراجعة",en:"Pending payment proofs"})}</h2></div><p>{t({fr:"Vérifiez la capture, le montant et le numéro 34540455 avant validation.",ar:"تحقق من الصورة والمبلغ والرقم 34540455 قبل القبول.",en:"Check the screenshot, amount and number 34540455 before approval."})}</p></div>
      {message&&<p className="manual-note">{message}</p>}
      <div className="payment-review-list">
        {payments.length===0&&<p>{t({fr:"Aucun paiement en attente.",ar:"لا توجد دفعات قيد المراجعة.",en:"No pending payments."})}</p>}
        {payments.map(p=><div className="payment-review" key={p.id}>
          {p.proofUrl?<a className="proof-thumb proof-link" href={p.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">IMG</div>}
          <div className="payment-review-main"><strong>{p.profiles?.full_name||t({fr:"Étudiant",ar:"طالب",en:"Student"})} {p.risk_status==="review"&&<span className="risk-badge">⚠ {t({fr:"À vérifier",ar:"يحتاج مراجعة",en:"Review"})}</span>}</strong><span>{p.payment_method.toUpperCase()} · {p.expected_amount_mru.toLocaleString("fr-FR")} MRU</span><small>{(p.profiles?.phone||"") + (p.transaction_reference ? " · Ref: " + p.transaction_reference : "")}</small>{p.risk_reason&&<small className="risk-reason">{p.risk_reason}</small>}</div>
          <div className="review-actions"><button className="approve" onClick={()=>approve(p.id)}>{t({fr:"Valider",ar:"قبول",en:"Approve"})}</button><button className="reject" onClick={()=>reject(p.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div>
        </div>)}
      </div>
    </article>
  </div></section>
}
