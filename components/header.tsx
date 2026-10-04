"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";

export function Header() {
  const { lang, setLang, t } = useLanguage();
  const [role,setRole]=useState<string|null>(null);
  const [signedIn,setSignedIn]=useState(false);

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
    <div className="language-switcher" aria-label="Language selector">{(["fr","ar","en"] as const).map(code=><button key={code} className={lang===code?"active":""} onClick={()=>setLang(code)}>{code.toUpperCase()}</button>)}</div>
    {signedIn?<button className="btn btn-small" onClick={logout}>{t({fr:"Déconnexion",ar:"تسجيل الخروج",en:"Sign out"})}</button>:<Link className="btn btn-small" href="/connexion">{t({fr:"Se connecter",ar:"تسجيل الدخول",en:"Sign in"})}</Link>}
  </div></header>
}
