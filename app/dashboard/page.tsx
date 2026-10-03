"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function DashboardPage(){
  const { t } = useLanguage();
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    let active=true;
    async function checkRole(){
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){window.location.href="/connexion";return}
      const {data}=await supabase.from("profiles").select("role").eq("id",user.id).single();
      if(!active)return;
      if(data?.role==="direction" || data?.role==="admin"){
        window.location.href="/admin";
        return;
      }
      setChecking(false);
    }
    checkRole();
    return ()=>{active=false};
  },[]);

  if(checking) return <section className="dashboard-shell"><div className="container"><p>...</p></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Espace étudiant",ar:"مساحة الطالب",en:"Student area"})}</span><h1>{t({fr:"Bonjour 👋",ar:"مرحباً 👋",en:"Hello 👋"})}</h1><p>{t({fr:"Continuez votre apprentissage là où vous vous êtes arrêté.",ar:"واصل التعلم من حيث توقفت.",en:"Continue learning where you left off."})}</p></div><div className="avatar">MK</div></div>
    <div className="dash-grid"><div className="dash-main">
      <article className="panel current-course"><div className="panel-title"><div><span className="tag">{t({fr:"Formation en cours",ar:"الدورة الحالية",en:"Current course"})}</span><h2>Marketing Digital & IA</h2></div><strong>42%</strong></div><div className="progress large"><span style={{width:"42%"}} /></div><p>{t({fr:"Prochaine leçon :",ar:"الدرس التالي:",en:"Next lesson:"})} <b>{t({fr:"Créer 30 publications avec ChatGPT",ar:"إنشاء 30 منشوراً باستخدام ChatGPT",en:"Create 30 posts with ChatGPT"})}</b></p><Link className="btn" href="/formations">{t({fr:"Continuer la formation",ar:"متابعة الدورة",en:"Continue course"})}</Link></article>
      <article className="panel"><h2>{t({fr:"Mes modules",ar:"وحداتي",en:"My modules"})}</h2><div className="student-modules"><div><span>✓</span><p><b>Module 1</b><small>{t({fr:"Fondations du marketing digital",ar:"أساسيات التسويق الرقمي",en:"Digital marketing foundations"})}</small></p></div><div><span>✓</span><p><b>Module 2</b><small>{t({fr:"ChatGPT pour le marketing",ar:"ChatGPT للتسويق",en:"ChatGPT for marketing"})}</small></p></div><div className="active"><span>▶</span><p><b>Module 3</b><small>{t({fr:"Création de contenu avec l'IA",ar:"إنشاء المحتوى بالذكاء الاصطناعي",en:"AI content creation"})}</small></p></div><div><span>🔒</span><p><b>Module 4</b><small>{t({fr:"Publicité sur les réseaux sociaux",ar:"الإعلان على الشبكات الاجتماعية",en:"Social media advertising"})}</small></p></div></div></article>
    </div><aside className="dash-side"><article className="panel"><span className="tag live">LIVE</span><h3>{t({fr:"Classroom mardi",ar:"الفصل المباشر الثلاثاء",en:"Tuesday Classroom"})}</h3><p>19:00 · Meta Ads + IA</p><Link href="/classroom" className="btn full">{t({fr:"Voir ma Classroom",ar:"عرض الفصل",en:"View Classroom"})}</Link></article><article className="panel"><h3>{t({fr:"Statut du paiement",ar:"حالة الدفع",en:"Payment status"})}</h3><p className="status pending">{t({fr:"En attente de validation",ar:"قيد المراجعة",en:"Pending approval"})}</p><Link href="/paiement" className="text-link">{t({fr:"Voir le paiement",ar:"عرض الدفع",en:"View payment"})}</Link></article></aside></div>
  </div></section>
}
