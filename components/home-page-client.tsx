"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import type { FeaturedCourse } from "./home-growth";

type CourseModulePreview = { fr:string; ar:string|null; en:string|null };
export type PremiumCourse = FeaturedCourse & {
  instructor_name:string|null;
  instructor_slug:string|null;
  module_preview:CourseModulePreview[];
};

type Goal="learn"|"practice"|"teach";

const joinHref="/connexion?mode=register&utm_source=homepage&utm_medium=cta&utm_campaign=free_account";
const shareHref="https://www.vydys.com/?utm_source=community&utm_medium=share&utm_campaign=discover_vydys";

export default function HomePageClient({featuredCourses}:{featuredCourses:PremiumCourse[]}){
  const {lang,t}=useLanguage();
  const [goal,setGoal]=useState<Goal>("learn");
  const [shareStatus,setShareStatus]=useState<"idle"|"copied"|"failed">("idle");
  const locale=lang==="ar"?"ar-MR":lang==="fr"?"fr-FR":"en-GB";

  const goals=[
    {
      id:"learn" as Goal,number:"01",
      label:t({fr:"Je veux apprendre",ar:"أريد أن أتعلم",en:"I want to learn"}),
      title:t({fr:"Trouvez la formation qui vous fait avancer.",ar:"اختر الدورة التي تساعدك على التقدم.",en:"Find the course that moves you forward."}),
      detail:t({
        fr:"Découvrez le programme, le tarif, le formateur et les sessions avant de vous inscrire.",
        ar:"اطّلع على البرنامج والسعر والمدرب والحصص قبل التسجيل.",
        en:"Explore the curriculum, price, instructor and live sessions before enrolling."
      }),
      to:"/formations",
      cta:t({fr:"Explorer les formations",ar:"استكشف الدورات",en:"Explore courses"}),
      points:[
        t({fr:"Programmes détaillés",ar:"برامج واضحة",en:"Clear curricula"}),
        t({fr:"Cours en direct",ar:"حصص مباشرة",en:"Live classes"}),
        t({fr:"Progression personnelle",ar:"تقدم شخصي",en:"Personal progress"})
      ]
    },
    {
      id:"practice" as Goal,number:"02",
      label:t({fr:"Je veux pratiquer",ar:"أريد أن أتدرب",en:"I want to practice"}),
      title:t({fr:"Mettez vos connaissances à l’épreuve.",ar:"حوّل ما تتعلمه إلى ممارسة.",en:"Turn what you know into hands-on work."}),
      detail:t({
        fr:"Testez vos compétences avec des exercices de code, SQL, API et des défis pratiques.",
        ar:"طوّر مهاراتك عبر تمارين البرمجة وSQL وAPI والتحديات التطبيقية.",
        en:"Strengthen your skills with code, SQL, API and practical challenges."
      }),
      to:"/practice",
      cta:t({fr:"Découvrir Practice Hub",ar:"استكشف مركز التدريب",en:"Explore Practice Hub"}),
      points:["Code & SQL","API & AI",t({fr:"Défis pratiques",ar:"تحديات عملية",en:"Practical challenges"})]
    },
    {
      id:"teach" as Goal,number:"03",
      label:t({fr:"Je veux enseigner",ar:"أريد أن أدرّس",en:"I want to teach"}),
      title:t({fr:"Partagez votre expertise. Développez votre activité.",ar:"شارك خبرتك وطوّر نشاطك التعليمي.",en:"Share your expertise. Grow your teaching business."}),
      detail:t({
        fr:"Créez des cours, organisez des Classroom et gérez votre activité depuis un seul espace.",
        ar:"أنشئ الدورات والفصول المباشرة وأدر نشاطك في مكان واحد.",
        en:"Create courses, host live Classrooms and manage your work from one place."
      }),
      to:"/devenir-formateur",
      cta:t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"}),
      points:[
        t({fr:"Création de cours",ar:"إنشاء الدورات",en:"Course creation"}),
        "Classroom",
        t({fr:"Espace de gestion",ar:"لوحة الإدارة",en:"Instructor dashboard"})
      ]
    }
  ];
  const selected=goals.find(x=>x.id===goal)||goals[0];

  const tools=[
    {
      icon:"✦",accent:"violet",name:"Vydys AI Tutor",href:"/ai-tutor",
      detail:t({fr:"Posez vos questions, clarifiez un concept et avancez avec un tuteur IA.",ar:"اطرح أسئلتك وافهم المفاهيم بمساعدة المدرس الذكي.",en:"Ask questions, understand concepts and learn with an AI tutor."}),
      label:t({fr:"Comprendre",ar:"الفهم",en:"Understand"})
    },
    {
      icon:"{ }",accent:"blue",name:"Practice Hub",href:"/practice",
      detail:t({fr:"Entraînez-vous en code, SQL et API sur des exercices concrets.",ar:"تدرّب على البرمجة وSQL وAPI من خلال تمارين عملية.",en:"Practice coding, SQL and APIs through real exercises."}),
      label:t({fr:"Pratiquer",ar:"التطبيق",en:"Practice"})
    },
    {
      icon:"◇",accent:"cyan",name:"Vydys AI Lab",href:"/ai-lab",
      detail:t({fr:"Expérimentez avec les outils IA, les agents et les bases de connaissances.",ar:"جرّب أدوات الذكاء الاصطناعي والوكلاء وقواعد المعرفة.",en:"Explore AI tools, agents and knowledge workflows."}),
      label:t({fr:"Explorer",ar:"الاستكشاف",en:"Explore"})
    },
    {
      icon:"↗",accent:"mint",name:"Skill Engine",href:"/skill-engine",
      detail:t({fr:"Identifiez les compétences à acquérir pour atteindre votre objectif.",ar:"حدّد المهارات التي تحتاجها للوصول إلى هدفك.",en:"Find the skills to develop for your next goal."}),
      label:t({fr:"Progresser",ar:"التقدم",en:"Grow"})
    }
  ];

  function courseTitle(c:PremiumCourse){
    return (lang==="ar"?c.title_ar||c.title_fr||c.title_en:
      lang==="en"?c.title_en||c.title_fr||c.title_ar:c.title_fr||c.title_en||c.title_ar)||"Vydys";
  }
  function courseDescription(c:PremiumCourse){
    const raw=(lang==="ar"?c.description_ar||c.description_fr||c.description_en:
      lang==="en"?c.description_en||c.description_fr||c.description_ar:
        c.description_fr||c.description_en||c.description_ar)||"";
    // One-line excerpts avoid overflowing cards, without cutting words mid-line.
    const clean=raw.replace(/[\r\n]+/g," ").replace(/\s+/g," ").trim();
    return clean.length>130?clean.slice(0,128).trimEnd()+"…":clean;
  }
  function moduleTitle(module:CourseModulePreview){
    return (lang==="ar"?module.ar||module.fr||module.en:
      lang==="en"?module.en||module.fr||module.ar:module.fr||module.en||module.ar)||"";
  }
  const money=(course:PremiumCourse)=>{
    try{return new Intl.NumberFormat(locale,{style:"currency",currency:course.currency,maximumFractionDigits:0}).format(course.price)}
    catch{return new Intl.NumberFormat("fr-FR").format(course.price)+" "+course.currency}
  };
  const dateLabel=(date:string)=>{
    const parsed=new Date(date+"T12:00:00Z");
    if(!Number.isFinite(parsed.getTime()))return date;
    return new Intl.DateTimeFormat(locale,{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(parsed);
  };
  const enrolledOpen=(date:string|null)=>!date||date>=new Date().toISOString().slice(0,10);
  const featured=useMemo(()=>featuredCourses.filter(course=>Boolean(course.slug)).slice(0,3),[featuredCourses]);
  const heroCourse=featured.find(course=>enrolledOpen(course.registration_deadline))||featured[0]||null;

  const shareText=t({
    fr:"Découvrez Vydys : formations en IA, cours en direct, outils pratiques et portfolio pour développer vos compétences.",
    ar:"اكتشف Vydys: دورات الذكاء الاصطناعي، الفصول المباشرة، أدوات التدريب وملف المهارات.",
    en:"Discover Vydys: AI courses, live classes, hands-on tools and a portfolio to develop real skills."
  });

  async function share(){
    setShareStatus("idle");
    if(typeof navigator!=="undefined"&&navigator.share){
      try{await navigator.share({title:"Vydys Academy",text:shareText,url:shareHref});return}
      catch(e){if(e instanceof Error&&e.name==="AbortError")return}
    }
    try{await navigator.clipboard.writeText(shareText+"\n"+shareHref);setShareStatus("copied")}
    catch{setShareStatus("failed")}
  }

  return <div className="v4-home">
    <section className="v4-hero" aria-labelledby="v4-hero-title">
      <div className="v4-hero-glow v4-hero-glow-one" aria-hidden="true"/>
      <div className="v4-hero-glow v4-hero-glow-two" aria-hidden="true"/>
      <div className="container v4-hero-grid">
        <div className="v4-hero-copy">
          <div className="v4-overline"><span className="v4-live-dot"/> {t({
            fr:"VYDYS — APPRENDRE, CRÉER, PROGRESSER",
            ar:"VYDYS — تعلّم، أنجز، تطوّر",
            en:"VYDYS — LEARN, BUILD, GROW"
          })}</div>
          <h1 id="v4-hero-title">{t({
            fr:"Apprenez l’IA. Passez à la pratique.",
            ar:"تعلّم الذكاء الاصطناعي. وطبّق ما تتعلمه.",
            en:"Learn AI. Put it into practice."
          })} <span>{t({fr:"Construisez votre avenir.",ar:"وابنِ مستقبلك.",en:"Build what comes next."})}</span></h1>
          <p>{t({
            fr:"Formations en ligne, cours en direct et outils IA dans une seule plateforme. Apprenez à votre rythme, réalisez des projets et développez des compétences concrètes.",
            ar:"دورات عبر الإنترنت، حصص مباشرة وأدوات ذكاء اصطناعي في منصة واحدة. تعلّم حسب وتيرتك وأنجز مشاريع وطوّر مهارات عملية.",
            en:"Online courses, live classes and AI tools in one place. Learn at your pace, build projects and develop skills you can use."
          })}</p>
          <div className="v4-hero-actions">
            <Link className="v4-btn v4-btn-primary" href={joinHref}>
              {t({fr:"Commencer gratuitement",ar:"ابدأ مجاناً",en:"Get started for free"})} <span aria-hidden="true">↗</span>
            </Link>
            <Link className="v4-btn v4-btn-outline" href="/formations">
              {t({fr:"Voir les formations",ar:"تصفح الدورات",en:"Browse courses"})} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="v4-hero-disclaimer">{t({
            fr:"Compte gratuit · Formations payantes identifiées clairement · Français, العربية, English",
            ar:"حساب مجاني · أسعار الدورات المدفوعة واضحة · Français, العربية, English",
            en:"Free account · Paid courses clearly priced · Français, العربية, English"
          })}</p>
          <div className="v4-hero-quicklinks" aria-label={t({fr:"Découvrir les outils Vydys",ar:"اكتشف أدوات Vydys",en:"Explore Vydys tools"})}>
            <span>{t({fr:"À découvrir :",ar:"اكتشف:",en:"Explore:"})}</span>
            <Link href="/ai-tutor">AI Tutor ↗</Link>
            <Link href="/practice">Practice Hub ↗</Link>
            <Link href="/classroom">Classroom ↗</Link>
          </div>
        </div>
        <div className="v4-hero-visual">
          <div className="v4-orbit v4-orbit-a" aria-hidden="true"/><div className="v4-orbit v4-orbit-b" aria-hidden="true"/>
          <div className="v4-browser-frame">
            <div className="v4-browser-top">
              <span className="v4-browser-dots" aria-hidden="true"><i/><i/><i/></span>
              <span>vydys.com / {t({fr:"formations",ar:"الدورات",en:"courses"})}</span>
              <span className="v4-browser-lock" aria-hidden="true">✦</span>
            </div>
            {heroCourse?<div className="v4-browser-content">
              <div className="v4-course-topline">
                <span className="v4-course-indicator"><span className="v4-live-dot"/>{t({fr:"Formation publiée",ar:"دورة منشورة",en:"Published course"})}</span>
                <span>VYDYS ACADEMY</span>
              </div>
              <div className="v4-browser-glyph" aria-hidden="true"><span>V</span><i/></div>
              <div className="v4-browser-course">
                <span className="v4-window-kicker">{t({fr:"Découvrez un cours réel",ar:"اكتشف دورة حقيقية",en:"Explore a real course"})}</span>
                <h2>{courseTitle(heroCourse)}</h2>
                {heroCourse.instructor_name&&<p>{t({fr:"Avec",ar:"مع",en:"With"})} {heroCourse.instructor_name}</p>}
                <div className="v4-browser-modules">
                  {(heroCourse.module_preview||[]).slice(0,3).map((module,i)=>
                    <div key={i}><span>{String(i+1).padStart(2,"0")}</span><span>{moduleTitle(module)}</span><span aria-hidden="true">✓</span></div>)}
                  {!heroCourse.module_preview?.length&&<div><span>✓</span>{heroCourse.modules} {t({fr:"modules à découvrir",ar:"وحدات للتعلم",en:"modules to explore"})}</div>}
                </div>
                <div className="v4-browser-bottom">
                  <div><small>{t({fr:"Tarif de cette formation",ar:"سعر هذه الدورة",en:"Course price"})}</small><strong>{money(heroCourse)}</strong></div>
                  <Link href={"/formation/"+encodeURIComponent(heroCourse.slug)} aria-label={t({fr:"Voir la formation",ar:"عرض الدورة",en:"View course"})+": "+courseTitle(heroCourse)}>↗</Link>
                </div>
              </div>
            </div>:<div className="v4-browser-empty">
              <span aria-hidden="true">◇</span>
              <h2>Vydys Academy</h2>
              <p>{t({fr:"Explorez les parcours d’apprentissage et les outils IA.",ar:"استكشف مسارات التعلم وأدوات الذكاء الاصطناعي.",en:"Explore learning paths and AI tools."})}</p>
              <Link href="/formations">{t({fr:"Découvrir les cours",ar:"استكشف الدورات",en:"Explore courses"})} →</Link>
            </div>}
          </div>
          <div className="v4-hero-float v4-hero-float-top"><span aria-hidden="true">✧</span><div><strong>Vydys AI Tutor</strong><small>{t({fr:"Apprendre avec l’IA",ar:"التعلم بمساعدة الذكاء الاصطناعي",en:"Learn with AI"})}</small></div></div>
          <div className="v4-hero-float v4-hero-float-bottom"><span aria-hidden="true">{"{ }"}</span><div><strong>Practice Hub</strong><small>Code · SQL · API</small></div></div>
          <span className="v4-preview-honesty">{t({
            fr:"Aperçu d’une formation publiée sur Vydys",
            ar:"عرض لدورة منشورة على Vydys",
            en:"Preview of a published Vydys course"
          })}</span>
        </div>
      </div>
    </section>

    <section className="v4-value-strip" aria-label={t({fr:"Les avantages Vydys",ar:"مزايا Vydys",en:"Why Vydys"})}>
      <div className="container v4-value-grid">
        {[
          ["01",t({fr:"Apprendre à son rythme",ar:"تعلّم حسب وتيرتك",en:"Learn at your pace"})],
          ["02",t({fr:"Pratiquer avec l’IA",ar:"تدرّب بمساعدة الذكاء الاصطناعي",en:"Practice with AI"})],
          ["03",t({fr:"Échanger en direct",ar:"تفاعل في الفصول المباشرة",en:"Learn together live"})],
          ["04",t({fr:"Montrer ses réalisations",ar:"اعرض إنجازاتك",en:"Show what you build"})]
        ].map(([n,text])=><div key={n}><span>{n}</span><strong>{text}</strong></div>)}
      </div>
    </section>

    <section className="v4-section v4-journey" id="commencer" aria-labelledby="v4-journey-title">
      <div className="container">
        <div className="v4-section-heading v4-section-heading-center">
          <span className="v4-kicker">{t({fr:"Votre parcours commence ici",ar:"ابدأ رحلتك هنا",en:"Your journey starts here"})}</span>
          <h2 id="v4-journey-title">{t({fr:"Qu’aimeriez-vous accomplir ?",ar:"ماذا تريد أن تحقق؟",en:"What would you like to achieve?"})}</h2>
          <p>{t({fr:"Trois chemins simples pour explorer Vydys selon votre objectif.",ar:"ثلاثة مسارات بسيطة لاكتشاف Vydys حسب هدفك.",en:"Three simple ways to explore Vydys, based on your goal."})}</p>
        </div>
        <div className="v4-goal-tabs" role="group" aria-label={t({fr:"Choisissez votre objectif",ar:"اختر هدفك",en:"Choose your goal"})}>
          {goals.map(item=><button type="button" key={item.id} aria-pressed={goal===item.id} className={goal===item.id?"selected":""} onClick={()=>setGoal(item.id)}>
            <span>{item.number}</span>{item.label}
          </button>)}
        </div>
        <div className="v4-goal-panel" aria-live="polite">
          <div className="v4-goal-content">
            <span>{t({fr:"Votre prochaine étape",ar:"خطوتك القادمة",en:"Your next step"})}</span>
            <h3>{selected.title}</h3><p>{selected.detail}</p>
            <Link className="v4-btn v4-btn-primary" href={selected.to}>{selected.cta} <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="v4-goal-points">
            {selected.points.map((point,i)=><div key={point}><span>0{i+1}</span><strong>{point}</strong><span aria-hidden="true">✓</span></div>)}
          </div>
        </div>
      </div>
    </section>

    <section className="v4-section v4-tools" id="outils" aria-labelledby="v4-tools-title">
      <div className="container">
        <div className="v4-section-heading v4-section-heading-split">
          <div><span className="v4-kicker">{t({fr:"Vos outils pour progresser",ar:"أدوات تساعدك على التقدم",en:"Tools that help you grow"})}</span>
            <h2 id="v4-tools-title">{t({fr:"Plus qu’une plateforme de cours.",ar:"أكثر من مجرد منصة دورات.",en:"More than a course platform."})}</h2>
          </div>
          <div><p>{t({fr:"Découvrez les outils déjà disponibles sur Vydys pour apprendre, essayer et construire.",ar:"اكتشف الأدوات المتوفرة على Vydys للتعلم والتجربة والإنجاز.",en:"Explore the tools already available on Vydys to learn, experiment and build."})}</p>
            <small>{t({fr:"L’accès à certaines fonctions nécessite un compte ; les éventuelles limites sont précisées dans chaque outil.",ar:"تتطلب بعض الوظائف حساباً؛ وتُعرض شروط الاستخدام داخل كل أداة.",en:"Some features require an account; each tool explains any applicable limits."})}</small>
          </div>
        </div>
        <div className="v4-tools-grid">
          {tools.map((tool,i)=><Link className={"v4-tool-card v4-tool-"+tool.accent} href={tool.href} key={tool.name}>
            <div className="v4-tool-top"><span className="v4-tool-symbol" aria-hidden="true">{tool.icon}</span><span className="v4-tool-number">0{i+1} / 04</span></div>
            <span className="v4-tool-category">{tool.label}</span>
            <h3>{tool.name}</h3><p>{tool.detail}</p><span className="v4-tool-action">{t({fr:"Découvrir l’outil",ar:"اكتشف الأداة",en:"Explore the tool"})} <span aria-hidden="true">↗</span></span>
          </Link>)}
        </div>
      </div>
    </section>

    <section className="v4-section v4-courses" id="formations" aria-labelledby="v4-courses-title">
      <div className="container">
        <div className="v4-section-heading v4-section-heading-split">
          <div><span className="v4-kicker">{t({fr:"Formations en ligne",ar:"دورات عبر الإنترنت",en:"Online courses"})}</span>
            <h2 id="v4-courses-title">{t({fr:"Choisissez ce que vous allez apprendre.",ar:"اختر ما تريد تعلمه.",en:"Choose what you'll learn next."})}</h2></div>
          <Link className="v4-text-link" href="/formations">{t({fr:"Voir toutes les formations",ar:"تصفح جميع الدورات",en:"Browse all courses"})} <span aria-hidden="true">↗</span></Link>
        </div>
        {featured.length?<div className="v4-course-grid">{featured.map((course,i)=>
          <article className="v4-featured-course" key={course.id}>
            <div className={"v4-featured-art v4-art-"+i%3}>
              <span>VYDYS <b>ACADEMY</b></span>
              <span className="v4-featured-art-mark" aria-hidden="true">{i===0?"AI":i===1?"01":"✧"}</span>
              <span>{t({fr:"FORMATION EN LIGNE",ar:"دورة عبر الإنترنت",en:"ONLINE COURSE"})}</span>
            </div>
            <div className="v4-featured-body">
              <div className="v4-course-meta">
                <span>{course.modules} {t({fr:"modules",ar:"وحدات",en:"modules"})}</span>
                {course.registration_deadline&&<span className={enrolledOpen(course.registration_deadline)?"":"v4-closed"}>{enrolledOpen(course.registration_deadline)
                  ?t({fr:"Jusqu’au",ar:"حتى",en:"Until"})+" "+dateLabel(course.registration_deadline)
                  :t({fr:"Inscriptions closes",ar:"التسجيل مغلق",en:"Enrollment closed"})}</span>}
              </div>
              <h3>{courseTitle(course)}</h3>
              <p>{courseDescription(course)}</p>
              {course.instructor_name&&<div className="v4-course-teacher">
                <span aria-hidden="true">{course.instructor_name.trim().charAt(0).toUpperCase()}</span>
                {course.instructor_slug?<Link href={"/formateur/"+encodeURIComponent(course.instructor_slug)}>{course.instructor_name}</Link>
                  :<span>{course.instructor_name}</span>}
              </div>}
              <div className="v4-course-footer">
                <div><small>{t({fr:"Tarif",ar:"السعر",en:"Price"})}</small><strong>{money(course)}</strong></div>
                <Link href={"/formation/"+encodeURIComponent(course.slug)} aria-label={t({fr:"Voir la formation",ar:"عرض الدورة",en:"View course"})+": "+courseTitle(course)}>
                  {t({fr:"Voir le programme",ar:"عرض البرنامج",en:"View curriculum"})} <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </article>
        )}</div>:<div className="v4-empty-courses">
          <p>{t({fr:"De nouveaux programmes seront annoncés dans le catalogue.",ar:"ستُعلن برامج جديدة في قائمة الدورات.",en:"New programs will be announced in the course catalog."})}</p>
          <Link href="/formations">{t({fr:"Voir le catalogue",ar:"تصفح الدورات",en:"Visit the catalog"})} →</Link>
        </div>}
      </div>
    </section>

    <section className="v4-section v4-experience" aria-labelledby="v4-experience-title">
      <div className="container v4-experience-grid">
        <div className="v4-experience-copy">
          <span className="v4-kicker">{t({fr:"Une vraie expérience d’apprentissage",ar:"تجربة تعلم متكاملة",en:"A connected learning experience"})}</span>
          <h2 id="v4-experience-title">{t({fr:"Apprenez. Échangez. Mettez en pratique.",ar:"تعلّم. تفاعل. طبّق.",en:"Learn. Connect. Put it to work."})}</h2>
          <p>{t({fr:"Une Classroom pour échanger avec votre formateur, des exercices pour vous entraîner et un portfolio pour présenter vos projets : votre parcours reste connecté.",ar:"فصول مباشرة للتفاعل مع المدرب وتمارين للتطبيق وملف إنجازات لعرض مشاريعك، ضمن رحلة تعلم مترابطة.",en:"Live Classrooms with instructors, hands-on practice and a portfolio for your projects — one connected journey."})}</p>
          <div className="v4-experience-points">
            <div><span>↗</span><div><strong>Vydys Classroom</strong><small>{t({fr:"Cours en direct, calendrier et ressources",ar:"حصص مباشرة وجدول وموارد",en:"Live classes, calendar and resources"})}</small></div></div>
            <div><span>⌘</span><div><strong>Skills Passport</strong><small>{t({fr:"Compétences, évaluations et projets",ar:"مهارات وتقييمات ومشاريع",en:"Skills, assessments and projects"})}</small></div></div>
          </div>
          <div className="v4-experience-actions">
            <Link className="v4-btn v4-btn-primary" href="/classroom">{t({fr:"Découvrir les Classrooms",ar:"استكشف الفصول",en:"Explore Classrooms"})} ↗</Link>
            <Link className="v4-text-link" href="/portfolio">{t({fr:"Voir le portfolio",ar:"عرض ملف الإنجازات",en:"See the portfolio"})} →</Link>
          </div>
        </div>
        <div className="v4-experience-visual">
          <div className="v4-experience-window">
            <div className="v4-experience-window-head"><span aria-hidden="true">●</span><span>VYDYS / CLASSROOM</span><span aria-hidden="true">⋮</span></div>
            <div className="v4-video-stage">
              <span>CLASSROOM</span>
              <div className="v4-video-symbol" aria-hidden="true">▶</div>
              <strong>{t({fr:"Apprenez ensemble, même à distance.",ar:"تعلّموا معاً من أي مكان.",en:"Learn together, wherever you are."})}</strong>
            </div>
            <div className="v4-experience-window-foot">
              <div><span aria-hidden="true">▣</span>{t({fr:"Ressources",ar:"موارد",en:"Resources"})}</div>
              <div><span aria-hidden="true">☷</span>{t({fr:"Devoirs",ar:"واجبات",en:"Assignments"})}</div>
              <div><span aria-hidden="true">◷</span>{t({fr:"Calendrier",ar:"تقويم",en:"Calendar"})}</div>
            </div>
          </div>
          <span className="v4-experience-note">{t({fr:"Illustration des fonctions Classroom",ar:"رسم توضيحي لميزات Classroom",en:"Illustration of Classroom features"})}</span>
        </div>
      </div>
    </section>

    <section className="v4-talents-banner" aria-labelledby="v4-talents-title">
      <div className="container v4-talents-grid">
        <div className="v4-talents-icon" aria-hidden="true"><span>◎</span><span>CV</span></div>
        <div>
          <span className="v4-kicker">VYDYS TALENTS</span>
          <h2 id="v4-talents-title">{t({fr:"Vos compétences méritent d’être découvertes.",ar:"مهاراتك تستحق أن يكتشفها الآخرون.",en:"Your skills deserve to be discovered."})}</h2>
          <p>{t({
            fr:"Créez votre CV numérique, ajoutez diplômes, expériences et projets, puis choisissez si les recruteurs peuvent vous trouver dans notre annuaire.",
            ar:"أنشئ سيرتك الذاتية الرقمية وأضف الشهادات والخبرات والمشاريع، ثم اختر إن كنت ترغب بالظهور أمام أصحاب العمل.",
            en:"Build your digital CV with education, experience and projects — then choose whether recruiters can find you in our directory."
          })}</p>
        </div>
        <div className="v4-talents-actions">
          <Link className="v4-btn v4-btn-primary" href="/talents">{t({fr:"Découvrir les talents",ar:"استكشف المواهب",en:"Explore talents"})} ↗</Link>
          <Link href="/portfolio" className="v4-talents-secondary">{t({fr:"Créer mon CV",ar:"أنشئ سيرتي الذاتية",en:"Create my CV"})} →</Link>
        </div>
      </div>
    </section>

    <section className="v4-section v4-instructor" aria-labelledby="v4-instructor-title">
      <div className="container v4-instructor-grid">
        <div className="v4-instructor-icon" aria-hidden="true"><span>V</span><span>+</span></div>
        <div><span className="v4-kicker">{t({fr:"Vous avez quelque chose à transmettre ?",ar:"هل لديك خبرة تريد مشاركتها؟",en:"Have something worth teaching?"})}</span>
          <h2 id="v4-instructor-title">{t({fr:"Votre expertise mérite son propre espace.",ar:"خبرتك تستحق منصتها الخاصة.",en:"Your expertise deserves its own space."})}</h2>
          <p>{t({fr:"Créez vos cours, organisez des séances en direct et gérez vos apprenants depuis Vydys. Vous gardez la maîtrise de votre contenu et de votre activité.",ar:"أنشئ دوراتك ونظّم الحصص المباشرة وأدر طلابك عبر Vydys. أنت تتحكم في محتواك ونشاطك.",en:"Create courses, host live sessions and manage your learners on Vydys. Keep control of your content and teaching activity."})}</p>
        </div>
        <Link className="v4-btn v4-btn-light" href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"})} <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <section className="v4-section v4-faq" aria-labelledby="v4-faq-title">
      <div className="container v4-faq-grid">
        <div><span className="v4-kicker">{t({fr:"Avant de commencer",ar:"قبل أن تبدأ",en:"Before you begin"})}</span>
          <h2 id="v4-faq-title">{t({fr:"Quelques réponses, pour avancer sereinement.",ar:"إجابات تساعدك على البدء بثقة.",en:"A few answers to get you started."})}</h2></div>
        <div className="v4-faq-questions">
          {[
            {
              q:t({fr:"Est-ce gratuit de créer un compte ?",ar:"هل إنشاء الحساب مجاني؟",en:"Is creating an account free?"}),
              a:t({fr:"Oui, la création de compte est gratuite. Certaines fonctionnalités peuvent nécessiter une connexion et les formations payantes affichent leurs tarifs avant inscription.",ar:"نعم، إنشاء الحساب مجاني. قد تتطلب بعض الأدوات تسجيل الدخول، وتُعرض أسعار الدورات المدفوعة قبل التسجيل.",en:"Yes, creating an account is free. Some tools require sign-in, and paid courses show their prices before enrollment."})
            },{
              q:t({fr:"Comment se déroulent les formations ?",ar:"كيف تجري الدورات؟",en:"How do courses work?"}),
              a:t({fr:"Chaque fiche de formation indique son programme, son formateur, son prix et les séances disponibles. Les cours peuvent combiner leçons et Classroom en direct.",ar:"توضح كل صفحة دورة برنامجها ومدربها وسعرها والحصص المتاحة، ويمكن الجمع بين الدروس والفصول المباشرة.",en:"Each course page lists its curriculum, instructor, price and available sessions. Learning may include lessons and live Classrooms."})
            },{
              q:t({fr:"Puis-je utiliser Vydys sur mobile ?",ar:"هل يمكن استخدام Vydys عبر الهاتف؟",en:"Can I use Vydys on my phone?"}),
              a:t({fr:"Oui, Vydys fonctionne sur navigateur mobile et peut être installé comme application web lorsque le navigateur le permet.",ar:"نعم، يعمل Vydys عبر متصفح الهاتف، ويمكن تثبيته كتطبيق ويب إذا كان المتصفح يدعم ذلك.",en:"Yes. Vydys works in a mobile browser and can be installed as a web app when your browser supports it."})
            }
          ].map((item,i)=><details key={i}><summary><span>{item.q}</span><span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}
        </div>
      </div>
    </section>

    <section className="v4-close" aria-labelledby="v4-close-title">
      <div className="container v4-close-inner">
        <div><span className="v4-kicker">VYDYS ACADEMY</span>
          <h2 id="v4-close-title">{t({fr:"Votre prochain chapitre commence ici.",ar:"فصلك القادم يبدأ هنا.",en:"Your next chapter starts here."})}</h2>
          <p>{t({fr:"Créez votre compte gratuit et découvrez les formations et les outils qui vous feront progresser.",ar:"أنشئ حسابك المجاني واكتشف الدورات والأدوات التي تدعم تطورك.",en:"Create your free account and discover courses and tools that help you grow."})}</p></div>
        <div className="v4-close-actions">
          <Link className="v4-btn v4-btn-primary" href={joinHref}>{t({fr:"Créer mon compte",ar:"إنشاء حسابي",en:"Create my account"})} ↗</Link>
          <button type="button" className="v4-share-btn" onClick={()=>void share()}>{shareStatus==="copied"
            ?t({fr:"Lien copié",ar:"تم نسخ الرابط",en:"Link copied"})
            :t({fr:"Partager Vydys",ar:"شارك Vydys",en:"Share Vydys"})} <span aria-hidden="true">↗</span></button>
          <a className="v4-whatsapp" href={"https://wa.me/?text="+encodeURIComponent(shareText+"\n"+shareHref)} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
          {shareStatus==="failed"&&<p role="status" className="v4-share-fallback">{t({fr:"Copiez ce lien :",ar:"انسخ الرابط:",en:"Copy this link:"})} <a href={shareHref}>{shareHref}</a></p>}
          {shareStatus==="copied"&&<span role="status" className="v4-share-fallback">{t({fr:"Prêt à être partagé.",ar:"جاهز للمشاركة.",en:"Ready to share."})}</span>}
        </div>
      </div>
    </section>
  </div>;
}
