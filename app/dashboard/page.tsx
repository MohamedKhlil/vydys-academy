"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function DashboardPage(){
  const {t,lang}=useLanguage();
  const [loading,setLoading]=useState(true);
  const [name,setName]=useState("");
  const [enrollments,setEnrollments]=useState<any[]>([]);
  const [progress,setProgress]=useState<any[]>([]);
  const [lessons,setLessons]=useState<any[]>([]);
  const [certificates,setCertificates]=useState<any[]>([]);
  const [pending,setPending]=useState<any[]>([]);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role,full_name").eq("id",user.id).single();
    if(p?.role==="direction"||p?.role==="admin"){window.location.href="/admin";return}
    if(p?.role==="instructor"){window.location.href="/formateur";return}
    setName(p?.full_name||"");

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
    setLoading(false);
  })()},[]);

  const stats=useMemo(()=>{
    const total=enrollments.length;
    const completed=enrollments.filter(e=>e.status==="completed").length;
    const certs=certificates.length;
    return {total,completed,certs};
  },[enrollments,certificates]);

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

    <div className="stat-grid">
      <article className="panel stat"><span>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</span><strong>{stats.total}</strong></article>
      <article className="panel stat"><span>{t({fr:"Terminées",ar:"مكتملة",en:"Completed"})}</span><strong>{stats.completed}</strong></article>
      <article className="panel stat"><span>{t({fr:"Certificats",ar:"الشهادات",en:"Certificates"})}</span><strong>{stats.certs}</strong></article>
      <article className="panel stat"><span>{t({fr:"Paiements en attente",ar:"دفعات معلقة",en:"Pending payments"})}</span><strong>{pending.length}</strong></article>
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
