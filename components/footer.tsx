"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer footer-v2">
      <div className="container footer-cta-row">
        <div>
          <span className="eyebrow">VYDYS</span>
          <h2>{t({fr:"Apprendre. Construire. Prouver.",ar:"تعلّم. ابنِ. أثبت.",en:"Learn. Build. Prove."})}</h2>
          <p>{t({fr:"IA, technologies émergentes, Classrooms live, pratique et compétences vérifiées dans un seul écosystème.",ar:"ذكاء اصطناعي وتقنيات حديثة وفصول مباشرة وتدريب ومهارات موثقة في منظومة واحدة.",en:"AI, emerging technology, live Classrooms, practice and verified skills in one ecosystem."})}</p>
        </div>
        <div className="footer-cta-actions">
          <Link className="btn" href="/formations">{t({fr:"Explorer Vydys",ar:"استكشف Vydys",en:"Explore Vydys"})}</Link>
          <Link className="btn btn-ghost footer-dark-ghost" href="/devenir-formateur">{t({fr:"Enseigner",ar:"درّس",en:"Teach"})}</Link>
        </div>
      </div>

      <div className="container footer-main-grid">
        <div className="footer-brand-block">
          <Link href="/" className="footer-logo-link"><img src="/vydys-logo-light.svg" alt="Vydys Academy" className="brand-logo"/></Link>
          <p>{t({fr:"La plateforme internationale pour développer des capacités réelles en IA et technologie.",ar:"المنصة الدولية لبناء قدرات حقيقية في الذكاء الاصطناعي والتقنية.",en:"The international platform for building real capability in AI and technology."})}</p>
          <div className="footer-badges"><span>AI</span><span>LIVE</span><span>LABS</span><span>SKILLS</span></div>
        </div>

        <div className="footer-column">
          <strong>{t({fr:"Découvrir",ar:"اكتشف",en:"Discover"})}</strong>
          <Link href="/formations">{t({fr:"Formations",ar:"الدورات",en:"Courses"})}</Link>
          <Link href="/classroom">Classroom</Link>
          <Link href="/formateurs">{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</Link>
          <Link href="/practice">Practice Hub</Link>
          <Link href="/skill-engine">Skill Engine</Link>
        </div>

        <div className="footer-column">
          <strong>AI & Skills</strong>
          <Link href="/ai-tutor">Vydys AI Tutor</Link>
          <Link href="/ai-lab">AI Lab</Link>
          <Link href="/ai-lab/knowledge">Knowledge Base</Link>
          <Link href="/competences">Skills Passport</Link>
          <Link href="/projects">{t({fr:"Projets",ar:"المشاريع",en:"Projects"})}</Link>
          <Link href="/portfolio">Portfolio</Link>
        </div>

        <div className="footer-column">
          <strong>{t({fr:"Enseigner",ar:"التدريس",en:"Teach"})}</strong>
          <Link href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"})}</Link>
          <Link href="/formateur/classrooms">Vydys Classroom</Link>
          <Link href="/formateur/copilote">AI Copilot</Link>
          <Link href="/formateur/paiements">{t({fr:"Paiements",ar:"المدفوعات",en:"Payments"})}</Link>
        </div>

        <div className="footer-column">
          <strong>{t({fr:"Support & légal",ar:"الدعم والقانون",en:"Support & legal"})}</strong>
          <Link href="/support">{t({fr:"Centre d’aide",ar:"مركز المساعدة",en:"Help center"})}</Link>
          <Link href="/conditions">{t({fr:"Conditions",ar:"الشروط",en:"Terms"})}</Link>
          <Link href="/confidentialite">{t({fr:"Confidentialité",ar:"الخصوصية",en:"Privacy"})}</Link>
          <Link href="/remboursements">{t({fr:"Remboursements",ar:"الاسترداد",en:"Refunds"})}</Link>
          <Link href="/regles-contenu">{t({fr:"Standards de contenu",ar:"معايير المحتوى",en:"Content standards"})}</Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Vydys Academy</span>
        <span>{t({fr:"AI & Technology Learning System",ar:"نظام تعلم الذكاء الاصطناعي والتقنية",en:"AI & Technology Learning System"})}</span>
        <span>vydys.com</span>
      </div>
    </footer>
  );
}
