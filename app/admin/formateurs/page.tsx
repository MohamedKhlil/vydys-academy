"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminFormateursPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [apps,setApps]=useState<any[]>([]);
  const [instructors,setInstructors]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;

    const [{data:a,error:ae},{data:i,error:ie}]=await Promise.all([
      supabase.from("trainer_applications").select("*").in("status",["pending","more_info"]).order("submitted_at",{ascending:true}),
      supabase.from("instructor_profiles").select("user_id,display_name,headline,expertise,is_public,account_status,suspension_reason,suspended_at").order("created_at",{ascending:false})
    ]);
    if(ae||ie)setMessage(ae?.message||ie?.message||"Erreur");
    setApps(a||[]);setInstructors(i||[]);
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
  async function suspend(userId:string){
    const reason=window.prompt(t({fr:"Motif de suspension",ar:"سبب التعليق",en:"Suspension reason"}));
    if(reason===null||!reason.trim())return;
    const {error}=await supabase.rpc("suspend_instructor",{p_user_id:userId,p_reason:reason});
    if(error){setMessage(error.message);return} await load();
  }
  async function reactivate(userId:string){
    if(!window.confirm(t({fr:"Réactiver ce formateur ?",ar:"إعادة تفعيل هذا المدرب؟",en:"Reactivate this instructor?"})))return;
    const {error}=await supabase.rpc("reactivate_instructor",{p_user_id:userId});
    if(error){setMessage(error.message);return} await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Marketplace",ar:"السوق",en:"Marketplace"})}</span><h1>{t({fr:"Gestion des formateurs",ar:"إدارة المدربين",en:"Instructor management"})}</h1><p>{t({fr:"Validez les nouveaux profils et suspendez immédiatement un compte en cas de problème.",ar:"وافق على الملفات الجديدة وعلّق أي حساب فوراً عند وجود مشكلة.",en:"Approve new profiles and suspend an instructor immediately when needed."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}

    <h2 className="subhead">{t({fr:"Demandes en attente",ar:"الطلبات المعلقة",en:"Pending applications"})}</h2>
    <div className="application-list">
      {apps.length===0?<article className="panel"><p>{t({fr:"Aucune demande en attente.",ar:"لا توجد طلبات معلقة.",en:"No pending applications."})}</p></article>:apps.map(a=><article className="panel application-card" key={a.id}><div><span className="tag">{a.status}</span><h2>{a.display_name}</h2><p><strong>{a.headline}</strong></p><p>{a.bio}</p><small>{a.expertise}{a.experience_years!=null?" · "+a.experience_years+" ans":""}</small>{a.admin_note&&<p className="manual-note">{a.admin_note}</p>}</div><div className="review-actions vertical"><button className="approve" onClick={()=>approve(a.id)}>{t({fr:"Accepter",ar:"قبول",en:"Approve"})}</button><button className="btn-ghost" onClick={()=>reject(a.id,true)}>{t({fr:"Demander infos",ar:"طلب معلومات",en:"Request info"})}</button><button className="reject" onClick={()=>reject(a.id,false)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div></article>)}
    </div>

    <h2 className="subhead">{t({fr:"Formateurs approuvés",ar:"المدربون المعتمدون",en:"Approved instructors"})}</h2>
    <div className="application-list">
      {instructors.map(i=><article className="panel application-card" key={i.user_id}><div><span className={i.account_status==="active"?"status":"status rejected"}>{i.account_status}</span><h2>{i.display_name}</h2><p><strong>{i.headline}</strong></p><p>{i.expertise}</p>{i.suspension_reason&&<p className="manual-note">{t({fr:"Motif :",ar:"السبب:",en:"Reason:"})} {i.suspension_reason}</p>}</div><div className="review-actions vertical">{i.account_status==="active"?<button className="reject" onClick={()=>suspend(i.user_id)}>{t({fr:"Suspendre",ar:"تعليق",en:"Suspend"})}</button>:<button className="approve" onClick={()=>reactivate(i.user_id)}>{t({fr:"Réactiver",ar:"إعادة تفعيل",en:"Reactivate"})}</button>}</div></article>)}
    </div>
  </div></section>
}
