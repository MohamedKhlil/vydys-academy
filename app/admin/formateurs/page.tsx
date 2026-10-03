"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminFormateursPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [apps,setApps]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const {data,error}=await supabase.from("trainer_applications").select("*").in("status",["pending","more_info"]).order("submitted_at",{ascending:true});
    if(error)setMessage(error.message); else setApps(data||[]);
  }
  useEffect(()=>{load()},[]);

  async function approve(id:string){
    const {error}=await supabase.rpc("approve_trainer_application",{p_application_id:id});
    if(error){setMessage(error.message);return} await load();
  }
  async function reject(id:string,moreInfo=false){
    const note=window.prompt(moreInfo?t({fr:"Informations demandées",ar:"المعلومات المطلوبة",en:"Information requested"}):t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));
    if(note===null)return;
    const {error}=await supabase.rpc("reject_trainer_application",{p_application_id:id,p_note:note,p_more_info:moreInfo});
    if(error){setMessage(error.message);return} await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container"><div className="dash-header"><div><span className="eyebrow">{t({fr:"Marketplace",ar:"السوق",en:"Marketplace"})}</span><h1>{t({fr:"Demandes formateurs",ar:"طلبات المدربين",en:"Instructor applications"})}</h1><p>{t({fr:"Validez les profils avant qu'ils puissent accéder à l'espace formateur.",ar:"راجع ملفات المدربين قبل منحهم الوصول.",en:"Review profiles before granting instructor access."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="application-list">{apps.length===0?<article className="panel"><p>{t({fr:"Aucune demande en attente.",ar:"لا توجد طلبات معلقة.",en:"No pending applications."})}</p></article>:apps.map(a=><article className="panel application-card" key={a.id}><div><span className="tag">{a.status}</span><h2>{a.display_name}</h2><p><strong>{a.headline}</strong></p><p>{a.bio}</p><small>{a.expertise}{a.experience_years!=null?" · "+a.experience_years+" ans":""}</small>{a.social_links&&<p><a className="text-link" href={a.social_links} target="_blank" rel="noreferrer">{a.social_links}</a></p>}{a.admin_note&&<p className="manual-note">{a.admin_note}</p>}</div><div className="review-actions vertical"><button className="approve" onClick={()=>approve(a.id)}>{t({fr:"Accepter",ar:"قبول",en:"Approve"})}</button><button className="btn-ghost" onClick={()=>reject(a.id,true)}>{t({fr:"Demander infos",ar:"طلب معلومات",en:"Request info"})}</button><button className="reject" onClick={()=>reject(a.id,false)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div></article>)}</div>
  </div></section>
}
