"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function FormateurPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [activeSub,setActiveSub]=useState(false);
  const [courses,setCourses]=useState<any[]>([]);
  const [methods,setMethods]=useState<any[]>([]);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="instructor";
    setAllowed(ok);
    if(!ok)return;
    const {data:subs}=await supabase.from("trainer_subscriptions").select("id,status,ends_at").eq("instructor_id",user.id).eq("status","active");
    setActiveSub((subs||[]).some((s:any)=>!s.ends_at||new Date(s.ends_at)>=new Date()));
    const {data:c}=await supabase.from("courses").select("id,title_fr,status,base_price_mru,created_at").eq("instructor_id",user.id).order("created_at",{ascending:false});
    setCourses(c||[]);
    const {data:m}=await supabase.from("instructor_payment_methods").select("*").eq("instructor_id",user.id).eq("is_active",true);
    setMethods(m||[]);
  })()},[]);

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Espace formateur",ar:"مساحة المدرب",en:"Instructor area"})}</h1><p>{t({fr:"Votre profil n'est pas encore validé comme formateur.",ar:"ملفك لم يُعتمد بعد كمدرب.",en:"Your profile is not yet approved as an instructor."})}</p><Link className="btn" href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"})}</Link></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Espace formateur",ar:"مساحة المدرب",en:"Instructor dashboard"})}</span><h1>{t({fr:"Pilotez votre activité",ar:"أدر نشاطك",en:"Run your teaching business"})}</h1><p>{t({fr:"Formations, étudiants, paiements et revenus au même endroit.",ar:"الدورات والطلاب والمدفوعات والإيرادات في مكان واحد.",en:"Courses, students, payments and revenue in one place."})}</p></div><Link className="btn" href="/formateur/nouvelle-formation">{t({fr:"+ Nouvelle formation",ar:"+ دورة جديدة",en:"+ New course"})}</Link></div>

    <div className="stat-grid">
      <article className="panel stat"><span>{t({fr:"Abonnement Vydys",ar:"اشتراك Vydys",en:"Vydys subscription"})}</span><strong>{activeSub?t({fr:"Actif",ar:"نشط",en:"Active"}):t({fr:"Inactif",ar:"غير نشط",en:"Inactive"})}</strong></article>
      <article className="panel stat"><span>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</span><strong>{courses.length}</strong></article>
      <article className="panel stat"><span>{t({fr:"Moyens de paiement",ar:"وسائل الدفع",en:"Payment methods"})}</span><strong>{methods.length}</strong></article>
      <article className="panel stat"><span>{t({fr:"Revenus",ar:"الإيرادات",en:"Revenue"})}</span><strong>0 MRU</strong><small>{t({fr:"historique à venir",ar:"السجل قريباً",en:"history coming next"})}</small></article>
    </div>

    {!activeSub&&<article className="panel subscription-warning"><h2>{t({fr:"Activez votre abonnement formateur",ar:"فعّل اشتراك المدرب",en:"Activate your instructor subscription"})}</h2><p>{t({fr:"Vous devez avoir un abonnement actif avant de pouvoir soumettre de nouvelles formations.",ar:"يجب أن يكون لديك اشتراك نشط قبل إرسال دورات جديدة.",en:"You need an active subscription before submitting new courses."})}</p><Link className="btn" href="/formateur/abonnement">{t({fr:"Voir les tarifs",ar:"عرض الأسعار",en:"View plans"})}</Link></article>}

    <div className="dash-grid"><article className="panel dash-main"><h2>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</h2>
      <div className="table">{courses.length===0?<p>{t({fr:"Aucune formation créée.",ar:"لم تنشئ أي دورة بعد.",en:"No courses created yet."})}</p>:courses.map(c=><div className="tr trainer-course-row" key={c.id}><span>{c.title_fr}</span><span>{c.base_price_mru} MRU</span><span className={c.status==="published"?"status":"status pending"}>{c.status}</span></div>)}</div>
    </article><aside className="dash-side"><article className="panel"><h3>{t({fr:"Configuration",ar:"الإعدادات",en:"Setup"})}</h3><div className="quick-actions"><Link href="/formateur/paiements">{t({fr:"Mes moyens de paiement",ar:"وسائل الدفع",en:"Payment methods"})}</Link><Link href="/formateur/abonnement">{t({fr:"Mon abonnement",ar:"اشتراكي",en:"My subscription"})}</Link><Link href="/devenir-formateur">{t({fr:"Mon profil public",ar:"ملفي العام",en:"Public profile"})}</Link></div></article></aside></div>
  </div></section>
}
