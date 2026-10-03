"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminSupportPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const {data,error}=await supabase.from("support_cases").select("*,profiles:created_by(full_name,phone)").order("created_at",{ascending:false});
    if(error)setMessage(error.message);else setRows(data||[]);
  }
  useEffect(()=>{load()},[]);

  async function updateCase(row:any,status:string){
    const resolution=window.prompt(t({fr:"Réponse / résolution",ar:"الرد / الحل",en:"Response / resolution"}),row.resolution||"");
    if(resolution===null)return;
    const {error}=await supabase.from("support_cases").update({status,resolution,updated_at:new Date().toISOString()}).eq("id",row.id);
    if(error){setMessage(error.message);return}
    await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Support & litiges",ar:"الدعم والنزاعات",en:"Support & disputes"})}</span><h1>{t({fr:"Demandes utilisateurs",ar:"طلبات المستخدمين",en:"User requests"})}</h1></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="support-admin-list">{rows.map(r=><article className="panel support-admin-card" key={r.id}><div><span className="tag">{r.category}</span><h2>{r.subject}</h2><p>{r.description}</p><small>{r.profiles?.full_name||"Utilisateur"} · {r.profiles?.phone||""} · {new Date(r.created_at).toLocaleString()}</small>{r.resolution&&<p className="manual-note">{r.resolution}</p>}</div><div className="review-actions vertical"><button className="btn-ghost" onClick={()=>updateCase(r,"in_review")}>{t({fr:"En cours",ar:"قيد المراجعة",en:"In review"})}</button><button className="approve" onClick={()=>updateCase(r,"resolved")}>{t({fr:"Résoudre",ar:"حل",en:"Resolve"})}</button><button className="reject" onClick={()=>updateCase(r,"closed")}>{t({fr:"Fermer",ar:"إغلاق",en:"Close"})}</button></div></article>)}</div>
  </div></section>
}
