"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";

export function Header() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" href="/">
          <span className="brand-mark">V</span>
          <span>Vydys <strong>Academy</strong></span>
        </Link>
        <nav className="main-nav" aria-label={t({fr:"Navigation principale",ar:"التنقل الرئيسي",en:"Main navigation"})}>
          <Link href="/formations">{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</Link>
          <Link href="/classroom">{t({fr:"Classroom",ar:"الفصل المباشر",en:"Classroom"})}</Link>
          <Link href="/dashboard">{t({fr:"Mon espace",ar:"حسابي",en:"My space"})}</Link>
          <Link href="/paiement">{t({fr:"Paiement",ar:"الدفع",en:"Payment"})}</Link>
        </nav>
        <div className="language-switcher" aria-label="Language selector">
          {(["fr","ar","en"] as const).map((code) => (
            <button key={code} className={lang===code ? "active" : ""} onClick={() => setLang(code)}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <Link className="btn btn-small" href="/connexion">{t({fr:"Se connecter",ar:"تسجيل الدخول",en:"Sign in"})}</Link>
      </div>
    </header>
  );
}
