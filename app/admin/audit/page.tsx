"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminAuditPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [rows,setRows]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const {data,error}=await supabase.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,metadata,created_at").order("created_at",{ascending:false}).limit(300);
    if(error)setMessage(error.message);else setRows(data||[]);
  })()},[]);

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Sécurité",ar:"الأمان",en:"Security"})}</span><h1>{t({fr:"Journal d’audit",ar:"سجل التدقيق",en:"Audit log"})}</h1><p>{t({fr:"Historique des modifications sensibles sur les paiements, formations, formateurs et avis.",ar:"سجل التغييرات الحساسة في المدفوعات والدورات والمدربين والتقييمات.",en:"History of sensitive changes to payments, courses, instructors and reviews."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="audit-table">
      <div className="audit-row audit-head"><span>{t({fr:"Date",ar:"التاريخ",en:"Date"})}</span><span>{t({fr:"Action",ar:"الإجراء",en:"Action"})}</span><span>{t({fr:"Type",ar:"النوع",en:"Type"})}</span><span>ID</span></div>
      {rows.map(r=><details className="audit-item" key={r.id}><summary className="audit-row"><span>{new Date(r.created_at).toLocaleString()}</span><span>{r.action}</span><span>{r.entity_type}</span><span>{r.entity_id||"—"}</span></summary><pre>{JSON.stringify(r.metadata,null,2)}</pre></details>)}
    </div>
  </div></section>
}
