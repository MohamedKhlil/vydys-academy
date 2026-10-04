"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminFormationsPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [launchRows,setLaunchRows]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const [{data,error},{data:launch}]=await Promise.all([
      supabase.from("courses").select("id,title_fr,title_ar,title_en,description_fr,category,base_price_mru,base_price_amount,base_currency,status,instructor_id,submitted_at").eq("status","pending").order("submitted_at",{ascending:true}),
      supabase.from("course_launch_fee_orders").select("id,course_id,instructor_id,amount,currency,payment_mode,provider_code,payment_number,transaction_reference,proof_path,status,created_at,courses:course_id(title_fr)").in("status",["pending","processing","rejected"]).order("created_at",{ascending:true})
    ]);
    if(error){setMessage(error.message);return}
    const all=[...(data||[]),...(launch||[])];
    const ids=[...new Set(all.map((x:any)=>x.instructor_id).filter(Boolean))];
    const names:Record<string,string>={};
    if(ids.length){
      const {data:profiles}=await supabase.from("profiles").select("id,full_name").in("id",ids);
      (profiles||[]).forEach((x:any)=>names[x.id]=x.full_name||"");
    }
    setRows((data||[]).map((x:any)=>({...x,instructor_name:names[x.instructor_id]||null})));
    const enriched=await Promise.all((launch||[]).map(async(x:any)=>{
      const {data:signed}=x.proof_path?await supabase.storage.from("trainer-files").createSignedUrl(x.proof_path,3600):{data:null};
      return {...x,instructor_name:names[x.instructor_id]||null,proofUrl:signed?.signedUrl};
    }));
    setLaunchRows(enriched);
  }
  useEffect(()=>{load()},[]);

  async function approve(id:string){const {error}=await supabase.rpc("approve_course",{p_course_id:id});if(error)setMessage(error.message);else{setMessage(t({fr:"Formation approuvée. Le formateur doit maintenant régler le frais de lancement.",ar:"تم اعتماد الدورة. يجب على المدرب الآن دفع رسوم الإطلاق.",en:"Course approved. The instructor must now pay the launch fee."}));await load()}}
  async function reject(id:string){const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));if(reason===null)return;const {error}=await supabase.rpc("reject_course",{p_course_id:id,p_reason:reason});if(error)setMessage(error.message);else await load()}
  async function approveLaunch(id:string){const {error}=await supabase.rpc("approve_course_launch_fee",{p_order_id:id});if(error)setMessage(error.message);else{setMessage(t({fr:"Frais validé : la formation est publiée.",ar:"تم اعتماد الرسوم: نُشرت الدورة.",en:"Launch fee approved: course published."}));await load()}}
  async function rejectLaunch(id:string){const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));if(reason===null)return;const {error}=await supabase.rpc("reject_course_launch_fee",{p_order_id:id,p_reason:reason});if(error)setMessage(error.message);else await load()}
  async function waive(courseId:string){if(!window.confirm(t({fr:"Publier cette formation sans frais de lancement ?",ar:"نشر هذه الدورة بدون رسوم إطلاق؟",en:"Publish this course without a launch fee?"})))return;const {error}=await supabase.rpc("waive_course_launch_fee",{p_course_id:courseId});if(error)setMessage(error.message);else await load()}

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Catalogue marketplace",ar:"كتالوج السوق",en:"Marketplace catalog"})}</span><h1>{t({fr:"Validation & lancement des formations",ar:"اعتماد وإطلاق الدورات",en:"Course approval & launch"})}</h1><p>{t({fr:"Étape 1 : valider le contenu. Étape 2 : confirmer le frais de lancement ou l’annuler.",ar:"الخطوة 1: اعتماد المحتوى. الخطوة 2: تأكيد رسوم الإطلاق أو إعفاؤها.",en:"Step 1: approve content. Step 2: confirm or waive the launch fee."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}

    <section className="admin-course-stage"><div className="section-head compact"><div><span className="eyebrow">01</span><h2>{t({fr:"Formations à valider",ar:"دورات للمراجعة",en:"Courses to review"})}</h2></div><span className="admin-count-chip">{rows.length}</span></div>
      <div className="application-list">{rows.length===0?<article className="panel"><p>{t({fr:"Aucune formation en attente.",ar:"لا توجد دورات معلقة.",en:"No pending courses."})}</p></article>:rows.map((r:any)=><article className="panel application-card" key={r.id}><div><span className="tag">{r.category||t({fr:"Sans catégorie",ar:"بدون فئة",en:"Uncategorized"})}</span><h2>{r.title_fr}</h2><p>{r.description_fr}</p><small>{t({fr:"Formateur :",ar:"المدرب:",en:"Instructor:"})} {r.instructor_name||"—"} · {Number(r.base_price_amount??r.base_price_mru).toLocaleString("fr-FR")} {r.base_currency||"MRU"}</small></div><div className="review-actions vertical"><button className="approve" onClick={()=>approve(r.id)}>{t({fr:"Approuver",ar:"اعتماد",en:"Approve"})}</button><button className="reject" onClick={()=>reject(r.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div></article>)}</div>
    </section>

    <section className="admin-course-stage"><div className="section-head compact"><div><span className="eyebrow">02</span><h2>{t({fr:"Frais de lancement",ar:"رسوم الإطلاق",en:"Launch fees"})}</h2></div><span className="admin-count-chip">{launchRows.length}</span></div>
      <div className="payment-review-list">{launchRows.length===0?<article className="panel"><p>{t({fr:"Aucun frais de lancement à traiter.",ar:"لا توجد رسوم إطلاق للمعالجة.",en:"No launch fees to process."})}</p></article>:launchRows.map((r:any)=><article className="panel payment-review launch-review" key={r.id}>
        {r.proofUrl?<a className="proof-thumb proof-link" href={r.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">{r.status==="pending"?"WAIT":"—"}</div>}
        <div className="payment-review-main"><strong>{r.courses?.title_fr||"Formation"}</strong><span>{r.instructor_name||"Formateur"} · {Number(r.amount).toLocaleString("fr-FR")} {r.currency}{r.provider_code?" · "+String(r.provider_code).toUpperCase():""}</span><small>{r.status}{r.transaction_reference?" · Ref: "+r.transaction_reference:""}</small></div>
        <div className="review-actions">{r.status==="processing"?<><button className="approve" onClick={()=>approveLaunch(r.id)}>{t({fr:"Valider & publier",ar:"اعتماد ونشر",en:"Approve & publish"})}</button><button className="reject" onClick={()=>rejectLaunch(r.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></>:<button className="btn btn-ghost" onClick={()=>waive(r.course_id)}>{t({fr:"Exonérer & publier",ar:"إعفاء ونشر",en:"Waive & publish"})}</button>}</div>
      </article>)}</div>
    </section>
  </div></section>
}
