"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";

type HubItem={
  icon:string;
  title:string;
  category:"learn"|"live"|"practice"|"ai"|"proof"|"people";
  href:string;
  tags:string[];
  description:{fr:string;ar:string;en:string};
};

export default function VydysHubPage(){
  const {t}=useLanguage();
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");

  const items:HubItem[]=[
    {icon:"COURSE",title:t({fr:"Formations",ar:"الدورات",en:"Courses"}),category:"learn",href:"/formations",tags:["AI","Tech","Learning"],description:{fr:"Cours structurés, orientés pratique et créés par des formateurs Vydys.",ar:"دورات منظمة وعملية يقدمها مدربو Vydys.",en:"Structured, practical courses created by Vydys instructors."}},
    {icon:"LIVE",title:"Vydys Classroom",category:"live",href:"/classroom",tags:["Live","Cohort","Mentoring"],description:{fr:"Cohortes live avec calendrier, sessions, ressources, présence et devoirs.",ar:"فصول مباشرة مع جدول وجلسات وموارد وحضور وواجبات.",en:"Live cohorts with schedules, sessions, resources, attendance and assignments."}},
    {icon:"LAB",title:"Practice Hub",category:"practice",href:"/practice",tags:["Code","SQL","API","Cloud"],description:{fr:"Pratiquez avec des labs techniques proches du travail réel.",ar:"تدرّب في مختبرات تقنية تشبه بيئة العمل الحقيقية.",en:"Practice in technical labs designed around real-world work."}},
    {icon:"AI",title:"AI Lab",category:"ai",href:"/ai-lab",tags:["Agents","RAG","Prompt","Automation"],description:{fr:"Construisez et expérimentez avec les outils IA modernes.",ar:"ابنِ وجرّب أدوات الذكاء الاصطناعي الحديثة.",en:"Build and experiment with modern AI tools."}},
    {icon:"SKILL",title:"Skill Engine",category:"proof",href:"/skill-engine",tags:["Assessment","Career","Skills"],description:{fr:"Mesurez votre niveau, vos écarts et les prochaines compétences à développer.",ar:"قِس مستواك وفجواتك والمهارات التالية التي تحتاجها.",en:"Measure your level, skill gaps and what to develop next."}},
    {icon:"✓",title:"Skills Passport",category:"proof",href:"/competences",tags:["Verified","Evidence","Profile"],description:{fr:"Centralisez vos compétences vérifiées et leurs preuves.",ar:"اجمع مهاراتك الموثقة وأدلتها في مكان واحد.",en:"Centralize verified skills and the evidence behind them."}},
    {icon:"BUILD",title:t({fr:"Projets",ar:"المشاريع",en:"Projects"}),category:"proof",href:"/projects",tags:["Portfolio","Build","Evidence"],description:{fr:"Transformez ce que vous apprenez en projets visibles et démontrables.",ar:"حوّل ما تتعلمه إلى مشاريع واضحة وقابلة للإثبات.",en:"Turn what you learn into visible, demonstrable projects."}},
    {icon:"PRO",title:"Portfolio",category:"proof",href:"/portfolio",tags:["Career","Public","Proof"],description:{fr:"Présentez votre travail, vos projets et vos compétences au même endroit.",ar:"اعرض أعمالك ومشاريعك ومهاراتك في مكان واحد.",en:"Show your work, projects and skills in one place."}},
    {icon:"EXPERT",title:t({fr:"Formateurs",ar:"المدربون",en:"Instructors"}),category:"people",href:"/formateurs",tags:["Experts","Creators","Mentors"],description:{fr:"Découvrez les experts qui enseignent et animent les Classrooms Vydys.",ar:"اكتشف الخبراء الذين يدرّسون ويديرون فصول Vydys.",en:"Discover the experts teaching and running Vydys Classrooms."}},
    {icon:"TUTOR",title:"Vydys AI Tutor",category:"ai",href:"/ai-tutor",tags:["Tutor","AI","Learning"],description:{fr:"Votre assistant d’apprentissage personnel relié à votre progression.",ar:"مساعد تعلم شخصي مرتبط بتقدمك.",en:"Your personal learning assistant connected to your progress."}}
  ];

  const filters=[
    ["all",t({fr:"Tout",ar:"الكل",en:"All"})],
    ["learn",t({fr:"Apprendre",ar:"التعلم",en:"Learn"})],
    ["live","Live"],
    ["practice",t({fr:"Pratiquer",ar:"التدريب",en:"Practice"})],
    ["ai","AI"],
    ["proof",t({fr:"Prouver",ar:"الإثبات",en:"Prove"})],
    ["people",t({fr:"Experts",ar:"الخبراء",en:"Experts"})]
  ];

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return items.filter(item=>{
      const categoryMatch=filter==="all"||item.category===filter;
      const text=[item.title,item.description.fr,item.description.en,item.description.ar,...item.tags].join(" ").toLowerCase();
      return categoryMatch&&(!q||text.includes(q));
    });
  },[query,filter]);

  return <main className="vydys-hub">
    <section className="hub-hero">
      <div className="container hub-hero-grid">
        <div>
          <div className="home-kicker"><span></span> VYDYS HUB</div>
          <h1>{t({fr:"Tout Vydys. Un seul point d’entrée.",ar:"كل Vydys. من نقطة دخول واحدة.",en:"Everything Vydys. One place to start."})}</h1>
          <p>{t({fr:"Trouvez ce dont vous avez besoin pour apprendre, pratiquer, rejoindre une Classroom, utiliser l’IA, construire des projets et prouver vos compétences.",ar:"اعثر على كل ما تحتاجه للتعلم والتدرب والانضمام إلى Classroom واستخدام الذكاء الاصطناعي وبناء المشاريع وإثبات مهاراتك.",en:"Find everything you need to learn, practice, join a Classroom, use AI, build projects and prove your skills."})}</p>
          <div className="hub-search">
            <span>⌕</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t({fr:"Rechercher dans Vydys…",ar:"ابحث في Vydys…",en:"Search Vydys…"})}/>
            <kbd>V HUB</kbd>
          </div>
        </div>
        <div className="hub-orbit" aria-hidden="true">
          <div className="hub-core"><img src="/vydys-icon.svg" alt=""/><strong>VYDYS</strong><small>LEARN · BUILD · PROVE</small></div>
          <span className="orbit orbit-a">AI</span><span className="orbit orbit-b">LIVE</span><span className="orbit orbit-c">LAB</span><span className="orbit orbit-d">SKILL</span>
        </div>
      </div>
    </section>

    <section className="hub-directory">
      <div className="container">
        <div className="hub-filter-row">
          {filters.map(([key,label])=><button key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}</button>)}
        </div>

        <div className="hub-section-head">
          <div><span className="eyebrow">{t({fr:"Explorer Vydys",ar:"استكشف Vydys",en:"Explore Vydys"})}</span><h2>{t({fr:"Votre écosystème de compétences.",ar:"منظومة مهاراتك.",en:"Your skills ecosystem."})}</h2></div>
          <p>{visible.length} {t({fr:"espaces disponibles",ar:"مساحة متاحة",en:"spaces available"})}</p>
        </div>

        <div className="hub-grid">
          {visible.map((item,i)=><Link href={item.href} className="hub-card" key={item.title}>
            <div className="hub-card-top"><span>{item.icon}</span><b>{String(i+1).padStart(2,"0")}</b></div>
            <h3>{item.title}</h3>
            <p>{t(item.description)}</p>
            <div className="hub-tags">{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
            <div className="hub-card-link">{t({fr:"Ouvrir",ar:"فتح",en:"Open"})} <b>↗</b></div>
          </Link>)}
        </div>

        {visible.length===0&&<div className="hub-empty"><strong>{t({fr:"Aucun résultat",ar:"لا توجد نتائج",en:"No results"})}</strong><p>{t({fr:"Essayez un autre mot-clé ou affichez toutes les catégories.",ar:"جرّب كلمة أخرى أو اعرض كل الفئات.",en:"Try another keyword or show all categories."})}</p></div>}
      </div>
    </section>

    <section className="hub-paths"><div className="container">
      <div className="hub-section-head dark"><div><span className="eyebrow">START HERE</span><h2>{t({fr:"Choisissez ce que vous voulez faire maintenant.",ar:"اختر ما تريد فعله الآن.",en:"Choose what you want to do now."})}</h2></div></div>
      <div className="hub-path-grid">
        <Link href="/formations"><span>01</span><div><strong>{t({fr:"Je veux apprendre",ar:"أريد أن أتعلم",en:"I want to learn"})}</strong><small>{t({fr:"Cours et parcours structurés",ar:"دورات ومسارات منظمة",en:"Courses and structured paths"})}</small></div><b>→</b></Link>
        <Link href="/practice"><span>02</span><div><strong>{t({fr:"Je veux pratiquer",ar:"أريد أن أتدرب",en:"I want to practice"})}</strong><small>Labs · Code · SQL · API · Cloud</small></div><b>→</b></Link>
        <Link href="/classroom"><span>03</span><div><strong>{t({fr:"Je veux apprendre en live",ar:"أريد التعلم مباشرة",en:"I want live learning"})}</strong><small>Vydys Classroom</small></div><b>→</b></Link>
        <Link href="/skill-engine"><span>04</span><div><strong>{t({fr:"Je veux mesurer mes compétences",ar:"أريد قياس مهاراتي",en:"I want to measure my skills"})}</strong><small>Skill Engine · Skills Passport</small></div><b>→</b></Link>
      </div>
    </div></section>
  </main>;
}
