"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminAbonnementsPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin"; setAllowed(ok); if(!ok)return;
    const {data,error}=await supabase.from("trainer_subscriptions")
      .select("id,plan,amount_mru,payment_method,payment_number,transaction_reference,proof_path,status,created_at,instructor_id")
      .eq("status","pending").order("created_at",{ascending:true});
    if(error){setMessage(error.message);return}
    const raw=data||[];
    const ids=[...new Set(raw.map((x:any)=>x.instructor_id).filter(Boolean))];
    const profiles:Record<string,any>={};
    if(ids.length){
      const {data:ps}=await supabase.from("profiles").select("id,full_name,phone").in("id",ids);
      (ps||[]).forEach((x:any)=>profiles[x.id]=x);
    }
    const enriched=await Promise.all(raw.map(async (row:any)=>{
      const {data:signed}=row.proof_path?await supabase.storage.from("trainer-files").createSignedUrl(row.proof_path,3600):{data:null};
      return {...row,profiles:profiles[row.instructor_id]||null,proofUrl:signed?.signedUrl};
    }));
    setRows(enriched);
  }
  useEffect(()=>{load()},[]);

  async function approve(id:string){const {error}=await supabase.rpc("approve_trainer_subscription",{p_subscription_id:id});if(error)setMessage(error.message);else await load()}
  async function reject(id:string){const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));if(reason===null)return;const {error}=await supabase.rpc("reject_trainer_subscription",{p_subscription_id:id,p_reason:reason});if(error)setMessage(error.message);else await load()}

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Abonnements formateurs",ar:"اشتراكات المدربين",en:"Instructor subscriptions"})}</span><h1>{t({fr:"Paiements à valider",ar:"دفعات للمراجعة",en:"Payments to approve"})}</h1></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="payment-review-list">
      {rows.length===0&&<article className="panel"><p>{t({fr:"Aucun abonnement en attente.",ar:"لا توجد اشتراكات معلقة.",en:"No pending subscriptions."})}</p></article>}
      {rows.map((r:any)=><article className="panel payment-review" key={r.id}>
        {r.proofUrl?<a className="proof-thumb proof-link" href={r.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">—</div>}
        <div className="payment-review-main"><strong>{r.profiles?.full_name||t({fr:"Formateur",ar:"مدرب",en:"Instructor"})}</strong><span>{r.plan} · {r.amount_mru.toLocaleString("fr-FR")} MRU · {r.payment_method.toUpperCase()}</span><small>{r.profiles?.phone||""}{r.transaction_reference?" · Ref: "+r.transaction_reference:""}</small></div>
        <div className="review-actions"><button className="approve" onClick={()=>approve(r.id)}>{t({fr:"Activer",ar:"تفعيل",en:"Activate"})}</button><button className="reject" onClick={()=>reject(r.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div>
      </article>)}
    </div>
  </div></section>
}
