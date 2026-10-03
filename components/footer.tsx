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
          <p>{t({
            fr:"Des compétences digitales utiles, accessibles et orientées pratique.",
            ar:"مهارات رقمية عملية ومفيدة ومتاحة للجميع.",
            en:"Practical, useful and accessible digital skills."
          })}</p>
        </div>
        <div>
          <strong>{t({fr:"Plateforme",ar:"المنصة",en:"Platform"})}</strong>
          <Link href="/formations">{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</Link>
          <Link href="/classroom">{t({fr:"Classroom",ar:"الفصل المباشر",en:"Classroom"})}</Link>
          <Link href="/paiement">{t({fr:"Paiement",ar:"الدفع",en:"Payment"})}</Link>
        </div>
        <div>
          <strong>{t({fr:"Contact",ar:"اتصال",en:"Contact"})}</strong>
          <p>{t({fr:"Nouakchott, Mauritanie",ar:"نواكشوط، موريتانيا",en:"Nouakchott, Mauritania"})}</p>
          <p>vydys.com</p>
        </div>
      </div>
    </footer>
  );
}
