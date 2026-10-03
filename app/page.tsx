"use client";

import Link from "next/link";
import { useLanguage } from "../components/language-provider";

export default function HomePage(){
  const {t}=useLanguage();
  const pillars=[
    ["AI",t({fr:"AI Tutor personnel",ar:"مدرس ذكاء اصطناعي شخصي",en:"Personal AI Tutor"}),t({fr:"Un assistant qui connaît votre formation, explique, fait pratiquer et aide à progresser.",ar:"مساعد يعرف دورتك ويشرح ويدرّبك ويساعدك على التقدم.",en:"An assistant that knows your course, explains concepts, creates practice and helps you improve."})],
    ["⌘",t({fr:"Projects & Portfolio",ar:"المشاريع والملف المهني",en:"Projects & Portfolio"}),t({fr:"Construisez des projets réels validés par les formateurs et montrez-les aux entreprises.",ar:"أنشئ مشاريع حقيقية يعتمدها المدربون واعرضها للشركات.",en:"Build real instructor-validated projects and show them to employers."})],
    ["✓",t({fr:"Skills Passport",ar:"جواز المهارات",en:"Skills Passport"}),t({fr:"Des compétences vérifiées, avec niveau et preuves, pas seulement un certificat.",ar:"مهارات معتمدة بمستوى وأدلة، وليس مجرد شهادة.",en:"Verified skills with levels and evidence, not just a certificate."})],
    ["◉",t({fr:"Experts & communauté",ar:"الخبراء والمجتمع",en:"Experts & community"}),t({fr:"Apprenez avec des formateurs spécialisés en IA, Data, Dev, Automation, Cloud et Cyber.",ar:"تعلم مع خبراء في الذكاء الاصطناعي والبيانات والتطوير والأتمتة والسحابة والأمن.",en:"Learn with experts in AI, Data, Development, Automation, Cloud and Cybersecurity."})]
  ];

  return <>
    <section className="hero vydys2-hero"><div className="container hero-grid"><div>
      <div className="eyebrow">Vydys Academy · AI & Emerging Technologies</div>
      <h1>{t({fr:"Maîtrisez l’",ar:"أتقن ",en:"Master "})}<span>{t({fr:"IA et les technologies",ar:"الذكاء الاصطناعي والتقنيات",en:"AI and technologies"})}</span>{t({fr:" qui transforment le monde.",ar:" التي تغيّر العالم.",en:" shaping the future."})}</h1>
      <p className="hero-copy">{t({
        fr:"Vydys réunit formations, AI Tutor, projets pratiques, compétences vérifiées et portfolio professionnel pour transformer l’apprentissage en capacité réelle.",
        ar:"تجمع Vydys بين الدورات والمدرس الذكي والمشاريع العملية والمهارات المعتمدة والملف المهني لتحويل التعلم إلى قدرة حقيقية.",
        en:"Vydys combines courses, an AI Tutor, hands-on projects, verified skills and a professional portfolio to turn learning into real capability."
      })}</p>
      <div className="hero-actions"><Link className="btn" href="/formations">{t({fr:"Explorer les formations",ar:"استكشف الدورات",en:"Explore courses"})}</Link><Link className="btn btn-ghost" href="/devenir-formateur">{t({fr:"Enseigner sur Vydys",ar:"درّس على Vydys",en:"Teach on Vydys"})}</Link></div>
      <div className="hero-stats"><div><strong>AI</strong><span>{t({fr:"Tutor intégré",ar:"مدرس مدمج",en:"Tutor built in"})}</span></div><div><strong>100%</strong><span>{t({fr:"orienté pratique",ar:"عملي",en:"project-driven"})}</span></div><div><strong>✓</strong><span>{t({fr:"skills vérifiés",ar:"مهارات معتمدة",en:"verified skills"})}</span></div></div>
    </div>
    <div className="hero-card vydys2-demo">
      <div className="browser-dots"><i></i><i></i><i></i></div>
      <div className="ai-demo-card"><span className="tag">Vydys AI Tutor</span><strong>{t({fr:"« Explique-moi RAG avec un exemple concret. »",ar:"« اشرح لي RAG بمثال عملي. »",en:"“Explain RAG with a practical example.”"})}</strong><p>{t({fr:"Le tuteur s’appuie sur votre cours, puis vous propose un exercice adapté.",ar:"يعتمد المدرس على محتوى دورتك ثم يقترح تمريناً مناسباً.",en:"The tutor uses your course context, then gives you a tailored exercise."})}</p></div>
      <div className="skill-demo"><span className="verified-seal">✓</span><div><small>Skills Passport</small><strong>AI Agents · Intermediate</strong><p>{t({fr:"Validé par projet",ar:"معتمد عبر مشروع",en:"Verified by project"})}</p></div></div>
      <div className="project-demo"><span>⌘</span><div><strong>{t({fr:"Projet : Agent IA de support",ar:"مشروع: وكيل دعم ذكي",en:"Project: AI support agent"})}</strong><p>Python · API · RAG · Supabase</p></div></div>
    </div></div></section>

    <section className="section"><div className="container">
      <div className="section-head"><div><span className="eyebrow">{t({fr:"Plus qu’une plateforme de cours",ar:"أكثر من منصة دورات",en:"More than a course platform"})}</span><h2>{t({fr:"Apprendre → Construire → Prouver",ar:"تعلّم ← ابنِ ← أثبت",en:"Learn → Build → Prove"})}</h2></div><p>{t({fr:"Chaque parcours Vydys doit mener vers une compétence utilisable et démontrable.",ar:"كل مسار في Vydys يجب أن يقود إلى مهارة قابلة للاستخدام والإثبات.",en:"Every Vydys journey should lead to a skill you can use and prove."})}</p></div>
      <div className="feature-grid">{pillars.map(([icon,title,text])=><article className="feature vydys-pillar" key={title}><span className="pillar-icon">{icon}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </div></section>

    <section className="section muted"><div className="container">
      <div className="section-head"><div><span className="eyebrow">Tech Tracks</span><h2>{t({fr:"Les compétences de la prochaine décennie.",ar:"مهارات العقد القادم.",en:"Skills for the next decade."})}</h2></div></div>
      <div className="track-grid">{["Intelligence Artificielle","AI Agents & RAG","Automation & APIs","Data & Python","Développement Web","Cloud","Cybersécurité","Marketing IA"].map(x=><Link className="track-card" href="/formations" key={x}><span>↗</span><strong>{x}</strong></Link>)}</div>
    </div></section>

    <section className="section"><div className="container dual-audience">
      <article className="audience-card student"><span className="eyebrow">{t({fr:"Pour les étudiants",ar:"للطلاب",en:"For students"})}</span><h2>{t({fr:"Ne collectionnez plus les cours. Construisez des capacités.",ar:"لا تجمع الدورات فقط. ابنِ قدرات حقيقية.",en:"Stop collecting courses. Build real capability."})}</h2><p>{t({fr:"Formations + AI Tutor + projets + compétences vérifiées + portfolio public.",ar:"دورات + مدرس ذكي + مشاريع + مهارات معتمدة + ملف عام.",en:"Courses + AI Tutor + projects + verified skills + public portfolio."})}</p><Link className="btn" href="/formations">{t({fr:"Commencer à apprendre",ar:"ابدأ التعلم",en:"Start learning"})}</Link></article>
      <article className="audience-card instructor"><span className="eyebrow">{t({fr:"Pour les formateurs",ar:"للمدربين",en:"For instructors"})}</span><h2>{t({fr:"Transformez votre expertise en école digitale.",ar:"حوّل خبرتك إلى مدرسة رقمية.",en:"Turn your expertise into a digital school."})}</h2><p>{t({fr:"Course Builder, Copilote IA, paiements, projets, communauté, analytics et réputation.",ar:"منشئ دورات ومساعد ذكي ومدفوعات ومشاريع ومجتمع وتحليلات وسمعة.",en:"Course Builder, AI Copilot, payments, projects, community, analytics and reputation."})}</p><Link className="btn" href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"})}</Link></article>
    </div></section>

    <section className="section vydys-mission"><div className="container"><span className="eyebrow">Vydys Mission</span><h2>{t({fr:"Faire de l’Afrique francophone et arabophone un vivier de talents IA & Tech capables de construire, pas seulement de consommer la technologie.",ar:"بناء جيل من المواهب في الذكاء الاصطناعي والتقنية قادر على صناعة التكنولوجيا لا استهلاكها فقط.",en:"Build a generation of AI & Tech talent that can create technology, not just consume it."})}</h2><Link className="btn" href="/formations">{t({fr:"Découvrir Vydys",ar:"اكتشف Vydys",en:"Discover Vydys"})}</Link></div></section>
  </>;
}
