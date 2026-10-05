"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type HubItem={
  icon:string;
  title:string;
  category:"learn"|"live"|"practice"|"ai"|"proof"|"people";
  href:string;
  tags:string[];
  description:{fr:string;ar:string;en:string};
};

export default function VydysHubPage(){
  const {t,lang}=useLanguage();
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const [loading,setLoading]=useState(true);
  const [signedIn,setSignedIn]=useState(false);
  const [profile,setProfile]=useState<any>(null);
  const [enrollments,setEnrollments]=useState<any[]>([]);
  const [lessonProgress,setLessonProgress]=useState<any[]>([]);
  const [lessons,setLessons]=useState<any[]>([]);
  const [myRooms,setMyRooms]=useState<any[]>([]);
  const [sessions,setSessions]=useState<any[]>([]);
  const [recommended,setRecommended]=useState<any[]>([]);
  const [skillEngine,setSkillEngine]=useState<any>(null);
  const [socialActivity,setSocialActivity]=useState<any[]>([]);
  const [socialProfiles,setSocialProfiles]=useState<Record<string,any>>({});

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return}
    setSignedIn(true);
    const {data:p}=await supabase.from("profiles").select("role,full_name,preferred_currency").eq("id",user.id).maybeSingle();
    setProfile(p||null);
    const {data:feed}=await supabase.from("activity_feed").select("*").order("created_at",{ascending:false}).limit(8);
    setSocialActivity(feed||[]);
    const actorIds=[...new Set((feed||[]).map((x:any)=>x.actor_id).filter(Boolean))];
    if(actorIds.length){
      const {data:pp}=await supabase.from("public_profiles").select("user_id,full_name,username,avatar_url,seller_verified,reputation_score").in("user_id",actorIds);
      const pm:Record<string,any>={};(pp||[]).forEach((x:any)=>pm[x.user_id]=x);setSocialProfiles(pm);
    }

    if((p?.role||"student")==="student"){
      const [{data:e},{data:pr},{data:ce},{data:engine},{data:courses},{data:ratings}]=await Promise.all([
        supabase.from("enrollments").select("id,status,activated_at,course_id,courses:course_id(id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,category,cover_url)").eq("user_id",user.id).order("activated_at",{ascending:false}),
        supabase.from("lesson_progress").select("course_id,lesson_id").eq("user_id",user.id),
        supabase.from("classroom_enrollments").select("classroom_id,status,classrooms:classroom_id(id,slug,title_fr,title_ar,title_en,timezone,start_date,status)").eq("user_id",user.id).eq("status","active"),
        supabase.rpc("get_my_skill_engine"),
        supabase.from("courses").select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,category,cover_url").eq("status","published").limit(12),
        supabase.from("course_rating_summary").select("course_id,average_rating,review_count")
      ]);
      const enr=e||[];setEnrollments(enr);setLessonProgress(pr||[]);setSkillEngine(engine||null);
      const ids=enr.map((x:any)=>x.course_id);
      if(ids.length){
        const {data:l}=await supabase.from("course_lessons").select("id,course_id").in("course_id",ids);
        setLessons(l||[]);
      }
      const rooms=(ce||[]).map((x:any)=>x.classrooms).filter(Boolean);setMyRooms(rooms);
      const roomIds=rooms.map((x:any)=>x.id);
      if(roomIds.length){
        const {data:s}=await supabase.from("classroom_sessions").select("id,classroom_id,title,starts_at,ends_at,status").in("classroom_id",roomIds).gte("ends_at",new Date().toISOString()).order("starts_at",{ascending:true}).limit(8);
        setSessions(s||[]);
      }

      const enrolledIds=new Set(ids);
      const ratingMap:Record<string,number>={};
      (ratings||[]).forEach((r:any)=>ratingMap[r.course_id]=Number(r.average_rating||0));
      const activeCategories=new Set(enr.map((x:any)=>x.courses?.category).filter(Boolean));
      const rec=(courses||[])
        .filter((c:any)=>!enrolledIds.has(c.id))
        .sort((a:any,b:any)=>{
          const ac=activeCategories.has(a.category)?1:0,bc=activeCategories.has(b.category)?1:0;
          if(ac!==bc)return bc-ac;
          return (ratingMap[b.id]||0)-(ratingMap[a.id]||0);
        })
        .slice(0,3);
      setRecommended(rec);
    }
    setLoading(false);
  })()},[]);

  function title(x:any){
    return lang==="ar"?(x?.title_ar||x?.title_fr||""):lang==="en"?(x?.title_en||x?.title_fr||""):(x?.title_fr||"");
  }
  function pct(courseId:string){
    const total=lessons.filter(x=>x.course_id===courseId).length;
    const done=lessonProgress.filter(x=>x.course_id===courseId).length;
    return total?Math.min(100,Math.round(done/total*100)):0;
  }

  const activeCourse=enrollments.find(x=>x.status!=="completed")||enrollments[0];
  const upcomingSession=useMemo(()=>sessions.find(s=>new Date(s.ends_at).getTime()>Date.now()),[sessions]);
  const readiness=Math.round(Number(skillEngine?.verified_readiness||0));
  const missions=(skillEngine?.missions||[]).filter((m:any)=>m.status!=="completed");
  const role=profile?.role||"student";

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
    ["all",t({fr:"Tout",ar:"الكل",en:"All"})],["learn",t({fr:"Apprendre",ar:"التعلم",en:"Learn"})],["live","Live"],
    ["practice",t({fr:"Pratiquer",ar:"التدريب",en:"Practice"})],["ai","AI"],["proof",t({fr:"Prouver",ar:"الإثبات",en:"Prove"})],["people",t({fr:"Experts",ar:"الخبراء",en:"Experts"})]
  ];

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return items.filter(item=>{
      const text=[item.title,item.description.fr,item.description.en,item.description.ar,...item.tags].join(" ").toLowerCase();
      return (filter==="all"||item.category===filter)&&(!q||text.includes(q));
    });
  },[query,filter,lang]);

  const sessionRoom=upcomingSession?myRooms.find(r=>r.id===upcomingSession.classroom_id):null;
  const fmtSession=(iso:string,zone?:string)=>new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",...(zone?{timeZone:zone}:{})}).format(new Date(iso));

  return <main className="vydys-hub">
    <section className="hub-hero"><div className="container hub-hero-grid">
      <div>
        <div className="home-kicker"><span></span> VYDYS HUB</div>
        <h1>{signedIn&&profile?.full_name?t({fr:`Bonjour ${profile.full_name}. Voici votre Vydys.`,ar:`مرحباً ${profile.full_name}. هذه هي Vydys الخاصة بك.`,en:`Hello ${profile.full_name}. This is your Vydys.`}):t({fr:"Tout Vydys. Un seul point d’entrée.",ar:"كل Vydys. من نقطة دخول واحدة.",en:"Everything Vydys. One place to start."})}</h1>
        <p>{t({fr:"Un centre unique pour apprendre, pratiquer, rejoindre vos Classrooms, suivre vos compétences et décider de votre prochaine action.",ar:"مركز واحد للتعلم والتدرب والانضمام إلى الفصول ومتابعة مهاراتك وتحديد خطوتك التالية.",en:"One center to learn, practice, join your Classrooms, track skills and decide what to do next."})}</p>
        <div className="hub-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t({fr:"Rechercher dans Vydys…",ar:"ابحث في Vydys…",en:"Search Vydys…"})}/><kbd>V HUB</kbd></div>
      </div>
      <div className="hub-orbit" aria-hidden="true"><div className="hub-core"><img src="/vydys-icon.svg" alt=""/><strong>VYDYS</strong><small>LEARN · BUILD · PROVE</small></div><span className="orbit orbit-a">AI</span><span className="orbit orbit-b">LIVE</span><span className="orbit orbit-c">LAB</span><span className="orbit orbit-d">SKILL</span></div>
    </div></section>

    {signedIn&&!loading&&role==="student"&&<section className="hub-personal"><div className="container">
      <div className="hub-section-head dark"><div><span className="eyebrow">{t({fr:"Pour vous maintenant",ar:"لك الآن",en:"For you now"})}</span><h2>{t({fr:"Votre prochaine meilleure action.",ar:"أفضل خطوة تالية لك.",en:"Your next best action."})}</h2></div><Link href="/dashboard">{t({fr:"Voir mon dashboard",ar:"لوحة التحكم",en:"Open dashboard"})} ↗</Link></div>
      <div className="hub-command-grid">
        <article className="hub-command-card primary">
          <span className="hub-command-label">{t({fr:"Continuer",ar:"متابعة",en:"Continue"})}</span>
          {activeCourse?<><h3>{title(activeCourse.courses)}</h3><p>{pct(activeCourse.course_id)}% {t({fr:"terminé",ar:"مكتمل",en:"complete"})}</p><div className="hub-progress"><i style={{width:pct(activeCourse.course_id)+"%"}}/></div><Link className="btn" href={"/apprendre/"+activeCourse.courses.slug}>{t({fr:"Reprendre la formation",ar:"متابعة الدورة",en:"Continue course"})}</Link></>:<><h3>{t({fr:"Commencez votre premier parcours",ar:"ابدأ أول مسار لك",en:"Start your first learning path"})}</h3><p>{t({fr:"Choisissez une formation et Vydys organisera votre progression.",ar:"اختر دورة وستنظم Vydys تقدمك.",en:"Choose a course and Vydys will organize your progress."})}</p><Link className="btn" href="/formations">{t({fr:"Explorer les formations",ar:"استكشف الدورات",en:"Explore courses"})}</Link></>}
        </article>

        <article className="hub-command-card">
          <span className="hub-command-label">LIVE</span>
          {upcomingSession&&sessionRoom?<><h3>{title(sessionRoom)}</h3><p>{fmtSession(upcomingSession.starts_at,sessionRoom.timezone)}</p><small>{upcomingSession.title}</small><Link className="text-link" href={"/classroom/"+sessionRoom.slug}>{t({fr:"Ouvrir la Classroom",ar:"فتح الفصل",en:"Open Classroom"})} →</Link></>:<><h3>{t({fr:"Aucune session live imminente",ar:"لا توجد جلسة مباشرة قريبة",en:"No upcoming live session"})}</h3><p>{t({fr:"Découvrez les prochaines cohortes ouvertes.",ar:"اكتشف الدفعات المباشرة القادمة.",en:"Discover upcoming open cohorts."})}</p><Link className="text-link" href="/classroom">{t({fr:"Voir les Classrooms",ar:"عرض الفصول",en:"Browse Classrooms"})} →</Link></>}
        </article>

        <article className="hub-command-card">
          <span className="hub-command-label">SKILL ENGINE</span>
          <div className="hub-readiness"><strong>{readiness}%</strong><span>{t({fr:"readiness vérifiée",ar:"جاهزية موثقة",en:"verified readiness"})}</span></div>
          <p>{missions.length?missions.length+" "+t({fr:"mission(s) à faire aujourd’hui",ar:"مهام لليوم",en:"mission(s) for today"}):t({fr:"Définissez votre objectif carrière pour personnaliser votre parcours.",ar:"حدد هدفك المهني لتخصيص مسارك.",en:"Set your career goal to personalize your path."})}</p>
          <Link className="text-link" href="/skill-engine">{t({fr:"Ouvrir Skill Engine",ar:"فتح Skill Engine",en:"Open Skill Engine"})} →</Link>
        </article>
      </div>

      {recommended.length>0&&<div className="hub-reco-zone">
        <div className="hub-reco-head"><div><span className="eyebrow">{t({fr:"Recommandé pour vous",ar:"مقترح لك",en:"Recommended for you"})}</span><h3>{t({fr:"Continuez votre progression.",ar:"واصل تقدمك.",en:"Keep your momentum."})}</h3></div><Link href="/formations">{t({fr:"Voir tout",ar:"عرض الكل",en:"See all"})} →</Link></div>
        <div className="hub-reco-grid">{recommended.map((c:any)=><Link className="hub-reco-card" href={"/formation/"+c.slug} key={c.id}><div className="hub-reco-cover">{c.cover_url?<img src={c.cover_url} alt=""/>:<span>V</span>}</div><div><small>{c.category||"Vydys"}</small><strong>{title(c)}</strong><p>{lang==="ar"?(c.description_ar||c.description_fr):lang==="en"?(c.description_en||c.description_fr):c.description_fr}</p><b>{t({fr:"Découvrir",ar:"اكتشف",en:"Explore"})} ↗</b></div></Link>)}</div>
      </div>}
    </div></section>}

    {signedIn&&!loading&&role==="instructor"&&<section className="hub-role-strip"><div className="container"><div><span className="eyebrow">VYDYS STUDIO</span><h2>{t({fr:"Gérez votre activité de formateur depuis votre Hub.",ar:"أدر نشاطك كمدرب من الـ Hub.",en:"Run your instructor activity from your Hub."})}</h2></div><div><Link className="btn" href="/formateur">{t({fr:"Ouvrir Studio",ar:"فتح Studio",en:"Open Studio"})}</Link><Link className="btn btn-ghost" href="/formateur/nouvelle-formation">{t({fr:"Créer une formation",ar:"إنشاء دورة",en:"Create course"})}</Link></div></div></section>}
    {signedIn&&!loading&&(role==="admin"||role==="direction")&&<section className="hub-role-strip"><div className="container"><div><span className="eyebrow">VYDYS CONTROL</span><h2>{t({fr:"Supervisez la plateforme depuis le Hub.",ar:"أشرف على المنصة من الـ Hub.",en:"Supervise the platform from the Hub."})}</h2></div><Link className="btn" href="/admin">{t({fr:"Ouvrir Control",ar:"فتح Control",en:"Open Control"})}</Link></div></section>}

    {signedIn&&!loading&&socialActivity.length>0&&<section className="hub-social"><div className="container">
      <div className="hub-section-head dark"><div><span className="eyebrow">VYDYS NETWORK</span><h2>{t({fr:"Ce qui bouge dans votre communauté.",ar:"ما يحدث في مجتمعك.",en:"What is happening in your community."})}</h2></div><Link href="/forum">Community ↗</Link></div>
      <div className="hub-social-grid">{socialActivity.map(a=>{const actor=socialProfiles[a.actor_id];return <Link href={a.link||"#"} className="hub-social-card" key={a.id}><div className="hub-social-author">{actor?.avatar_url?<img src={actor.avatar_url} alt=""/>:<span>{(actor?.full_name||"V").slice(0,2)}</span>}<div><strong>{actor?.full_name||actor?.username||"Vydys"} {actor?.seller_verified?"✓":""}</strong><small>{actor?.reputation_score||0} XP · {a.activity_type}</small></div></div><h3>{a.title}</h3><p>{a.body}</p><small>{new Date(a.created_at).toLocaleString()}</small></Link>})}</div>
    </div></section>}

    <section className="hub-directory"><div className="container">
      <div className="hub-filter-row">{filters.map(([key,label])=><button key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}</button>)}</div>
      <div className="hub-section-head"><div><span className="eyebrow">{t({fr:"Explorer Vydys",ar:"استكشف Vydys",en:"Explore Vydys"})}</span><h2>{t({fr:"Votre écosystème de compétences.",ar:"منظومة مهاراتك.",en:"Your skills ecosystem."})}</h2></div><p>{visible.length} {t({fr:"espaces disponibles",ar:"مساحة متاحة",en:"spaces available"})}</p></div>
      <div className="hub-grid">{visible.map((item,i)=><Link href={item.href} className="hub-card" key={item.title}><div className="hub-card-top"><span>{item.icon}</span><b>{String(i+1).padStart(2,"0")}</b></div><h3>{item.title}</h3><p>{t(item.description)}</p><div className="hub-tags">{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div><div className="hub-card-link">{t({fr:"Ouvrir",ar:"فتح",en:"Open"})} <b>↗</b></div></Link>)}</div>
      {visible.length===0&&<div className="hub-empty"><strong>{t({fr:"Aucun résultat",ar:"لا توجد نتائج",en:"No results"})}</strong><p>{t({fr:"Essayez un autre mot-clé ou affichez toutes les catégories.",ar:"جرّب كلمة أخرى أو اعرض كل الفئات.",en:"Try another keyword or show all categories."})}</p></div>}
    </div></section>

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
