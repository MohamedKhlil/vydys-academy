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
    const {data:listener}=supabase.auth.onAuthStateChange(()=>{loadUser()});
    return ()=>{active=false;listener.subscription.unsubscribe()};
  },[]);

  async function logout(){await supabase.auth.signOut();window.location.href="/";}

  const isManagement=role==="direction"||role==="admin";
  const isInstructor=role==="instructor";

  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" href="/"><span className="brand-mark">V</span><span>Vydys <strong>Academy</strong></span></Link>
    <nav className="main-nav" aria-label={t({fr:"Navigation principale",ar:"التنقل الرئيسي",en:"Main navigation"})}>
      <Link href="/formations">{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</Link>
      <Link href="/formateurs">{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</Link>
      <Link href="/classroom">{t({fr:"Classroom",ar:"الفصل المباشر",en:"Classroom"})}</Link>
      {signedIn&&!isManagement&&(isInstructor?<Link href="/formateur/copilote">Vydys AI</Link>:<>
        <details className="nav-dropdown practice-dropdown">
          <summary>Practice <span>⌄</span></summary>
          <div className="nav-dropdown-menu practice-menu">
            <Link href="/practice"><b>▶ Practice Hub</b><small>{t({fr:"Tous les labs & challenges",ar:"كل المختبرات والتحديات",en:"All labs & challenges"})}</small></Link>
            <Link href="/ai-lab/code"><b>&lt;/&gt; Code Lab</b><small>Python · JavaScript</small></Link>
            <Link href="/practice/sql"><b>▦ SQL Lab</b><small>SQLite · Queries · Data</small></Link>
            <Link href="/practice/api"><b>API · API Lab</b><small>HTTP · JSON · Status codes</small></Link>
            <Link href="/practice/data"><b>CSV · Data Lab</b><small>Profile · Explore · Clean</small></Link>
            <Link href="/practice/prompt"><b>A/B · Prompt Lab</b><small>BYOK · Compare · Tokens</small></Link>
            <Link href="/practice/git"><b>GIT · Git Lab</b><small>Branches · Commits · Diff</small></Link>
            <Link href="/practice/automation"><b>WF · Automation Lab</b><small>Triggers · Filters · AI</small></Link>
            <Link href="/practice/cloud"><b>☁ · Cloud Lab</b><small>Architecture · Security · Deploy</small></Link>
            <Link href="/practice/interview"><b>🎤 Interview Simulator</b><small>{t({fr:"Préparation carrière",ar:"تحضير مهني",en:"Career practice"})}</small></Link>
            <Link href="/practice/peer-review"><b>↔ Peer Review</b><small>{t({fr:"Feedback communauté",ar:"ملاحظات المجتمع",en:"Community feedback"})}</small></Link>
            <Link href="/practice/runner"><b>RUN · Secure Runner</b><small>Firecracker · Python · Node</small></Link>
            <Link href="/practice/toolkit"><b>{} · Developer Toolkit</b><small>JSON · Regex · Encode · Hash</small></Link>
            <Link href="/practice/safety"><b>🛡 AI Safety Lab</b><small>Injection · Secrets · Guardrails</small></Link>
          </div>
        </details>
        <Link href="/skill-engine">Skill Engine</Link>
        <Link href="/ai-tutor">Vydys AI</Link>
        <details className="nav-dropdown">
          <summary>AI Lab <span>⌄</span></summary>
          <div className="nav-dropdown-menu">
            <Link href="/ai-lab"><b>✦ AI Lab</b><small>{t({fr:"Agents personnels & BYOK",ar:"وكلاء شخصيون و BYOK",en:"Personal agents & BYOK"})}</small></Link>
            <Link href="/ai-lab/knowledge"><b>◆ Knowledge Base</b><small>{t({fr:"Documents, notes & RAG",ar:"مستندات وملاحظات و RAG",en:"Documents, notes & RAG"})}</small></Link>
            <Link href="/ai-lab/code"><b>&lt;/&gt; Code Lab</b><small>Python · JavaScript</small></Link>
          </div>
        </details>
      </>)}
      {isManagement?<Link href="/admin">{t({fr:"Administration",ar:"الإدارة",en:"Administration"})}</Link>
      :isInstructor?<Link href="/formateur">{t({fr:"Espace formateur",ar:"مساحة المدرب",en:"Instructor area"})}</Link>
      :<Link href="/dashboard">{t({fr:"Mon espace",ar:"حسابي",en:"My space"})}</Link>}
      {signedIn&&<Link href="/messages">💬</Link>}
      {signedIn&&<Link href="/notifications">🔔</Link>}
      {signedIn&&!isInstructor&&!isManagement&&<Link href="/favoris">♥</Link>}
      {!signedIn&&<Link href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Teach on Vydys"})}</Link>}
    </nav>
    <button className="mobile-nav-toggle" aria-label={t({fr:"Ouvrir le menu",ar:"فتح القائمة",en:"Open menu"})} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}><span></span><span></span><span></span></button>
    <div className="language-switcher" aria-label="Language selector">{(["fr","ar","en"] as const).map(code=><button key={code} className={lang===code?"active":""} onClick={()=>setLang(code)}>{code.toUpperCase()}</button>)}</div>
    {signedIn?<button className="btn btn-small" onClick={logout}>{t({fr:"Déconnexion",ar:"تسجيل الخروج",en:"Sign out"})}</button>:<Link className="btn btn-small" href="/connexion">{t({fr:"Se connecter",ar:"تسجيل الدخول",en:"Sign in"})}</Link>}
  </div>
  {mobileOpen&&<div className="mobile-nav-panel"><div className="container" onClick={e=>{if((e.target as HTMLElement).closest("a"))setMobileOpen(false)}}>
    <nav className="mobile-nav-links" aria-label={t({fr:"Navigation mobile",ar:"تنقل الهاتف",en:"Mobile navigation"})}>
      <Link href="/formations">{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</Link>
      <Link href="/formateurs">{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</Link>
      <Link href="/classroom">Classroom</Link>
      {signedIn&&!isManagement&&!isInstructor&&<>
        <Link href="/dashboard">{t({fr:"Mon espace",ar:"حسابي",en:"My space"})}</Link>
        <Link href="/practice">Practice Hub</Link>
        <Link href="/skill-engine">Skill Engine</Link>
        <Link href="/ai-tutor">Vydys AI Tutor</Link>
        <Link href="/ai-lab">AI Lab</Link>
        <Link href="/ai-lab/knowledge">Knowledge Base</Link>
        <Link href="/ai-lab/code">Code Lab</Link>
        <Link href="/projects">{t({fr:"Mes projets",ar:"مشاريعي",en:"My projects"})}</Link>
        <Link href="/competences">Skills Passport</Link>
        <Link href="/portfolio">Portfolio</Link>
      </>}
      {signedIn&&isInstructor&&<>
        <Link href="/formateur">{t({fr:"Espace formateur",ar:"مساحة المدرب",en:"Instructor area"})}</Link>
        <Link href="/formateur/copilote">Vydys AI Copilot</Link>
        <Link href="/formateur/projets">{t({fr:"Projets étudiants",ar:"مشاريع الطلاب",en:"Student projects"})}</Link>
      </>}
      {signedIn&&isManagement&&<Link href="/admin">{t({fr:"Administration",ar:"الإدارة",en:"Administration"})}</Link>}
      {signedIn&&<Link href="/messages">{t({fr:"Messages",ar:"الرسائل",en:"Messages"})}</Link>}
      {signedIn&&<Link href="/notifications">{t({fr:"Notifications",ar:"الإشعارات",en:"Notifications"})}</Link>}
      {!signedIn&&<Link href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Teach on Vydys"})}</Link>}
    </nav>
    <div className="mobile-nav-footer">
      <div className="language-switcher">{(["fr","ar","en"] as const).map(code=><button key={code} className={lang===code?"active":""} onClick={()=>setLang(code)}>{code.toUpperCase()}</button>)}</div>
      {signedIn?<button className="btn" onClick={logout}>{t({fr:"Déconnexion",ar:"تسجيل الخروج",en:"Sign out"})}</button>:<Link className="btn" href="/connexion">{t({fr:"Se connecter",ar:"تسجيل الدخول",en:"Sign in"})}</Link>}
    </div>
  </div></div>}
  </header>
}
