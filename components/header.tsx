"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";

export function Header() {
  const { lang, setLang, t } = useLanguage();
  const [role,setRole]=useState<string|null>(null);
  const [signedIn,setSignedIn]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);

  useEffect(()=>{
    let active=true;
    async function loadUser(){
      const {data:{user}}=await supabase.auth.getUser();
      if(!active)return;
      if(!user){setSignedIn(false);setRole(null);return}
      setSignedIn(true);
      const {data}=await supabase.from("profiles").select("role").eq("id",user.id).single();
      if(active)setRole(data?.role||"student");
    }
    loadUser();
    const {data:listener}=supabase.auth.onAuthStateChange(()=>loadUser());
    return()=>{active=false;listener.subscription.unsubscribe()}
  },[]);

  async function logout(){await supabase.auth.signOut();window.location.href="/"}

  const isManagement=role==="direction"||role==="admin";
  const isInstructor=role==="instructor";
  const isStudent=signedIn&&!isManagement&&!isInstructor;

  return <header className="site-header site-header-v3">
    <div className="container nav-wrap nav-wrap-v3">
      <Link className="brand brand-logo-link" href="/" aria-label="Vydys Academy"><img src="/vydys-logo-light.svg" alt="Vydys Academy" className="brand-logo"/></Link>

      <nav className="main-nav main-nav-v3" aria-label={t({fr:"Navigation principale",ar:"التنقل الرئيسي",en:"Main navigation"})}>
        <details className="nav-dropdown mega-nav">
          <summary>{t({fr:"Découvrir",ar:"اكتشف",en:"Discover"})}<span>⌄</span></summary>
          <div className="nav-dropdown-menu nav-mega-menu">
            <div className="nav-mega-column">
              <small>{t({fr:"Apprendre",ar:"التعلم",en:"Learn"})}</small>
              <Link href="/formations"><b>{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</b><span>{t({fr:"Cours en ligne orientés pratique",ar:"دورات عملية عبر الإنترنت",en:"Practical online courses"})}</span></Link>
              <Link href="/classroom"><b>Vydys Classroom</b><span>{t({fr:"Cohortes live intégrées",ar:"فصول مباشرة مدمجة",en:"Integrated live cohorts"})}</span></Link>
              <Link href="/formateurs"><b>{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</b><span>{t({fr:"Experts et créateurs",ar:"خبراء ومنشئون",en:"Experts and creators"})}</span></Link>
              <Link href="/forum"><b>Community</b><span>{t({fr:"Forum et entraide Vydys",ar:"منتدى ومجتمع Vydys",en:"Vydys forum and community"})}</span></Link>
              <Link href="/marketplace"><b>Marketplace</b><span>{t({fr:"Produits vendus par la communauté",ar:"منتجات يبيعها المجتمع",en:"Products sold by the community"})}</span></Link>
            </div>
            <div className="nav-mega-column">
              <small>{t({fr:"Pratiquer",ar:"التدريب",en:"Practice"})}</small>
              <Link href="/practice"><b>Practice Hub</b><span>Code · SQL · API · Data · Cloud</span></Link>
              <Link href="/ai-lab"><b>AI Lab</b><span>Agents · RAG · Knowledge · Code</span></Link>
              <Link href="/skill-engine"><b>Skill Engine</b><span>{t({fr:"Diagnostic & missions",ar:"تشخيص ومهام",en:"Diagnostics & missions"})}</span></Link>
            </div>
            <div className="nav-mega-column">
              <small>{t({fr:"Prouver",ar:"الإثبات",en:"Prove"})}</small>
              <Link href="/competences"><b>Skills Passport</b><span>{t({fr:"Compétences vérifiées",ar:"مهارات موثقة",en:"Verified skills"})}</span></Link>
              <Link href="/projects"><b>{t({fr:"Projets",ar:"المشاريع",en:"Projects"})}</b><span>{t({fr:"Construisez des preuves",ar:"ابن أدلة",en:"Build evidence"})}</span></Link>
              <Link href="/portfolio"><b>Portfolio</b><span>{t({fr:"Montrez votre valeur",ar:"اعرض قيمتك",en:"Show your value"})}</span></Link>
            </div>
          </div>
        </details>

        <Link href="/hub">Hub</Link>
        <Link href="/formations">{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</Link>
        <Link href="/marketplace">Market</Link>
        <Link href="/classroom">Classroom</Link>
        <Link href="/practice">Practice</Link>
        <Link href="/ai-lab">AI Lab</Link>

        {isStudent&&<Link href="/ai-tutor">Vydys AI</Link>}
        {isInstructor&&<Link href="/formateur/copilote">Vydys AI</Link>}
        {isManagement&&<Link href="/admin">{t({fr:"Administration",ar:"الإدارة",en:"Admin"})}</Link>}
      </nav>

      <div className="nav-actions-v3">
        <div className="language-switcher language-switcher-v3" aria-label="Language selector">
          {(["fr","ar","en"] as const).map(code=><button key={code} className={lang===code?"active":""} onClick={()=>setLang(code)}>{code.toUpperCase()}</button>)}
        </div>

        {signedIn&&<Link className="nav-icon-link" href="/messages" aria-label={t({fr:"Messages",ar:"الرسائل",en:"Messages"})}>◌</Link>}
        {signedIn&&<Link className="nav-icon-link" href="/notifications" aria-label={t({fr:"Notifications",ar:"الإشعارات",en:"Notifications"})}>●</Link>}
        {signedIn&&<Link className="nav-icon-link" href="/parametres" aria-label={t({fr:"Paramètres",ar:"الإعدادات",en:"Settings"})}>⚙</Link>}

        {isStudent&&<Link className="nav-account-link" href="/dashboard">{t({fr:"Mon espace",ar:"حسابي",en:"My space"})}</Link>}
        {isInstructor&&<Link className="nav-account-link" href="/formateur">Studio</Link>}
        {isManagement&&<Link className="nav-account-link" href="/admin">Control</Link>}

        {!signedIn&&<Link className="nav-account-link" href="/devenir-formateur">{t({fr:"Enseigner",ar:"درّس",en:"Teach"})}</Link>}
        {signedIn?<button className="btn btn-small nav-signin" onClick={logout}>{t({fr:"Sortir",ar:"خروج",en:"Sign out"})}</button>:<Link className="btn btn-small nav-signin" href="/connexion">{t({fr:"Se connecter",ar:"دخول",en:"Sign in"})}</Link>}

        <button className="mobile-nav-toggle mobile-nav-toggle-v3" aria-label={t({fr:"Ouvrir le menu",ar:"فتح القائمة",en:"Open menu"})} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}>
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    {mobileOpen&&<div className="mobile-nav-panel mobile-nav-panel-v3">
      <div className="container mobile-menu-v3" onClick={e=>{if((e.target as HTMLElement).closest("a"))setMobileOpen(false)}}>
        <div className="mobile-menu-head"><div><img src="/vydys-icon.svg" alt=""/><div><strong>Vydys</strong><small>AI & Technology Learning System</small></div></div><button onClick={()=>setMobileOpen(false)}>×</button></div>

        <div className="mobile-menu-section">
          <small>{t({fr:"Découvrir",ar:"اكتشف",en:"Discover"})}</small>
          <Link href="/hub"><span>00</span><div><strong>Vydys Hub</strong><small>{t({fr:"Tout l’écosystème Vydys",ar:"منظومة Vydys كاملة",en:"The complete Vydys ecosystem"})}</small></div><b>→</b></Link>
          <Link href="/formations"><span>01</span><div><strong>{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</strong><small>{t({fr:"Apprendre avec des experts",ar:"تعلم مع الخبراء",en:"Learn with experts"})}</small></div><b>→</b></Link>
          <Link href="/classroom"><span>02</span><div><strong>Vydys Classroom</strong><small>{t({fr:"Cohortes live",ar:"فصول مباشرة",en:"Live cohorts"})}</small></div><b>→</b></Link>
          <Link href="/practice"><span>03</span><div><strong>Practice Hub</strong><small>Code · SQL · API · Data · Cloud</small></div><b>→</b></Link>
          <Link href="/ai-lab"><span>04</span><div><strong>AI Lab</strong><small>Agents · RAG · Knowledge · Code</small></div><b>→</b></Link>
          <Link href="/forum"><span>05</span><div><strong>Community</strong><small>{t({fr:"Forum Vydys",ar:"منتدى Vydys",en:"Vydys forum"})}</small></div><b>→</b></Link>
          <Link href="/marketplace"><span>06</span><div><strong>Marketplace</strong><small>{t({fr:"Acheter et vendre",ar:"شراء وبيع",en:"Buy and sell"})}</small></div><b>→</b></Link>
        </div>

        {isStudent&&<div className="mobile-menu-section">
          <small>{t({fr:"Mon parcours",ar:"مساري",en:"My journey"})}</small>
          <Link href="/dashboard"><strong>{t({fr:"Dashboard",ar:"لوحة التحكم",en:"Dashboard"})}</strong></Link>
          <Link href="/skill-engine"><strong>Skill Engine</strong></Link>
          <Link href="/ai-tutor"><strong>Vydys AI Tutor</strong></Link>
          <Link href="/projects"><strong>{t({fr:"Mes projets",ar:"مشاريعي",en:"My projects"})}</strong></Link>
          <Link href="/competences"><strong>Skills Passport</strong></Link>
          <Link href="/portfolio"><strong>Portfolio</strong></Link>
          <Link href="/parametres"><strong>{t({fr:"Paramètres",ar:"الإعدادات",en:"Settings"})}</strong></Link>
        </div>}

        {isInstructor&&<div className="mobile-menu-section">
          <small>Vydys Studio</small>
          <Link href="/formateur"><strong>{t({fr:"Dashboard formateur",ar:"لوحة المدرب",en:"Instructor dashboard"})}</strong></Link>
          <Link href="/formateur/nouvelle-formation"><strong>{t({fr:"Créer une formation",ar:"إنشاء دورة",en:"Create course"})}</strong></Link>
          <Link href="/formateur/classrooms"><strong>Classrooms</strong></Link>
          <Link href="/formateur/copilote"><strong>AI Copilot</strong></Link>
          <Link href="/formateur/paiements"><strong>{t({fr:"Paiements",ar:"المدفوعات",en:"Payments"})}</strong></Link>
          <Link href="/marketplace/vendre"><strong>{t({fr:"Vendre un produit",ar:"بيع منتج",en:"Sell a product"})}</strong></Link>
          <Link href="/parametres"><strong>{t({fr:"Paramètres",ar:"الإعدادات",en:"Settings"})}</strong></Link>
        </div>}

        {isManagement&&<div className="mobile-menu-section">
          <small>Vydys Control</small>
          <Link href="/admin"><strong>Overview</strong></Link>
          <Link href="/admin/formateurs"><strong>{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</strong></Link>
          <Link href="/admin/formations"><strong>{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</strong></Link>
          <Link href="/admin/classrooms"><strong>Classrooms</strong></Link>
          <Link href="/admin/tarifs"><strong>{t({fr:"Finance & tarifs",ar:"المالية والأسعار",en:"Finance & pricing"})}</strong></Link>
          <Link href="/admin/marketplace"><strong>Marketplace</strong></Link>
          <Link href="/admin/marketplace/vendeurs"><strong>{t({fr:"Vendeurs vérifiés",ar:"البائعون الموثقون",en:"Verified sellers"})}</strong></Link>
          <Link href="/parametres"><strong>{t({fr:"Paramètres",ar:"الإعدادات",en:"Settings"})}</strong></Link>
        </div>}

        <div className="mobile-menu-bottom">
          <div className="language-switcher">{(["fr","ar","en"] as const).map(code=><button key={code} className={lang===code?"active":""} onClick={()=>setLang(code)}>{code.toUpperCase()}</button>)}</div>
          {signedIn?<button className="btn" onClick={logout}>{t({fr:"Déconnexion",ar:"تسجيل الخروج",en:"Sign out"})}</button>:<div><Link className="btn btn-ghost" href="/devenir-formateur">{t({fr:"Enseigner",ar:"درّس",en:"Teach"})}</Link><Link className="btn" href="/connexion">{t({fr:"Se connecter",ar:"دخول",en:"Sign in"})}</Link></div>}
        </div>
      </div>
    </div>}
  </header>
}
