"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminFormationsPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const {data,error}=await supabase.from("courses").select("id,title_fr,title_ar,title_en,description_fr,category,base_price_mru,status,instructor_id,profiles:instructor_id(full_name)").eq("status","pending").order("submitted_at",{ascending:true});
    if(error)setMessage(error.message); else setRows(data||[]);
  }
  useEffect(()=>{load()},[]);

  async function approve(id:string){const {error}=await supabase.rpc("approve_course",{p_course_id:id});if(error)setMessage(error.message);else await load()}
  async function reject(id:string){const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));if(reason===null)return;const {error}=await supabase.rpc("reject_course",{p_course_id:id,p_reason:reason});if(error)setMessage(error.message);else await load()}

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container"><div className="dash-header"><div><span className="eyebrow">{t({fr:"Catalogue marketplace",ar:"كتالوج السوق",en:"Marketplace catalog"})}</span><h1>{t({fr:"Formations à valider",ar:"دورات للمراجعة",en:"Courses to review"})}</h1></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="application-list">{rows.length===0?<article className="panel"><p>{t({fr:"Aucune formation en attente.",ar:"لا توجد دورات معلقة.",en:"No pending courses."})}</p></article>:rows.map((r:any)=><article className="panel application-card" key={r.id}><div><span className="tag">{r.category||t({fr:"Sans catégorie",ar:"بدون فئة",en:"Uncategorized"})}</span><h2>{r.title_fr}</h2><p>{r.description_fr}</p><small>{t({fr:"Formateur :",ar:"المدرب:",en:"Instructor:"})} {r.profiles?.full_name||"—"} · {r.base_price_mru.toLocaleString("fr-FR")} MRU</small></div><div className="review-actions vertical"><button className="approve" onClick={()=>approve(r.id)}>{t({fr:"Publier",ar:"نشر",en:"Publish"})}</button><button className="reject" onClick={()=>reject(r.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div></article>)}</div>
  </div></section>
}
