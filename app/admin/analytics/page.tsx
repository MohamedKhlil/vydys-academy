"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminAnalyticsPage(){
  const {t}=useLanguage();
  const [metrics,setMetrics]=useState<any>(null);
  const [sales,setSales]=useState<any[]>([]);
  const [allowed,setAllowed]=useState<boolean|null>(null);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const [{data:m},{data:s}]=await Promise.all([
      supabase.rpc("get_admin_marketplace_metrics"),
      supabase.from("instructor_sales_view").select("id,status,expected_amount_mru,platform_fee_mru,payment_method,created_at,course_title_fr,student_name").order("created_at",{ascending:false}).limit(50)
    ]);
    setMetrics(m);setSales(s||[]);
  })()},[]);

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  const m=metrics||{};
  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Business Intelligence",ar:"تحليلات الأعمال",en:"Business Intelligence"})}</span><h1>{t({fr:"Performance de la marketplace",ar:"أداء السوق",en:"Marketplace performance"})}</h1></div></div>
    <div className="metric-grid">
      <article className="panel metric"><span>{t({fr:"Étudiants",ar:"الطلاب",en:"Students"})}</span><strong>{m.students||0}</strong></article>
      <article className="panel metric"><span>{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</span><strong>{m.instructors||0}</strong></article>
      <article className="panel metric"><span>{t({fr:"Formations publiées",ar:"الدورات المنشورة",en:"Published courses"})}</span><strong>{m.published_courses||0}</strong></article>
      <article className="panel metric"><span>{t({fr:"Ventes validées",ar:"المبيعات المؤكدة",en:"Approved sales"})}</span><strong>{Number(m.approved_sales_mru||0).toLocaleString("fr-FR")} MRU</strong></article>
      <article className="panel metric"><span>{t({fr:"Commissions Vydys",ar:"عمولات Vydys",en:"Vydys commissions"})}</span><strong>{Number(m.platform_fees_mru||0).toLocaleString("fr-FR")} MRU</strong></article>
      <article className="panel metric"><span>{t({fr:"Abonnements formateurs",ar:"اشتراكات المدربين",en:"Instructor subscriptions"})}</span><strong>{Number(m.trainer_subscription_revenue_mru||0).toLocaleString("fr-FR")} MRU</strong></article>
      <article className="panel metric"><span>{t({fr:"Candidatures en attente",ar:"طلبات معلقة",en:"Pending applications"})}</span><strong>{m.pending_trainer_applications||0}</strong></article>
      <article className="panel metric"><span>{t({fr:"Formations à valider",ar:"دورات للمراجعة",en:"Courses to review"})}</span><strong>{m.pending_course_reviews||0}</strong></article>
    </div>
    <article className="panel sales-history"><h2>{t({fr:"Dernières transactions marketplace",ar:"آخر معاملات السوق",en:"Latest marketplace transactions"})}</h2><div className="table"><div className="tr sales-head"><span>{t({fr:"Étudiant",ar:"الطالب",en:"Student"})}</span><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><span>{t({fr:"Statut",ar:"الحالة",en:"Status"})}</span></div>{sales.map(s=><div className="tr sales-row" key={s.id}><span>{s.student_name||"—"}</span><span>{s.course_title_fr||"—"}</span><span>{Number(s.expected_amount_mru||0).toLocaleString("fr-FR")} MRU</span><span className={s.status==="approved"?"status":s.status==="pending"?"status pending":"status rejected"}>{s.status}</span></div>)}</div></article>
  </div></section>
}
