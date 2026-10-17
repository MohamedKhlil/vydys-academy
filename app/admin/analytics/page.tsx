"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";
import AdminVisitorAnalytics from "../../../components/admin-visitor-analytics";
import AdminGrowthRetention from "../../../components/admin-growth-retention";
import AdminActivationFunnel from "../../../components/admin-activation-funnel";
import "../../admin-growth.css";

type PlatformStats = {
  totalUsers:number;
  students:number;
  instructors:number;
  management:number;
  new7:number;
  new30:number;
  totalCourses:number;
  publishedCourses:number;
  classrooms:number;
  enrollments:number;
  certificates:number;
  marketplaceProducts:number;
  marketplaceOrders:number;
  forumThreads:number;
  forumPosts:number;
  aiUsage:number;
  supportCases:number;
  auditActions:number;
};

type RecentProfile = {
  id:string;
  full_name:string|null;
  phone:string|null;
  role:string;
  country_code:string|null;
  preferred_language:string|null;
  created_at:string;
};

const emptyStats:PlatformStats={
  totalUsers:0,students:0,instructors:0,management:0,new7:0,new30:0,
  totalCourses:0,publishedCourses:0,classrooms:0,enrollments:0,certificates:0,
  marketplaceProducts:0,marketplaceOrders:0,forumThreads:0,forumPosts:0,
  aiUsage:0,supportCases:0,auditActions:0
};

