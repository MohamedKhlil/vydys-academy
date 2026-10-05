"use client";

import Link from "next/link";
import { useLanguage } from "../components/language-provider";

export default function HomePageClient(){
  const {t}=useLanguage();

  const ecosystem=[
    {icon:"AI",title:t({fr:"Vydys AI Tutor",ar:"مدرس Vydys الذكي",en:"Vydys AI Tutor"}),text:t({fr:"Un tuteur personnel qui comprend votre parcours, explique, questionne et vous entraîne.",ar:"مدرس شخصي يفهم مسارك ويشرح ويسأل ويدرّبك.",en:"A personal tutor that understands your journey, explains, quizzes and coaches you."}),href:"/ai-tutor"},
    {icon:"LIVE",title:"Vydys Classroom",text:t({fr:"Des cohortes live avec vidéo, calendrier, présence, chat, devoirs et ressources.",ar:"فصول مباشرة مع فيديو وجدول وحضور ودردشة وواجبات وموارد.",en:"Live cohorts with video, schedule, attendance, chat, assignments and resources."}),href:"/classroom"},
    {icon:"LAB",title:"AI Lab",text:t({fr:"Agents, RAG, knowledge base, code et expériences IA dans un espace de travail dédié.",ar:"وكلاء وRAG وقاعدة معرفة وبرمجة وتجارب ذكاء اصطناعي.",en:"Agents, RAG, knowledge bases, code and AI experiments in one workspace."}),href:"/ai-lab"},
    {icon:"RUN",title:"Practice Suite",text:t({fr:"Code, SQL, API, Data, Prompt, Git, Cloud, sécurité et entretiens techniques.",ar:"برمجة وSQL وAPI وبيانات وبرومبت وGit وسحابة وأمن ومقابلات.",en:"Code, SQL, API, Data, Prompt, Git, Cloud, security and technical interviews."}),href:"/practice"},
    {icon:"SKILL",title:"Skill Engine",text:t({fr:"Objectif carrière, diagnostic, gap de compétences et missions quotidiennes adaptées.",ar:"هدف مهني وتشخيص وفجوات مهارية ومهام يومية مخصصة.",en:"Career goals, diagnostics, skill gaps and tailored daily missions."}),href:"/skill-engine"},
    {icon:"✓",title:"Skills Passport",text:t({fr:"Des compétences mesurées et vérifiées avec une preuve liée à vos projets et évaluations.",ar:"مهارات مقاسة وموثقة بأدلة مرتبطة بمشاريعك وتقييماتك.",en:"Measured and verified skills with evidence tied to projects and assessments."}),href:"/competences"}
  ];

  const paths=[
    ["01",t({fr:"Choisissez votre objectif",ar:"اختر هدفك",en:"Choose your goal"}),t({fr:"Métier cible, compétences à acquérir et niveau attendu.",ar:"المهنة المستهدفة والمهارات والمستوى المطلوب.",en:"Target role, required skills and expected level."})],
    ["02",t({fr:"Diagnostiquez votre niveau",ar:"شخّص مستواك",en:"Diagnose your level"}),t({fr:"Vydys identifie précisément ce que vous maîtrisez et ce qui manque.",ar:"تحدد Vydys ما تتقنه وما ينقصك.",en:"Vydys identifies what you know and what you still need."})],
    ["03",t({fr:"Apprenez & pratiquez",ar:"تعلّم وتدرّب",en:"Learn & practice"}),t({fr:"Cours, Classrooms, AI Tutor, labs et challenges pratiques.",ar:"دورات وفصول ومدرس ذكي ومختبرات وتحديات.",en:"Courses, Classrooms, AI Tutor, labs and practical challenges."})],
    ["04",t({fr:"Construisez des projets",ar:"ابنِ مشاريع",en:"Build projects"}),t({fr:"Passez de la théorie à des réalisations concrètes visibles.",ar:"حوّل النظرية إلى إنجازات ملموسة.",en:"Turn theory into concrete, visible work."})],
    ["05",t({fr:"Prouvez vos compétences",ar:"أثبت مهاراتك",en:"Prove your skills"}),t({fr:"Évaluations, projets approuvés et preuves dans votre Skills Passport.",ar:"تقييمات ومشاريع معتمدة وأدلة في جواز المهارات.",en:"Assessments, approved projects and evidence in your Skills Passport."})],
    ["06",t({fr:"Présentez votre valeur",ar:"اعرض قيمتك",en:"Show your value"}),t({fr:"Portfolio public, profil talent et préparation à l’emploi.",ar:"ملف عام وملف موهبة وتحضير للعمل.",en:"Public portfolio, talent profile and career readiness."})]
  ];

  return <>
    <section className="home-hero"><div className="container home-hero-grid">
      <div className="home-hero-copy">
        <div className="home-kicker"><span></span> VYDYS · AI & TECHNOLOGY LEARNING SYSTEM</div>
        <h1>{t({fr:"Apprenez la tech. Construisez. Prouvez ce que vous savez faire.",ar:"تعلّم التقنية. ابنِ. وأثبت ما تستطيع فعله.",en:"Learn tech. Build. Prove what you can do."})}</h1>
        <p>{t({
          fr:"Vydys est un écosystème international pour apprendre l’IA et les technologies émergentes, pratiquer dans de vrais labs, suivre des Classrooms live, construire des projets et transformer chaque progrès en preuve professionnelle.",
          ar:"Vydys منظومة دولية لتعلّم الذكاء الاصطناعي والتقنيات الحديثة والتدرب في مختبرات حقيقية وحضور فصول مباشرة وبناء مشاريع وتحويل كل تقدم إلى دليل مهني.",
          en:"Vydys is an international ecosystem for learning AI and emerging technologies, practicing in real labs, joining live Classrooms, building projects and turning every milestone into professional proof."
        })}</p>
        <div className="home-hero-actions">
          <Link className="btn home-primary-cta" href="/formations">{t({fr:"Commencer à apprendre",ar:"ابدأ التعلم",en:"Start learning"})}</Link>
          <Link className="btn btn-ghost home-secondary-cta" href="/classroom">{t({fr:"Découvrir les Classrooms",ar:"اكتشف الفصول",en:"Explore Classrooms"})}</Link>
        </div>
        <div className="home-proof-row">
          <div><strong>AI</strong><span>{t({fr:"Tutor personnel",ar:"مدرس شخصي",en:"Personal tutor"})}</span></div>
          <div><strong>LIVE</strong><span>{t({fr:"Classrooms intégrées",ar:"فصول مدمجة",en:"Integrated Classrooms"})}</span></div>
          <div><strong>LAB</strong><span>{t({fr:"Pratique réelle",ar:"تدريب حقيقي",en:"Hands-on practice"})}</span></div>
          <div><strong>✓</strong><span>{t({fr:"Preuves de compétences",ar:"أدلة مهارية",en:"Skill evidence"})}</span></div>
        </div>
      </div>

      <div className="home-product-stage">
        <div className="home-stage-glow"></div>
        <article className="home-product-shell">
          <div className="home-product-topbar"><div><i></i><i></i><i></i></div><span>vydys.com</span><b>V</b></div>
          <div className="home-product-body">
            <aside className="home-mini-sidebar">
              <img src="/vydys-icon.svg" alt=""/>
              <span className="active">◎</span><span>AI</span><span>LAB</span><span>✓</span>
            </aside>
            <div className="home-mini-main">
              <div className="home-mini-head"><div><small>{t({fr:"Votre objectif",ar:"هدفك",en:"Your goal"})}</small><strong>AI Engineer</strong></div><span>72%</span></div>
              <div className="home-skill-map">
                <div className="home-skill-ring"><span>72</span><small>Readiness</small></div>
                <div className="home-missions">
                  <span className="done">✓ Python fundamentals</span>
                  <span className="done">✓ API & JSON</span>
                  <span className="now">→ Build a RAG pipeline</span>
                  <span>○ Agent orchestration</span>
                </div>
              </div>
              <div className="home-live-card"><div><span>LIVE</span><strong>AI Agents · Cohort 08</strong><small>Session 4 · 19:00 GMT</small></div><button>{t({fr:"Rejoindre",ar:"انضم",en:"Join"})}</button></div>
              <div className="home-evidence-row"><div><span>✓</span><div><small>Verified Skill</small><strong>Python · Intermediate</strong></div></div><div><span>⌘</span><div><small>Project</small><strong>Support AI Agent</strong></div></div></div>
            </div>
          </div>
        </article>
      </div>
    </div></section>

    <section className="home-trust-strip"><div className="container">
      <span>{t({fr:"Un seul compte. Un parcours complet.",ar:"حساب واحد. مسار كامل.",en:"One account. One complete journey."})}</span>
      <div><b>COURSES</b><b>CLASSROOM</b><b>AI TUTOR</b><b>AI LAB</b><b>PRACTICE</b><b>SKILLS</b><b>PORTFOLIO</b></div>
    </div></section>

    <section className="section home-ecosystem"><div className="container">
      <div className="home-section-intro">
        <div><span className="eyebrow">{t({fr:"L’écosystème Vydys",ar:"منظومة Vydys",en:"The Vydys ecosystem"})}</span><h2>{t({fr:"Tout ce qu’il faut pour passer de l’apprentissage à la capacité réelle.",ar:"كل ما تحتاجه للانتقال من التعلم إلى القدرة الحقيقية.",en:"Everything you need to move from learning to real capability."})}</h2></div>
        <p>{t({fr:"Chaque produit Vydys est connecté au même profil, au même moteur de compétences et à la même progression.",ar:"كل منتجات Vydys مرتبطة بنفس الملف ومحرك المهارات والتقدم.",en:"Every Vydys product connects to the same profile, skills engine and progression."})}</p>
      </div>
      <div className="home-ecosystem-grid">{ecosystem.map((x,i)=><Link href={x.href} className={"home-ecosystem-card ecosystem-"+i} key={x.title}><span>{x.icon}</span><div><h3>{x.title}</h3><p>{x.text}</p><b>↗</b></div></Link>)}</div>
    </div></section>

    <section className="section home-journey"><div className="container">
      <div className="home-section-intro dark"><div><span className="eyebrow">{t({fr:"Le système Vydys",ar:"نظام Vydys",en:"The Vydys system"})}</span><h2>{t({fr:"Un parcours qui sait où vous allez et ce qu’il vous manque.",ar:"مسار يعرف إلى أين تتجه وما الذي ينقصك.",en:"A journey that knows where you are going and what you still need."})}</h2></div></div>
      <div className="home-journey-grid">{paths.map(([n,title,text])=><article key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </div></section>

    <section className="section home-classroom-showcase"><div className="container home-classroom-grid">
      <div>
        <span className="eyebrow">Vydys Classroom</span>
        <h2>{t({fr:"Le live learning, sans sortir de votre parcours.",ar:"تعلم مباشر دون مغادرة مسارك.",en:"Live learning without leaving your journey."})}</h2>
        <p>{t({fr:"Vidéo, partage d’écran, calendrier, présence automatique, chat, ressources et devoirs. Chaque séance reste liée à votre progression Vydys.",ar:"فيديو ومشاركة شاشة وجدول وحضور تلقائي ودردشة وموارد وواجبات وكل حصة مرتبطة بتقدمك على Vydys.",en:"Video, screen sharing, schedules, automatic attendance, chat, resources and assignments. Every session stays connected to your Vydys progress."})}</p>
        <div className="home-feature-pills"><span>Video Live</span><span>Screen Share</span><span>Attendance</span><span>Chat</span><span>Assignments</span><span>AI Ready</span></div>
        <Link className="btn" href="/classroom">{t({fr:"Voir les Classrooms",ar:"عرض الفصول",en:"Explore Classrooms"})}</Link>
      </div>
      <div className="home-classroom-preview">
        <div className="home-classroom-screen">
          <div className="home-video"><span>LIVE</span><div className="home-teacher-card"><b>Instructor</b><small>AI Agents · Session 04</small></div></div>
          <aside><div><strong>{t({fr:"Présence",ar:"الحضور",en:"Attendance"})}</strong><span>23/25</span></div><div><strong>{t({fr:"Chat",ar:"الدردشة",en:"Chat"})}</strong><small>12 new messages</small></div><div><strong>{t({fr:"Devoir",ar:"الواجب",en:"Assignment"})}</strong><small>Build a tool-calling agent</small></div></aside>
        </div>
      </div>
    </div></section>

    <section className="section home-practice-showcase"><div className="container">
      <div className="home-section-intro"><div><span className="eyebrow">Practice Suite</span><h2>{t({fr:"La théorie n’est qu’un début.",ar:"النظرية مجرد بداية.",en:"Theory is only the beginning."})}</h2></div><p>{t({fr:"Vydys vous fait pratiquer les outils et situations qui ressemblent au vrai travail.",ar:"تجعلك Vydys تتدرب على أدوات ومواقف تشبه العمل الحقيقي.",en:"Vydys lets you practice with tools and situations that resemble real work."})}</p></div>
      <div className="home-labs-marquee">{["Secure Runner","Python","JavaScript","SQL","API","Data","Prompt","RAG","Agents","Automation","Git","Cloud","Security","Interview","Peer Review"].map(x=><span key={x}>{x}</span>)}</div>
      <div className="home-practice-panels"><article><div className="code-window"><small>secure-runner.py</small><pre>{"def retrieve(query):\n    context = vector_search(query)\n    return llm.answer(query, context)\n\n# hidden tests\nassert retrieve('RAG') is not None"}</pre></div></article><article><span className="eyebrow">{t({fr:"Apprendre en faisant",ar:"تعلّم بالممارسة",en:"Learn by doing"})}</span><h3>{t({fr:"Des labs qui construisent une vraie compétence.",ar:"مختبرات تبني مهارة حقيقية.",en:"Labs that build real skill."})}</h3><p>{t({fr:"Écrivez du code, interrogez des bases SQL, testez des APIs, comparez des prompts, concevez des automations et entraînez-vous aux entretiens.",ar:"اكتب الكود واستعلم من SQL واختبر APIs وقارن البرومبت وصمم الأتمتة وتدرّب على المقابلات.",en:"Write code, query SQL databases, test APIs, compare prompts, design automations and practice interviews."})}</p><Link className="text-link" href="/practice">{t({fr:"Ouvrir Practice Hub",ar:"افتح Practice Hub",en:"Open Practice Hub"})} →</Link></article></div>
    </div></section>

    <section className="section home-evidence"><div className="container home-evidence-grid">
      <div>
        <span className="eyebrow">Skills Passport</span>
        <h2>{t({fr:"Un certificat dit que vous avez suivi. Une preuve montre ce que vous savez faire.",ar:"الشهادة تقول إنك تابعت. الدليل يوضح ما تستطيع فعله.",en:"A certificate says you attended. Evidence shows what you can do."})}</h2>
        <p>{t({fr:"Vydys relie vos évaluations, projets validés et compétences vérifiées à un profil professionnel que vous pouvez montrer.",ar:"تربط Vydys تقييماتك ومشاريعك المعتمدة ومهاراتك الموثقة بملف مهني يمكنك عرضه.",en:"Vydys connects assessments, approved projects and verified skills to a professional profile you can show."})}</p>
        <div className="home-evidence-actions"><Link className="btn" href="/competences">Skills Passport</Link><Link className="btn btn-ghost" href="/portfolio">Portfolio</Link></div>
      </div>
      <div className="home-passport-card">
        <div className="passport-head"><img src="/vydys-icon.svg" alt=""/><div><small>VYDYS SKILLS PASSPORT</small><strong>AI Engineer Path</strong></div><span>Verified</span></div>
        {[["Python","Intermediate","Verified"],["RAG Systems","Intermediate","Measured"],["API Integration","Advanced","Verified"],["AI Agents","Intermediate","Verified"]].map(x=><div className="passport-skill" key={x[0]}><div><strong>{x[0]}</strong><small>{x[1]}</small></div><span>{x[2]}</span></div>)}
      </div>
    </div></section>

    <section className="section home-audiences"><div className="container">
      <div className="home-section-intro"><div><span className="eyebrow">{t({fr:"Pour apprendre. Pour enseigner. Pour recruter.",ar:"للتعلم. للتدريس. للتوظيف.",en:"For learning. For teaching. For hiring."})}</span><h2>{t({fr:"Une plateforme pensée pour tout l’écosystème.",ar:"منصة مصممة لكل المنظومة.",en:"A platform built for the whole ecosystem."})}</h2></div></div>
      <div className="home-audience-grid">
        <article className="student"><span>01</span><h3>{t({fr:"Étudiants & professionnels",ar:"الطلاب والمهنيون",en:"Learners & professionals"})}</h3><p>{t({fr:"Apprenez, pratiquez, construisez et créez une preuve de vos compétences.",ar:"تعلّم وتدرّب وابنِ وأنشئ دليلاً على مهاراتك.",en:"Learn, practice, build and create evidence of your skills."})}</p><Link href="/formations">{t({fr:"Explorer les formations",ar:"استكشف الدورات",en:"Explore courses"})} →</Link></article>
        <article className="instructor"><span>02</span><h3>{t({fr:"Formateurs & experts",ar:"المدربون والخبراء",en:"Instructors & experts"})}</h3><p>{t({fr:"Vendez vos formations directement, créez des Classrooms live et développez votre marque.",ar:"بع دوراتك مباشرة وأنشئ فصولاً مباشرة وطوّر علامتك.",en:"Sell courses directly, run live Classrooms and grow your teaching brand."})}</p><Link href="/devenir-formateur">{t({fr:"Enseigner sur Vydys",ar:"درّس على Vydys",en:"Teach on Vydys"})} →</Link></article>
        <article className="business"><span>03</span><h3>{t({fr:"Entreprises & talents",ar:"الشركات والمواهب",en:"Companies & talent"})}</h3><p>{t({fr:"Identifiez des profils avec des compétences visibles, mesurées et prouvées.",ar:"اكتشف ملفات بمهارات مرئية ومقاسة ومثبتة.",en:"Discover profiles with visible, measured and proven skills."})}</p><Link href="/formateurs">{t({fr:"Découvrir l’écosystème",ar:"اكتشف المنظومة",en:"Discover the ecosystem"})} →</Link></article>
      </div>
    </div></section>

    <section className="home-final-cta"><div className="container"><div>
      <span className="eyebrow">VYDYS</span>
      <h2>{t({fr:"Le futur du travail se construit maintenant.",ar:"مستقبل العمل يُبنى الآن.",en:"The future of work is being built now."})}</h2>
      <p>{t({fr:"Commencez par une compétence. Repartez avec une capacité démontrable.",ar:"ابدأ بمهارة واخرج بقدرة يمكنك إثباتها.",en:"Start with a skill. Leave with a capability you can prove."})}</p>
      <div><Link className="btn" href="/formations">{t({fr:"Commencer maintenant",ar:"ابدأ الآن",en:"Start now"})}</Link><Link className="btn btn-ghost" href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"})}</Link></div>
    </div></div></section>
  </>;
}
