"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminClassroomsPage(){
  const {lang,t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rooms,setRooms]=useState<any[]>([]);
  const [fees,setFees]=useState<any[]>([]);
  const [profiles,setProfiles]=useState<Record<string,any>>({});
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;

    const [{data:r},{data:f}]=await Promise.all([
      supabase.from("classrooms").select("*").order("created_at",{ascending:false}),
      supabase.from("classroom_launch_fee_orders").select("*").in("status",["pending","processing","rejected"]).order("created_at",{ascending:true})
    ]);
    setRooms(r||[]);
    const rawFees=f||[];
    const feeEnriched=await Promise.all(rawFees.map(async(x:any)=>{
      const {data:signed}=x.proof_path?await supabase.storage.from("trainer-files").createSignedUrl(x.proof_path,3600):{data:null};
      return {...x,proofUrl:signed?.signedUrl};
    }));
    setFees(feeEnriched);

    const ids=[...new Set([...(r||[]).map((x:any)=>x.instructor_id),...rawFees.map((x:any)=>x.instructor_id)].filter(Boolean))];
    if(ids.length){
      const {data:ps}=await supabase.from("profiles").select("id,full_name,phone").in("id",ids);
      const map:Record<string,any>={};(ps||[]).forEach((x:any)=>map[x.id]=x);setProfiles(map);
    }
  }
  useEffect(()=>{load()},[]);

  const pending=rooms.filter(r=>r.status==="pending");
  const published=rooms.filter(r=>r.status==="published");
  const awaitingFee=rooms.filter(r=>r.status==="approved_pending_fee");

  async function approve(id:string){
    const {error}=await supabase.rpc("approve_classroom",{p_classroom_id:id});
    if(error)setMessage(error.message);else{setMessage(t({fr:"Classroom approuvée. Le frais de lancement est maintenant requis.",ar:"تم اعتماد الفصل وأصبحت رسوم الإطلاق مطلوبة.",en:"Classroom approved. The launch fee is now required."}));await load()}
  }
  async function reject(id:string){
    const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));
    if(reason===null)return;
    const {error}=await supabase.rpc("reject_classroom",{p_classroom_id:id,p_reason:reason});
    if(error)setMessage(error.message);else await load();
  }
  async function approveFee(id:string){
    const {error}=await supabase.rpc("approve_classroom_launch_fee",{p_order_id:id});
    if(error)setMessage(error.message);else{setMessage(t({fr:"Paiement validé : Classroom publiée.",ar:"تم اعتماد الدفع ونشر الفصل.",en:"Payment approved: Classroom published."}));await load()}
  }
  async function rejectFee(id:string){
    const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));
    if(reason===null)return;
    const {error}=await supabase.rpc("reject_classroom_launch_fee",{p_order_id:id,p_reason:reason});
    if(error)setMessage(error.message);else await load();
  }
  async function waive(id:string){
    if(!window.confirm(t({fr:"Publier cette Classroom sans frais ?",ar:"نشر الفصل بدون رسوم؟",en:"Publish this Classroom without a fee?"})))return;
    const {error}=await supabase.rpc("waive_classroom_launch_fee",{p_classroom_id:id});
    if(error)setMessage(error.message);else await load();
  }

  const formatDate=(iso:string)=>new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{dateStyle:"medium"}).format(new Date(iso));

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell admin-classroom-page"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Live Learning Control</span><h1>{t({fr:"Classrooms & cohortes",ar:"الفصول والدفعات",en:"Classrooms & cohorts"})}</h1><p>{t({fr:"Validation du contenu, frais de lancement, capacité et supervision des cohortes live.",ar:"اعتماد المحتوى ورسوم الإطلاق والسعة والإشراف على الفصول المباشرة.",en:"Review content, launch fees, capacity and live cohort operations."})}</p></div><Link className="btn btn-ghost" href="/admin/tarifs">{t({fr:"Configurer les frais",ar:"إعداد الرسوم",en:"Configure fees"})}</Link></div>

    {message&&<p className="manual-note">{message}</p>}

    <div className="classroom-studio-stats">
      <article className="panel"><span>{t({fr:"Total",ar:"الإجمالي",en:"Total"})}</span><strong>{rooms.length}</strong></article>
      <article className="panel"><span>{t({fr:"À valider",ar:"للمراجعة",en:"To review"})}</span><strong>{pending.length}</strong></article>
      <article className="panel"><span>{t({fr:"Frais en attente",ar:"رسوم معلقة",en:"Fees pending"})}</span><strong>{awaitingFee.length}</strong></article>
      <article className="panel"><span>{t({fr:"Publiées",ar:"منشورة",en:"Published"})}</span><strong>{published.length}</strong></article>
    </div>

    <section className="admin-course-stage"><div className="section-head compact"><div><span className="eyebrow">01</span><h2>{t({fr:"Classrooms à valider",ar:"فصول للمراجعة",en:"Classrooms to review"})}</h2></div><span className="admin-count-chip">{pending.length}</span></div>
      <div className="application-list">{pending.length===0?<article className="panel"><p>{t({fr:"Aucune Classroom en attente.",ar:"لا توجد فصول معلقة.",en:"No Classroom waiting for review."})}</p></article>:pending.map(r=><article className="panel application-card classroom-admin-card" key={r.id}><div><span className="tag">{r.visibility==="private"?t({fr:"Privée",ar:"خاص",en:"Private"}):t({fr:"Publique",ar:"عام",en:"Public"})}</span><h2>{r.title_fr}</h2><p>{r.description_fr}</p><div className="classroom-admin-meta"><span>{profiles[r.instructor_id]?.full_name||"Formateur"}</span><span>{r.session_count} sessions</span><span>{r.capacity} {t({fr:"places",ar:"مقعد",en:"seats"})}</span><span>{Number(r.base_price_amount).toLocaleString("fr-FR")} {r.base_currency}</span><span>{formatDate(r.start_date)}</span></div></div><div className="review-actions vertical"><button className="approve" onClick={()=>approve(r.id)}>{t({fr:"Approuver",ar:"اعتماد",en:"Approve"})}</button><button className="reject" onClick={()=>reject(r.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div></article>)}</div>
    </section>

    <section className="admin-course-stage"><div className="section-head compact"><div><span className="eyebrow">02</span><h2>{t({fr:"Frais de lancement Classroom",ar:"رسوم إطلاق الفصل",en:"Classroom launch fees"})}</h2></div><span className="admin-count-chip">{fees.length}</span></div>
      <div className="payment-review-list">{fees.length===0?<article className="panel"><p>{t({fr:"Aucun frais Classroom à traiter.",ar:"لا توجد رسوم فصل للمعالجة.",en:"No Classroom fee to process."})}</p></article>:fees.map(f=><article className="panel payment-review launch-review" key={f.id}>
        {f.proofUrl?<a className="proof-thumb proof-link" href={f.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">{f.status==="pending"?"WAIT":"—"}</div>}
        <div className="payment-review-main"><strong>{rooms.find(r=>r.id===f.classroom_id)?.title_fr||"Classroom"}</strong><span>{profiles[f.instructor_id]?.full_name||"Formateur"} · {Number(f.amount).toLocaleString("fr-FR")} {f.currency}{f.provider_code?" · "+String(f.provider_code).toUpperCase():""}</span><small>{f.status}{f.transaction_reference?" · Ref: "+f.transaction_reference:""}</small></div>
        <div className="review-actions">{f.status==="processing"?<><button className="approve" onClick={()=>approveFee(f.id)}>{t({fr:"Valider & publier",ar:"اعتماد ونشر",en:"Approve & publish"})}</button><button className="reject" onClick={()=>rejectFee(f.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></>:<button className="btn btn-ghost" onClick={()=>waive(f.classroom_id)}>{t({fr:"Exonérer & publier",ar:"إعفاء ونشر",en:"Waive & publish"})}</button>}</div>
      </article>)}</div>
    </section>

    <section className="admin-course-stage"><div className="section-head compact"><div><span className="eyebrow">03</span><h2>{t({fr:"Classrooms actives",ar:"الفصول النشطة",en:"Active Classrooms"})}</h2></div><span className="admin-count-chip">{published.length}</span></div>
      <div className="classroom-admin-table">{published.map(r=><article className="panel" key={r.id}><div><strong>{r.title_fr}</strong><span>{profiles[r.instructor_id]?.full_name||"Formateur"}</span></div><div><b>{r.session_count}</b><small>sessions</small></div><div><b>{r.capacity}</b><small>{t({fr:"places",ar:"مقعد",en:"seats"})}</small></div><div><b>{formatDate(r.start_date)}</b><small>{r.timezone}</small></div><Link href={"/classroom/"+r.slug}>{t({fr:"Voir",ar:"عرض",en:"View"})}</Link></article>)}</div>
    </section>
  </div></section>
}
