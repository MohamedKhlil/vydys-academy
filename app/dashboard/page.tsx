"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";
import ClassroomCalendarActions from "../../components/classroom-calendar-actions";
import { buildClassroomCalendarEvents, downloadIcs } from "../../lib/calendar-events";

export default function DashboardPage(){
  const {t,lang}=useLanguage();
  const [loading,setLoading]=useState(true);
  const [name,setName]=useState("");
  const [enrollments,setEnrollments]=useState<any[]>([]);
  const [calendarRooms,setCalendarRooms]=useState<any[]>([]);
  const [calendarSessions,setCalendarSessions]=useState<Record<string,any[]>>({});
  const [progress,setProgress]=useState<any[]>([]);
  const [lessons,setLessons]=useState<any[]>([]);
  const [certificates,setCertificates]=useState<any[]>([]);
  const [pending,setPending]=useState<any[]>([]);
  const [onboardingDone,setOnboardingDone]=useState(false);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role,full_name,onboarding_completed_at").eq("id",user.id).single();
    if(p?.role==="direction"||p?.role==="admin"){window.location.href="/admin";return}
    if(p?.role==="instructor"){window.location.href="/formateur";return}
    setName(p?.full_name||"");
    setOnboardingDone(Boolean(p?.onboarding_completed_at));

    const [{data:e},{data:pr},{data:cert},{data:pay}]=await Promise.all([
      supabase.from("enrollments").select("id,status,activated_at,course_id,courses:course_id(id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en)").eq("user_id",user.id).order("activated_at",{ascending:false}),
      supabase.from("lesson_progress").select("course_id,lesson_id").eq("user_id",user.id),
      supabase.from("certificates").select("course_id,certificate_code,issued_at").eq("user_id",user.id),
      supabase.from("payment_submissions").select("id,course_id,status,expected_amount_mru,created_at,courses:course_id(title_fr,title_ar,title_en)").eq("user_id",user.id).eq("status","pending").order("created_at",{ascending:false})
    ]);
    setEnrollments(e||[]);setProgress(pr||[]);setCertificates(cert||[]);setPending(pay||[]);

    const courseIds=(e||[]).map((x:any)=>x.course_id);
    if(courseIds.length){
      const {data:l}=await supabase.from("course_lessons").select("id,course_id").in("course_id",courseIds);
      setLessons(l||[]);
    }
    // Include published Classrooms linked to enrolled courses and directly purchased Classrooms.
    const activeCourseIds=(e||[]).filter((x:any)=>["active","completed"].includes(x.status)).map((x:any)=>x.course_id);
    const [{data:courseRooms},{data:directClassroomEnrollment}]=await Promise.all([
      activeCourseIds.length ? supabase.from("classrooms").select("id,slug,course_id,title_fr,title_ar,title_en,status,visibility").in("course_id",activeCourseIds).eq("status","published") : Promise.resolve({data:[]} as any),
      supabase.from("classroom_enrollments").select("classroom_id").eq("user_id",user.id).in("status",["active","completed"])
    ]);
    const directIds=(directClassroomEnrollment||[]).map((row:any)=>row.classroom_id);
    const {data:directRooms}=directIds.length ? await supabase.from("classrooms").select("id,slug,course_id,title_fr,title_ar,title_en,status,visibility").in("id",directIds).eq("status","published") : {data:[]};
    const uniqueRooms=Array.from(new Map([...(courseRooms||[]),...(directRooms||[])].map((room:any)=>[room.id,room])).values()) as any[];
    setCalendarRooms(uniqueRooms);
    if(uniqueRooms.length){
      const {data:sessionRows}=await supabase.from("classroom_sessions").select("id,classroom_id,position,title,starts_at,ends_at,status,updated_at").in("classroom_id",uniqueRooms.map(room=>room.id)).order("position");
      const group:Record<string,any[]>={};
      (sessionRows||[]).forEach((session:any)=>{(group[session.classroom_id] ||= []).push(session)});
      setCalendarSessions(group);
    }else setCalendarSessions({});
    setLoading(false);
  })()},[]);

  const stats=useMemo(()=>{
    const total=enrollments.length;
    const completed=enrollments.filter(e=>e.status==="completed").length;
    const certs=certificates.length;
    return {total,completed,certs};
  },[enrollments,certificates]);

  const nextEnrollment=useMemo(()=>enrollments.find(e=>e.status!=="completed")||enrollments[0]||null,[enrollments]);
  const allCalendarEvents=useMemo(()=>calendarRooms.flatMap(room=>buildClassroomCalendarEvents(room,calendarSessions[room.id]||[])).filter(event=>!event.cancelled),[calendarRooms,calendarSessions]);

  function title(c:any){return lang==="ar"?(c?.title_ar||c?.title_fr):lang==="en"?(c?.title_en||c?.title_fr):c?.title_fr}
  function desc(c:any){return lang==="ar"?(c?.description_ar||c?.description_fr):lang==="en"?(c?.description_en||c?.description_fr):c?.description_fr}
  function pct(courseId:string){
    const total=lessons.filter(l=>l.course_id===courseId).length;
    const done=progress.filter(p=>p.course_id===courseId).length;
    return total?Math.min(100,Math.round(done/total*100)):0;
  }

  if(loading)return <section className="dashboard-shell"><div className="container">...</div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Espace étudiant",ar:"مساحة الطالب",en:"Student area"})}</span><h1>{t({fr:"Bonjour",ar:"مرحباً",en:"Hello"})}{name?" "+name:""} 👋</h1><p>{t({fr:"Retrouvez vos formations, votre progression et vos certificats.",ar:"تابع دوراتك وتقدمك وشهاداتك.",en:"Track your courses, progress and certificates."})}</p></div></div>

    <article className="panel" style={{marginBottom:20}}>
      <span className="eyebrow">{t({fr:"À faire maintenant",ar:"ما يجب فعله الآن",en:"Do next"})}</span>
      {!onboardingDone ? <>
        <h2>{t({fr:"Personnalisez votre parcours",ar:"خصص مسارك",en:"Personalize your learning path"})}</h2>
        <p>{t({fr:"3 étapes rapides pour prioriser les contenus qui vous correspondent.",ar:"3 خطوات سريعة لترتيب المحتوى المناسب لك.",en:"Three quick steps to prioritize the right content for you."})}</p>
        <Link className="btn" href="/onboarding">{t({fr:"Commencer",ar:"ابدأ",en:"Start onboarding"})}</Link>
      </> : pending.length>0 ? <>
        <h2>{t({fr:"Suivez vos paiements en attente",ar:"تابع دفعاتك المعلقة",en:"Track your pending payments"})}</h2>
        <p>{t({fr:"Une validation est encore en cours. Vous pouvez continuer à explorer Vydys pendant ce temps.",ar:"لا تزال عملية التحقق جارية. يمكنك متابعة استكشاف Vydys.",en:"A payment review is still in progress. You can keep exploring Vydys meanwhile."})}</p>
        <Link className="btn" href="/paiement">{t({fr:"Voir mes paiements",ar:"عرض دفعاتي",en:"View payments"})}</Link>
      </> : nextEnrollment ? <>
        <h2>{t({fr:"Continuez votre prochaine leçon",ar:"تابع درسك التالي",en:"Continue your next lesson"})}</h2>
        <p><strong>{title(nextEnrollment.courses)}</strong> · {pct(nextEnrollment.course_id)}% {t({fr:"terminé",ar:"مكتمل",en:"complete"})}</p>
        <Link className="btn" href={"/apprendre/"+nextEnrollment.courses.slug}>{t({fr:"Continuer",ar:"متابعة",en:"Continue learning"})}</Link>
      </> : <>
        <h2>{t({fr:"Choisissez votre première compétence",ar:"اختر مهارتك الأولى",en:"Choose your first skill"})}</h2>
        <p>{t({fr:"Commencez par une formation ou un challenge pratique.",ar:"ابدأ بدورة أو تحدٍ عملي.",en:"Start with a course or a hands-on challenge."})}</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link className="btn" href="/formations">{t({fr:"Explorer les formations",ar:"استكشف الدورات",en:"Browse courses"})}</Link><Link className="btn btn-ghost" href="/practice">Practice Hub</Link></div>
      </>}
    </article>

    {allCalendarEvents.length>0&&<section className="panel" style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><div><span className="eyebrow">{t({fr:"Agenda des formations",ar:"تقويم التكوينات",en:"Training calendar"})}</span><h2 style={{margin:"6px 0"}}>{t({fr:"Mes prochaines séances Classroom",ar:"حصصي القادمة",en:"My Classroom sessions"})}</h2><p>{t({fr:"Ajoutez les cours à Google Agenda, Outlook ou au calendrier de votre téléphone.",ar:"أضف الحصص إلى تقويم Google أو Outlook أو هاتفك.",en:"Add your classes to Google Calendar, Outlook, or your phone."})}</p></div><button type="button" className="btn" onClick={()=>downloadIcs(allCalendarEvents,"vydys-mes-formations","Vydys Academy — Mes formations")}>↓ {t({fr:"Tous mes cours (.ics)",ar:"كل دروسي (.ics)",en:"All my classes (.ics)"})}</button></div>
      {calendarRooms.map(room=><ClassroomCalendarActions key={room.id} room={room} sessions={calendarSessions[room.id]||[]} compact />)}
    </section>}

    <div className="stat-grid">
      <article className="panel stat"><span>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</span><strong>{stats.total}</strong></article>
      <article className="panel stat"><span>{t({fr:"Terminées",ar:"مكتملة",en:"Completed"})}</span><strong>{stats.completed}</strong></article>
      <article className="panel stat"><span>{t({fr:"Certificats",ar:"الشهادات",en:"Certificates"})}</span><strong>{stats.certs}</strong></article>
      <article className="panel stat"><span>{t({fr:"Paiements en attente",ar:"دفعات معلقة",en:"Pending payments"})}</span><strong>{pending.length}</strong></article>
    </div>

    <div className="vydys-tools-grid">
      <Link className="panel vydys-tool-card practice-tool-card-main" href="/practice"><span className="tool-icon">▶</span><div><strong>Practice Hub</strong><p>{t({fr:"Code, SQL, API, Data, Prompt, RAG et challenges pratiques.",ar:"Code وSQL وAPI وData وPrompt وRAG وتحديات عملية.",en:"Code, SQL, API, Data, Prompt, RAG and hands-on challenges."})}</p></div></Link>
      <Link className="panel vydys-tool-card skill-engine-tool-card" href="/skill-engine"><span className="tool-icon">◎</span><div><strong>Skill Engine</strong><p>{t({fr:"Choisissez un objectif métier et suivez votre readiness vérifiée.",ar:"اختر هدفاً مهنياً وتابع جاهزيتك الموثقة.",en:"Choose a career goal and track your verified readiness."})}</p></div></Link>
      <Link className="panel vydys-tool-card ai" href="/ai-tutor"><span className="tool-icon">AI</span><div><strong>{t({fr:"AI Tutor",ar:"المدرس الذكي",en:"AI Tutor"})}</strong><p>{t({fr:"Comprendre, pratiquer et réviser avec votre tuteur IA.",ar:"افهم وطبّق وراجع مع مدرسك الذكي.",en:"Learn, practice and revise with your AI tutor."})}</p></div></Link>
      <Link className="panel vydys-tool-card ai-lab-card" href="/ai-lab"><span className="tool-icon">✦</span><div><strong>AI Lab</strong><p>{t({fr:"Créez vos agents IA avec votre propre modèle et vos outils.",ar:"أنشئ وكلاء الذكاء الاصطناعي بنموذجك وأدواتك.",en:"Build AI agents with your own model and tools."})}</p></div></Link>
      <Link className="panel vydys-tool-card knowledge-card-tool" href="/ai-lab/knowledge"><span className="tool-icon">◆</span><div><strong>Knowledge Base</strong><p>{t({fr:"Ajoutez PDF, notes et documents pour créer votre RAG.",ar:"أضف PDF والملاحظات والمستندات لبناء RAG.",en:"Add PDFs, notes and documents to build your RAG."})}</p></div></Link>
      <Link className="panel vydys-tool-card code-card-tool" href="/ai-lab/code"><span className="tool-icon">&lt;/&gt;</span><div><strong>Code Lab</strong><p>{t({fr:"Testez Python et JavaScript directement dans Vydys.",ar:"اختبر Python وJavaScript داخل Vydys.",en:"Run Python and JavaScript directly in Vydys."})}</p></div></Link>
      <Link className="panel vydys-tool-card" href="/projects"><span className="tool-icon">⌘</span><div><strong>{t({fr:"Projects",ar:"المشاريع",en:"Projects"})}</strong><p>{t({fr:"Construisez des projets validés par vos formateurs.",ar:"أنشئ مشاريع يعتمدها مدربوك.",en:"Build projects validated by instructors."})}</p></div></Link>
      <Link className="panel vydys-tool-card" href="/competences"><span className="tool-icon">✓</span><div><strong>{t({fr:"Skills Passport",ar:"جواز المهارات",en:"Skills Passport"})}</strong><p>{t({fr:"Vos compétences vérifiées et votre niveau.",ar:"مهاراتك المعتمدة ومستواك.",en:"Your verified skills and level."})}</p></div></Link>
      <Link className="panel vydys-tool-card" href="/portfolio"><span className="tool-icon">↗</span><div><strong>{t({fr:"Portfolio",ar:"الملف المهني",en:"Portfolio"})}</strong><p>{t({fr:"Montrez vos projets et certificats aux entreprises.",ar:"اعرض مشاريعك وشهاداتك للشركات.",en:"Show employers your projects and certificates."})}</p></div></Link>
    </div>

    {pending.length>0&&<article className="panel pending-orders"><h2>{t({fr:"Paiements en cours de validation",ar:"دفعات قيد المراجعة",en:"Payments awaiting approval"})}</h2>{pending.map(p=><div className="pending-order" key={p.id}><div><strong>{title(p.courses)}</strong><small>{Number(p.expected_amount_mru).toLocaleString("fr-FR")} MRU</small></div><span className="status pending">{t({fr:"En attente",ar:"قيد المراجعة",en:"Pending"})}</span></div>)}</article>}

    <div className="student-course-grid">
      {enrollments.length===0?<article className="panel empty-state"><h2>{t({fr:"Vous n'avez pas encore de formation.",ar:"لم تسجل في أي دورة بعد.",en:"You have no courses yet."})}</h2><p>{t({fr:"Explorez la marketplace et choisissez votre prochaine compétence.",ar:"استكشف السوق واختر مهارتك القادمة.",en:"Explore the marketplace and choose your next skill."})}</p><Link className="btn" href="/formations">{t({fr:"Voir les formations",ar:"عرض الدورات",en:"Browse courses"})}</Link></article>:enrollments.map(e=>{
        const c=e.courses;const progressPct=pct(e.course_id);const cert=certificates.find(x=>x.course_id===e.course_id);
        return <article className="student-course-card panel" key={e.id}>
          <div><span className="tag">{e.status}</span><h2>{title(c)}</h2><p>{desc(c)}</p></div>
          <div className="progress large"><span style={{width:progressPct+"%"}}/></div>
          <div className="student-card-meta"><span>{progressPct}% {t({fr:"terminé",ar:"مكتمل",en:"complete"})}</span>{cert&&<Link className="text-link" href={"/certificat/"+cert.certificate_code}>{t({fr:"Certificat",ar:"الشهادة",en:"Certificate"})}</Link>}</div>
          <Link className="btn full" href={"/apprendre/"+c.slug}>{e.status==="completed"?t({fr:"Revoir la formation",ar:"مراجعة الدورة",en:"Review course"}):t({fr:"Continuer",ar:"متابعة",en:"Continue learning"})}</Link>
        </article>
      })}
    </div>
  </div></section>
}