export default function AdminAnalyticsPage(){
  const {t}=useLanguage();
  const [metrics,setMetrics]=useState<any>(null);
  const [sales,setSales]=useState<any[]>([]);
  const [stats,setStats]=useState<PlatformStats>(emptyStats);
  const [recentProfiles,setRecentProfiles]=useState<RecentProfile[]>([]);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}

    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";
    setAllowed(ok);
    if(!ok)return;

    const since7=new Date(Date.now()-7*24*60*60*1000).toISOString();
    const since30=new Date(Date.now()-30*24*60*60*1000).toISOString();

    const results=await Promise.all([
      supabase.rpc("get_admin_marketplace_metrics"),
      supabase.from("instructor_sales_view").select("id,status,expected_amount_mru,platform_fee_mru,payment_method,created_at,course_title_fr,student_name").order("created_at",{ascending:false}).limit(50),

      supabase.from("profiles").select("id",{count:"exact",head:true}),
      supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","student"),
      supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","instructor"),
      supabase.from("profiles").select("id",{count:"exact",head:true}).in("role",["admin","direction"]),
      supabase.from("profiles").select("id",{count:"exact",head:true}).gte("created_at",since7),
      supabase.from("profiles").select("id",{count:"exact",head:true}).gte("created_at",since30),

      supabase.from("courses").select("id",{count:"exact",head:true}),
      supabase.from("courses").select("id",{count:"exact",head:true}).eq("status","published"),
      supabase.from("classrooms").select("id",{count:"exact",head:true}),
      supabase.from("enrollments").select("id",{count:"exact",head:true}),
      supabase.from("certificates").select("id",{count:"exact",head:true}),
      supabase.from("marketplace_products").select("id",{count:"exact",head:true}),
      supabase.from("marketplace_orders").select("id",{count:"exact",head:true}),
      supabase.from("forum_threads").select("id",{count:"exact",head:true}),
      supabase.from("forum_posts").select("id",{count:"exact",head:true}),
      supabase.from("ai_usage").select("id",{count:"exact",head:true}),
      supabase.from("support_cases").select("id",{count:"exact",head:true}),
      supabase.from("audit_logs").select("id",{count:"exact",head:true}),

      supabase.from("profiles")
        .select("id,full_name,phone,role,country_code,preferred_language,created_at")
        .order("created_at",{ascending:false})
        .limit(30)
    ]);

    const [
      metricsRes,salesRes,totalUsers,students,instructors,management,new7,new30,
      totalCourses,publishedCourses,classrooms,enrollments,certificates,
      marketplaceProducts,marketplaceOrders,forumThreads,forumPosts,aiUsage,
      supportCases,auditActions,recent
    ]=results;

    setMetrics(metricsRes.data||{});
    setSales(salesRes.data||[]);
    setStats({
      totalUsers:totalUsers.count||0,
      students:students.count||0,
      instructors:instructors.count||0,
      management:management.count||0,
      new7:new7.count||0,
      new30:new30.count||0,
      totalCourses:totalCourses.count||0,
      publishedCourses:publishedCourses.count||0,
      classrooms:classrooms.count||0,
      enrollments:enrollments.count||0,
      certificates:certificates.count||0,
      marketplaceProducts:marketplaceProducts.count||0,
      marketplaceOrders:marketplaceOrders.count||0,
      forumThreads:forumThreads.count||0,
      forumPosts:forumPosts.count||0,
      aiUsage:aiUsage.count||0,
      supportCases:supportCases.count||0,
      auditActions:auditActions.count||0
    });
    setRecentProfiles((recent.data||[]) as RecentProfile[]);

    const firstError=results.find((r:any)=>r?.error)?.error;
    if(firstError)setMessage(firstError.message);
  })()},[]);

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  const m=metrics||{};
  const roleLabel=(role:string)=>role==="student"
    ?t({fr:"Étudiant",ar:"طالب",en:"Student"})
    :role==="instructor"
      ?t({fr:"Formateur",ar:"مدرب",en:"Instructor"})
      :role==="direction"
        ?t({fr:"Direction",ar:"الإدارة",en:"Management"})
        :t({fr:"Admin",ar:"مسؤول",en:"Admin"});

  return <section className="dashboard-shell admin-data-page"><div className="container">
    <div className="dash-header"><div>
      <span className="eyebrow">{t({fr:"Données plateforme",ar:"بيانات المنصة",en:"Platform data"})}</span>
      <h1>{t({fr:"Vue globale Vydys",ar:"نظرة شاملة على Vydys",en:"Vydys global overview"})}</h1>
      <p>{t({
        fr:"Utilisateurs, formations, activité, paiements, marketplace, communauté et opérations dans une seule vue.",
        ar:"المستخدمون والدورات والنشاط والمدفوعات والسوق والمجتمع والعمليات في شاشة واحدة.",
        en:"Users, learning, activity, payments, marketplace, community and operations in one view."
      })}</p>
    </div></div>

    {message&&<div className="manual-note">{message}</div>}

    <AdminGrowthRetention />
    <AdminActivationFunnel />
    <AdminVisitorAnalytics />

    <div className="admin-data-section-head">
      <div><span className="tag">{t({fr:"Utilisateurs",ar:"المستخدمون",en:"Users"})}</span><h2>{t({fr:"Comptes de la plateforme",ar:"حسابات المنصة",en:"Platform accounts"})}</h2></div>
      <small>{t({fr:"Les chiffres sont lus directement depuis Supabase.",ar:"تتم قراءة الأرقام مباشرة من Supabase.",en:"Figures are read directly from Supabase."})}</small>
    </div>
    <div className="metric-grid platform-metric-grid">
      <article className="panel metric metric-primary"><span>{t({fr:"Total comptes",ar:"إجمالي الحسابات",en:"Total accounts"})}</span><strong>{stats.totalUsers}</strong><small>100%</small></article>
      <article className="panel metric"><span>{t({fr:"Étudiants",ar:"الطلاب",en:"Students"})}</span><strong>{stats.students}</strong><small>{stats.totalUsers?Math.round(stats.students/stats.totalUsers*100):0}%</small></article>
      <article className="panel metric"><span>{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</span><strong>{stats.instructors}</strong><small>{stats.totalUsers?Math.round(stats.instructors/stats.totalUsers*100):0}%</small></article>
      <article className="panel metric"><span>{t({fr:"Admin / Direction",ar:"الإدارة",en:"Admin / Management"})}</span><strong>{stats.management}</strong><small>{t({fr:"accès gestion",ar:"وصول إداري",en:"management access"})}</small></article>
      <article className="panel metric"><span>{t({fr:"Nouveaux · 7 jours",ar:"جدد · 7 أيام",en:"New · 7 days"})}</span><strong>{stats.new7}</strong><small>{t({fr:"inscriptions",ar:"تسجيلات",en:"sign-ups"})}</small></article>
      <article className="panel metric"><span>{t({fr:"Nouveaux · 30 jours",ar:"جدد · 30 يومًا",en:"New · 30 days"})}</span><strong>{stats.new30}</strong><small>{t({fr:"inscriptions",ar:"تسجيلات",en:"sign-ups"})}</small></article>
    </div>

    <div className="admin-data-section-head">
      <div><span className="tag">{t({fr:"Apprentissage",ar:"التعلم",en:"Learning"})}</span><h2>{t({fr:"Activité pédagogique",ar:"النشاط التعليمي",en:"Learning activity"})}</h2></div>
    </div>
    <div className="metric-grid platform-metric-grid">
      <article className="panel metric"><span>{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</span><strong>{stats.totalCourses}</strong><small>{stats.publishedCourses} {t({fr:"publiées",ar:"منشورة",en:"published"})}</small></article>
      <article className="panel metric"><span>Classrooms</span><strong>{stats.classrooms}</strong><small>{t({fr:"cohortes",ar:"فصول",en:"cohorts"})}</small></article>
      <article className="panel metric"><span>{t({fr:"Inscriptions aux cours",ar:"التسجيلات في الدورات",en:"Course enrollments"})}</span><strong>{stats.enrollments}</strong><small>{t({fr:"enregistrements",ar:"تسجيلات",en:"records"})}</small></article>
      <article className="panel metric"><span>{t({fr:"Certificats",ar:"الشهادات",en:"Certificates"})}</span><strong>{stats.certificates}</strong><small>{t({fr:"générés",ar:"صادرة",en:"issued"})}</small></article>
      <article className="panel metric"><span>{t({fr:"Utilisations IA",ar:"استخدامات الذكاء الاصطناعي",en:"AI usage"})}</span><strong>{stats.aiUsage}</strong><small>Vydys AI</small></article>
    </div>

    <div className="admin-data-section-head">
      <div><span className="tag">{t({fr:"Business & communauté",ar:"الأعمال والمجتمع",en:"Business & community"})}</span><h2>{t({fr:"Commerce et engagement",ar:"التجارة والتفاعل",en:"Commerce and engagement"})}</h2></div>
    </div>
    <div className="metric-grid platform-metric-grid">
      <article className="panel metric"><span>{t({fr:"Produits marketplace",ar:"منتجات السوق",en:"Marketplace products"})}</span><strong>{stats.marketplaceProducts}</strong></article>
      <article className="panel metric"><span>{t({fr:"Commandes marketplace",ar:"طلبات السوق",en:"Marketplace orders"})}</span><strong>{stats.marketplaceOrders}</strong></article>
      <article className="panel metric"><span>{t({fr:"Sujets forum",ar:"مواضيع المنتدى",en:"Forum threads"})}</span><strong>{stats.forumThreads}</strong></article>
      <article className="panel metric"><span>{t({fr:"Messages forum",ar:"مشاركات المنتدى",en:"Forum posts"})}</span><strong>{stats.forumPosts}</strong></article>
      <article className="panel metric"><span>{t({fr:"Support",ar:"الدعم",en:"Support cases"})}</span><strong>{stats.supportCases}</strong><small>{t({fr:"dossiers",ar:"طلبات",en:"cases"})}</small></article>
      <article className="panel metric"><span>{t({fr:"Actions d’audit",ar:"عمليات التدقيق",en:"Audit actions"})}</span><strong>{stats.auditActions}</strong><small>{t({fr:"événements tracés",ar:"أحداث مسجلة",en:"tracked events"})}</small></article>
    </div>

    <div className="admin-data-section-head">
      <div><span className="tag">Finance</span><h2>{t({fr:"Revenus et paiements",ar:"الإيرادات والمدفوعات",en:"Revenue and payments"})}</h2></div>
    </div>
    <div className="metric-grid platform-metric-grid">
      <article className="panel metric"><span>{t({fr:"Ventes validées",ar:"المبيعات المؤكدة",en:"Approved sales"})}</span><strong>{Number(m.approved_sales_mru||0).toLocaleString("fr-FR")} MRU</strong></article>
      <article className="panel metric"><span>{t({fr:"Commissions Vydys",ar:"عمولات Vydys",en:"Vydys commissions"})}</span><strong>{Number(m.platform_fees_mru||0).toLocaleString("fr-FR")} MRU</strong></article>
      <article className="panel metric"><span>{t({fr:"Abonnements formateurs",ar:"اشتراكات المدربين",en:"Instructor subscriptions"})}</span><strong>{Number(m.trainer_subscription_revenue_mru||0).toLocaleString("fr-FR")} MRU</strong></article>
      <article className="panel metric"><span>{t({fr:"Candidatures en attente",ar:"طلبات معلقة",en:"Pending applications"})}</span><strong>{m.pending_trainer_applications||0}</strong></article>
      <article className="panel metric"><span>{t({fr:"Formations à valider",ar:"دورات للمراجعة",en:"Courses to review"})}</span><strong>{m.pending_course_reviews||0}</strong></article>
    </div>

    <article className="panel admin-user-directory">
      <div className="admin-section-head"><div>
        <span className="tag">{t({fr:"Utilisateurs récents",ar:"المستخدمون الجدد",en:"Recent users"})}</span>
        <h2>{t({fr:"Derniers comptes créés",ar:"أحدث الحسابات",en:"Latest created accounts"})}</h2>
      </div><p>{t({fr:"Jusqu’aux 30 comptes les plus récents.",ar:"حتى أحدث 30 حسابًا.",en:"Up to the 30 most recent accounts."})}</p></div>
      <div className="table admin-user-table">
        <div className="tr admin-user-head">
          <span>{t({fr:"Utilisateur",ar:"المستخدم",en:"User"})}</span>
          <span>{t({fr:"Rôle",ar:"الدور",en:"Role"})}</span>
          <span>{t({fr:"Téléphone",ar:"الهاتف",en:"Phone"})}</span>
          <span>{t({fr:"Pays / langue",ar:"البلد / اللغة",en:"Country / language"})}</span>
          <span>{t({fr:"Créé le",ar:"تاريخ الإنشاء",en:"Created"})}</span>
        </div>
        {recentProfiles.map(p=><div className="tr admin-user-row" key={p.id}>
          <span><strong>{p.full_name||t({fr:"Sans nom",ar:"بدون اسم",en:"Unnamed"})}</strong><small>{p.id.slice(0,8)}…</small></span>
          <span><b className={"role-pill role-"+p.role}>{roleLabel(p.role)}</b></span>
          <span>{p.phone||"—"}</span>
          <span>{(p.country_code||"—")+" · "+(p.preferred_language||"—").toUpperCase()}</span>
          <span>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
        </div>)}
      </div>
    </article>

    <article className="panel sales-history">
      <h2>{t({fr:"Dernières transactions marketplace",ar:"آخر معاملات السوق",en:"Latest marketplace transactions"})}</h2>
      <div className="table">
        <div className="tr sales-head"><span>{t({fr:"Étudiant",ar:"الطالب",en:"Student"})}</span><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><span>{t({fr:"Statut",ar:"الحالة",en:"Status"})}</span></div>
        {sales.length===0&&<p className="admin-empty-row">{t({fr:"Aucune transaction enregistrée.",ar:"لا توجد معاملات مسجلة.",en:"No transactions recorded."})}</p>}
        {sales.map(s=><div className="tr sales-row" key={s.id}><span>{s.student_name||"—"}</span><span>{s.course_title_fr||"—"}</span><span>{Number(s.expected_amount_mru||0).toLocaleString("fr-FR")} MRU</span><span className={s.status==="approved"?"status":s.status==="pending"?"status pending":"status rejected"}>{s.status}</span></div>)}
      </div>
    </article>
  </div></section>
}
