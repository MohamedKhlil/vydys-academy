"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function InstructorClassroomsPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rooms,setRooms]=useState<any[]>([]);
  const [enrollments,setEnrollments]=useState<any[]>([]);
  const [orders,setOrders]=useState<any[]>([]);
  const [profiles,setProfiles]=useState<Record<string,any>>({});
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    const ok=p?.role==="instructor";setAllowed(ok);if(!ok)return;

    const [{data:r},{data:e},{data:o}]=await Promise.all([
      supabase.from("classrooms").select("*").eq("instructor_id",user.id).order("created_at",{ascending:false}),
      supabase.from("classroom_enrollments").select("id,classroom_id,user_id,status,enrolled_at").eq("status","active"),
      supabase.from("classroom_orders").select("*").eq("instructor_id",user.id).eq("payment_mode","manual").eq("status","proof_submitted").order("created_at",{ascending:true})
    ]);
    setRooms(r||[]);setEnrollments(e||[]);setOrders(o||[]);
    const ids=[...new Set((o||[]).map((x:any)=>x.user_id).filter(Boolean))];
    if(ids.length){
      const {data:ps}=await supabase.from("profiles").select("id,full_name,phone").in("id",ids);
      const map:Record<string,any>={};(ps||[]).forEach((x:any)=>map[x.id]=x);setProfiles(map);
    }else setProfiles({});
  }

  useEffect(()=>{load()},[]);

  const enrolledByRoom=useMemo(()=>{
    const m:Record<string,number>={};enrollments.forEach(e=>m[e.classroom_id]=(m[e.classroom_id]||0)+1);return m;
  },[enrollments]);

  async function approve(order:any){
    setMessage("");
    const {error}=await supabase.rpc("approve_manual_classroom_order",{p_order_id:order.id});
    if(error)setMessage(error.message);else{setMessage(t({fr:"Inscription Classroom validée.",ar:"تم اعتماد التسجيل.",en:"Classroom enrollment approved."}));await load()}
  }
  async function reject(order:any){
    const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));
    if(reason===null)return;
    const {error}=await supabase.rpc("reject_manual_classroom_order",{p_order_id:order.id,p_reason:reason});
    if(error)setMessage(error.message);else await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès formateur requis",ar:"يلزم حساب مدرب",en:"Instructor access required"})}</h1></article></div></section>;

  return <section className="dashboard-shell classroom-studio-page"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Classroom Studio</span><h1>{t({fr:"Vos cohortes live",ar:"فصولك المباشرة",en:"Your live cohorts"})}</h1><p>{t({fr:"Créez une cohorte, programmez les séances, gérez les inscriptions, la présence, les devoirs et les ressources.",ar:"أنشئ دفعة وبرمج الحصص وأدر التسجيل والحضور والواجبات والموارد.",en:"Create cohorts, schedule sessions, manage enrollment, attendance, assignments and resources."})}</p></div><Link className="btn" href="/formateur/classrooms/new">+ {t({fr:"Nouvelle Classroom",ar:"فصل جديد",en:"New Classroom"})}</Link></div>

    {message&&<p className="manual-note">{message}</p>}

    <div className="classroom-studio-stats">
      <article className="panel"><span>{t({fr:"Classrooms",ar:"الفصول",en:"Classrooms"})}</span><strong>{rooms.length}</strong></article>
      <article className="panel"><span>{t({fr:"Publiées",ar:"منشورة",en:"Published"})}</span><strong>{rooms.filter(r=>r.status==="published").length}</strong></article>
      <article className="panel"><span>{t({fr:"Étudiants actifs",ar:"طلاب نشطون",en:"Active learners"})}</span><strong>{enrollments.length}</strong></article>
      <article className="panel"><span>{t({fr:"Paiements à valider",ar:"دفعات للمراجعة",en:"Payments to review"})}</span><strong>{orders.length}</strong></article>
    </div>

    {orders.length>0&&<article className="panel classroom-payment-queue"><div className="admin-section-head"><div><span className="eyebrow">{t({fr:"Inscriptions directes",ar:"التسجيلات المباشرة",en:"Direct enrollments"})}</span><h2>{t({fr:"Paiements manuels à valider",ar:"المدفوعات اليدوية للمراجعة",en:"Manual payments to review"})}</h2></div></div>
      <div className="payment-review-list">{orders.map(o=><div className="payment-review" key={o.id}><div className="proof-thumb">MR</div><div className="payment-review-main"><strong>{profiles[o.user_id]?.full_name||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</strong><span>{Number(o.amount).toLocaleString("fr-FR")} {o.currency} · {String(o.provider_code).toUpperCase()}</span><small>{profiles[o.user_id]?.phone||""}{o.transaction_reference?" · Ref: "+o.transaction_reference:""}</small></div><div className="review-actions"><button className="approve" onClick={()=>approve(o)}>{t({fr:"Valider",ar:"قبول",en:"Approve"})}</button><button className="reject" onClick={()=>reject(o)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div></div>)}</div>
    </article>}

    <div className="classroom-studio-grid">
      {rooms.length===0?<article className="panel classroom-empty"><span>LIVE</span><h2>{t({fr:"Créez votre première Classroom",ar:"أنشئ أول فصل مباشر",en:"Create your first Classroom"})}</h2><p>{t({fr:"Le calendrier des séances sera généré automatiquement à partir de votre date de début, vos jours et votre nombre de sessions.",ar:"سيتم إنشاء جدول الحصص تلقائياً من تاريخ البداية والأيام وعدد الحصص.",en:"Session dates are generated automatically from the start date, weekdays and session count."})}</p><Link className="btn" href="/formateur/classrooms/new">{t({fr:"Créer maintenant",ar:"إنشاء الآن",en:"Create now"})}</Link></article>:rooms.map(room=><article className="panel classroom-studio-card" key={room.id}>
        <div className="classroom-card-top"><span className={"classroom-status "+room.status}>{room.status}</span><b>{room.visibility==="private"?t({fr:"Privée",ar:"خاص",en:"Private"}):t({fr:"Publique",ar:"عام",en:"Public"})}</b></div>
        <h2>{room.title_fr}</h2>
        <p>{room.session_count} {t({fr:"sessions",ar:"حصص",en:"sessions"})} · {room.capacity} {t({fr:"places",ar:"مقعد",en:"seats"})} · {room.session_duration_minutes} min</p>
        <div className="classroom-card-metrics"><span><strong>{enrolledByRoom[room.id]||0}</strong>{t({fr:" inscrits",ar:" مسجل",en:" enrolled"})}</span><span><strong>{Number(room.base_price_amount).toLocaleString("fr-FR")}</strong> {room.base_currency}</span></div>
        <div className="classroom-card-actions"><Link className="btn btn-small" href={"/formateur/classrooms/"+room.id}>{t({fr:"Gérer",ar:"إدارة",en:"Manage"})}</Link>{room.status==="approved_pending_fee"&&<Link className="btn btn-small btn-ghost" href={"/formateur/classrooms/"+room.id+"/launch"}>{t({fr:"Payer lancement",ar:"دفع الإطلاق",en:"Pay launch"})}</Link>}{room.status==="published"&&<Link className="btn btn-small btn-ghost" href={"/classroom/"+room.slug}>{t({fr:"Voir public",ar:"عرض",en:"View public"})}</Link>}</div>
      </article>)}
    </div>
  </div></section>
}
