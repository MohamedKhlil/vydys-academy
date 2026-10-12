"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminFormationsPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [launchRows,setLaunchRows]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const [{data:launch,error}]=await Promise.all([
      supabase.from("course_launch_fee_orders").select("id,course_id,instructor_id,amount,currency,payment_mode,provider_code,payment_number,transaction_reference,proof_path,status,created_at,courses:course_id(title_fr)").in("status",["pending","processing","rejected"]).order("created_at",{ascending:true})
    ]);
    if(error){setMessage(error.message);return}
    const all=[...(launch||[])];
    const ids=[...new Set(all.map((x:any)=>x.instructor_id).filter(Boolean))];
    const names:Record<string,string>={};
    if(ids.length){
      const {data:profiles}=await supabase.from("profiles").select("id,full_name").in("id",ids);
      (profiles||[]).forEach((x:any)=>names[x.id]=x.full_name||"");
    }
    const enriched=await Promise.all((launch||[]).map(async(x:any)=>{
      const {data:signed}=x.proof_path?await supabase.storage.from("trainer-files").createSignedUrl(x.proof_path,3600):{data:null};
      return {...x,instructor_name:names[x.instructor_id]||null,proofUrl:signed?.signedUrl};
    }));
    setLaunchRows(enriched);
  }
  useEffect(()=>{load()},[]);

  async function approveLaunch(id:string){const {error}=await supabase.rpc("approve_course_launch_fee",{p_order_id:id});if(error)setMessage(error.message);else{setMessage(t({fr:"Frais validé : la formation est publiée.",ar:"تم اعتماد الرسوم: نُشرت الدورة.",en:"Launch fee approved: course published."}));await load()}}
  async function rejectLaunch(id:string){const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));if(reason===null)return;const {error}=await supabase.rpc("reject_course_launch_fee",{p_order_id:id,p_reason:reason});if(error)setMessage(error.message);else await load()}
  async function waive(courseId:string){if(!window.confirm(t({fr:"Publier cette formation sans frais de lancement ?",ar:"نشر هذه الدورة بدون رسوم إطلاق؟",en:"Publish this course without a launch fee?"})))return;const {error}=await supabase.rpc("waive_course_launch_fee",{p_course_id:courseId});if(error)setMessage(error.message);else await load()}

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Catalogue marketplace",ar:"كتالوج السوق",en:"Marketplace catalog"})}</span><h1>{t({fr:"Formations & frais de lancement",ar:"الدورات ورسوم الإطلاق",en:"Courses & launch fees"})}</h1><p>{t({fr:"Les formateurs publient directement leurs formations. Cet espace sert uniquement au suivi des frais éventuels.",ar:"ينشر المدربون دوراتهم مباشرة. هذه المساحة لمتابعة الرسوم فقط.",en:"Instructors publish courses directly. This area is only for optional launch-fee monitoring."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}

    <section className="admin-course-stage"><div className="section-head compact"><div><span className="eyebrow">01</span><h2>{t({fr:"Frais de lancement",ar:"رسوم الإطلاق",en:"Launch fees"})}</h2></div><span className="admin-count-chip">{launchRows.length}</span></div>
      <div className="payment-review-list">{launchRows.length===0?<article className="panel"><p>{t({fr:"Aucun frais de lancement à traiter.",ar:"لا توجد رسوم إطلاق للمعالجة.",en:"No launch fees to process."})}</p></article>:launchRows.map((r:any)=><article className="panel payment-review launch-review" key={r.id}>
        {r.proofUrl?<a className="proof-thumb proof-link" href={r.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">{r.status==="pending"?"WAIT":"—"}</div>}
        <div className="payment-review-main"><strong>{r.courses?.title_fr||"Formation"}</strong><span>{r.instructor_name||"Formateur"} · {Number(r.amount).toLocaleString("fr-FR")} {r.currency}{r.provider_code?" · "+String(r.provider_code).toUpperCase():""}</span><small>{r.status}{r.transaction_reference?" · Ref: "+r.transaction_reference:""}</small></div>
        <div className="review-actions">{r.status==="processing"?<><button className="approve" onClick={()=>approveLaunch(r.id)}>{t({fr:"Valider & publier",ar:"اعتماد ونشر",en:"Approve & publish"})}</button><button className="reject" onClick={()=>rejectLaunch(r.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></>:<button className="btn btn-ghost" onClick={()=>waive(r.course_id)}>{t({fr:"Exonérer & publier",ar:"إعفاء ونشر",en:"Waive & publish"})}</button>}</div>
      </article>)}</div>
    </section>
  </div></section>
}
