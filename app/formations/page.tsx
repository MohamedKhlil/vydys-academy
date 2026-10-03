"use client";

import Link from "next/link";
import { useLanguage } from "../../components/language-provider";

export default function FormationsPage(){
  const { t } = useLanguage();
  const modules = [
    ["01",t({fr:"Fondations du marketing digital",ar:"أساسيات التسويق الرقمي",en:"Digital marketing foundations"}),t({fr:"Canaux, parcours client et stratégie.",ar:"القنوات ورحلة العميل والاستراتيجية.",en:"Channels, customer journey and strategy."})],
    ["02",t({fr:"ChatGPT pour le marketing",ar:"ChatGPT للتسويق",en:"ChatGPT for marketing"}),t({fr:"Prompts, contenus, publicités et emails.",ar:"الأوامر والمحتوى والإعلانات والبريد الإلكتروني.",en:"Prompts, content, ads and email."})],
    ["03",t({fr:"Création de contenu avec l'IA",ar:"إنشاء المحتوى بالذكاء الاصطناعي",en:"AI content creation"}),t({fr:"Canva, images, vidéos et calendrier éditorial.",ar:"Canva والصور والفيديو وخطة المحتوى.",en:"Canva, images, video and content calendar."})],
    ["04",t({fr:"Publicité sur les réseaux sociaux",ar:"الإعلان على الشبكات الاجتماعية",en:"Social media advertising"}),t({fr:"Meta Ads, ciblage, budget et résultats.",ar:"Meta Ads والاستهداف والميزانية والنتائج.",en:"Meta Ads, targeting, budgets and results."})],
    ["05",t({fr:"Vendre sur Internet",ar:"البيع عبر الإنترنت",en:"Selling online"}),t({fr:"WhatsApp Business, landing pages et conversion.",ar:"WhatsApp Business وصفحات الهبوط والتحويل.",en:"WhatsApp Business, landing pages and conversion."})],
    ["06",t({fr:"Projet final",ar:"المشروع النهائي",en:"Final project"}),t({fr:"Construire et présenter une campagne complète.",ar:"بناء وتقديم حملة كاملة.",en:"Build and present a complete campaign."})],
  ];
  return <section className="section page-top"><div className="container"><div className="page-hero"><span className="eyebrow">{t({fr:"Catalogue",ar:"الدورات",en:"Catalog"})}</span><h1>{t({fr:"Des formations utiles pour développer vos compétences digitales.",ar:"دورات عملية لتطوير مهاراتك الرقمية.",en:"Useful courses to build your digital skills."})}</h1><p>{t({fr:"Commencez par notre parcours phare : Marketing Digital & IA.",ar:"ابدأ بدورتنا الرئيسية: التسويق الرقمي والذكاء الاصطناعي.",en:"Start with our flagship course: Digital Marketing & AI."})}</p></div><div className="course-banner"><div><span className="tag">{t({fr:"Débutant → opérationnel",ar:"مبتدئ ← محترف عملي",en:"Beginner → job-ready"})}</span><h2>Marketing Digital & Intelligence Artificielle</h2><p>{t({fr:"Parcours guidé avec Classroom en direct.",ar:"مسار تدريبي موجه مع فصول مباشرة.",en:"A guided learning path with live classrooms."})}</p><div className="pill-row"><span>6 modules</span><span>Classroom</span><span>Quiz</span><span>{t({fr:"Certificat",ar:"شهادة",en:"Certificate"})}</span></div></div><div className="course-price"><strong>1 500 MRU</strong><small className="click-price">{t({fr:"1 350 MRU avec Click",ar:"1,350 أوقية عبر Click",en:"1,350 MRU with Click"})}</small><Link className="btn" href="/paiement">{t({fr:"S'inscrire",ar:"سجّل الآن",en:"Enroll"})}</Link></div></div><div className="module-list">{modules.map(([n,title,desc])=><article className="module" key={n}><span>{n}</span><div><h3>{title}</h3><p>{desc}</p></div><b>→</b></article>)}</div></div></section>
}
