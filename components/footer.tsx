"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand"><span className="brand-mark">V</span><span>Vydys <strong>Academy</strong></span></div>
          <p>{t({fr:"Des compétences digitales utiles, accessibles et orientées pratique.",ar:"مهارات رقمية عملية ومفيدة ومتاحة للجميع.",en:"Practical, useful and accessible digital skills."})}</p>
        </div>
        <div>
          <strong>{t({fr:"Plateforme",ar:"المنصة",en:"Platform"})}</strong>
          <Link href="/formations">{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</Link>
          <Link href="/formateurs">{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</Link>
          <Link href="/support">{t({fr:"Aide & litiges",ar:"المساعدة والنزاعات",en:"Help & disputes"})}</Link>
        </div>
        <div>
          <strong>AI & Labs</strong>
          <Link href="/ai-tutor">Vydys AI Tutor</Link>
          <Link href="/ai-lab">AI Lab</Link>
          <Link href="/ai-lab/knowledge">Knowledge Base</Link>
          <Link href="/ai-lab/code">Code Lab</Link>
        </div>
        <div>
          <strong>{t({fr:"Informations",ar:"المعلومات",en:"Information"})}</strong>
          <Link href="/conditions">{t({fr:"Conditions d’utilisation",ar:"شروط الاستخدام",en:"Terms of Use"})}</Link>
          <Link href="/confidentialite">{t({fr:"Confidentialité",ar:"الخصوصية",en:"Privacy"})}</Link>
          <Link href="/remboursements">{t({fr:"Remboursements",ar:"الاسترداد",en:"Refunds"})}</Link>
          <Link href="/regles-contenu">{t({fr:"Standards de contenu",ar:"معايير المحتوى",en:"Content standards"})}</Link>
        </div>
        <div>
          <strong>{t({fr:"Vydys Academy",ar:"Vydys Academy",en:"Vydys Academy"})}</strong>
          <p>vydys.com</p>
        </div>
      </div>
    </footer>
  );
}
