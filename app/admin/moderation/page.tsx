"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminModerationPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const {data,error}=await supabase.from("course_reviews")
      .select("id,rating,review_text,created_at,moderation_status,moderation_reason,course_id,courses:course_id(title_fr)")
      .order("created_at",{ascending:false});
    if(error)setMessage(error.message);else setRows(data||[]);
  }
  useEffect(()=>{load()},[]);

  async function moderate(id:string,status:"visible"|"hidden"|"flagged"){
    const reason=status==="visible"?"":window.prompt(t({fr:"Motif de modération",ar:"سبب الإشراف",en:"Moderation reason"}))||"";
    if(status!=="visible"&&!reason)return;
    const {error}=await supabase.rpc("moderate_review",{p_review_id:id,p_status:status,p_reason:reason});
    if(error){setMessage(error.message);return}
    await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Qualité",ar:"الجودة",en:"Quality"})}</span><h1>{t({fr:"Modération des avis",ar:"إدارة التقييمات",en:"Review moderation"})}</h1><p>{t({fr:"Masquez un avis problématique sans supprimer son historique.",ar:"أخفِ التقييمات المخالفة دون حذف سجلها.",en:"Hide problematic reviews without deleting their history."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="application-list">{rows.map(r=><article className="panel application-card" key={r.id}><div><div className="rating-line"><span className="stars">★★★★★</span><strong>{r.rating}/5</strong><span className={r.moderation_status==="visible"?"status":"status rejected"}>{r.moderation_status}</span></div><h2>{r.courses?.title_fr||t({fr:"Formation",ar:"دورة",en:"Course"})}</h2><p>{r.review_text||"—"}</p><small>{new Date(r.created_at).toLocaleString()}</small>{r.moderation_reason&&<p className="manual-note">{r.moderation_reason}</p>}</div><div className="review-actions vertical"><button className="approve" onClick={()=>moderate(r.id,"visible")}>{t({fr:"Afficher",ar:"إظهار",en:"Show"})}</button><button className="btn-ghost" onClick={()=>moderate(r.id,"flagged")}>{t({fr:"Signaler",ar:"تمييز",en:"Flag"})}</button><button className="reject" onClick={()=>moderate(r.id,"hidden")}>{t({fr:"Masquer",ar:"إخفاء",en:"Hide"})}</button></div></article>)}</div>
  </div></section>
}
