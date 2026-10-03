"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

function csvEscape(value:any){
  const s=String(value??"");
  return '"' + s.replace(/"/g,'""') + '"';
}
function downloadCsv(filename:string,headers:string[],rows:any[][]){
  const content=[headers,...rows].map(row=>row.map(csvEscape).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+content],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExportPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [sales,setSales]=useState<any[]>([]);
  const [subscriptions,setSubscriptions]=useState<any[]>([]);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const [{data:s,error:se},{data:subs,error:sue}]=await Promise.all([
      supabase.from("instructor_sales_view").select("*").order("created_at",{ascending:false}),
      supabase.from("trainer_subscriptions").select("id,instructor_id,plan,amount_mru,payment_method,status,starts_at,ends_at,created_at").order("created_at",{ascending:false})
    ]);
    if(se||sue)setMessage(se?.message||sue?.message||"Erreur");
    setSales(s||[]);setSubscriptions(subs||[]);
  })()},[]);

  function exportSales(){
    downloadCsv("vydys-ventes.csv",
      ["Date","Étudiant","Formation","Méthode","Montant MRU","Commission Vydys MRU","Statut","Référence"],
      sales.map(s=>[s.created_at,s.student_name,s.course_title_fr,s.payment_method,s.expected_amount_mru,s.platform_fee_mru,s.status,s.transaction_reference])
    );
  }
  function exportSubscriptions(){
    downloadCsv("vydys-abonnements-formateurs.csv",
      ["Date","Formateur ID","Plan","Montant MRU","Méthode","Statut","Début","Fin"],
      subscriptions.map(s=>[s.created_at,s.instructor_id,s.plan,s.amount_mru,s.payment_method,s.status,s.starts_at,s.ends_at])
    );
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Exports",ar:"التصدير",en:"Exports"})}</span><h1>{t({fr:"Exports financiers",ar:"التقارير المالية",en:"Financial exports"})}</h1><p>{t({fr:"Téléchargez les données de ventes et d’abonnements pour votre comptabilité.",ar:"قم بتنزيل بيانات المبيعات والاشتراكات للمحاسبة.",en:"Download sales and subscription data for accounting."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="export-grid">
      <article className="panel export-card"><span>📊</span><h2>{t({fr:"Ventes marketplace",ar:"مبيعات السوق",en:"Marketplace sales"})}</h2><p>{sales.length} {t({fr:"transactions",ar:"معاملة",en:"transactions"})}</p><button className="btn" onClick={exportSales}>{t({fr:"Télécharger CSV",ar:"تنزيل CSV",en:"Download CSV"})}</button></article>
      <article className="panel export-card"><span>🧾</span><h2>{t({fr:"Abonnements formateurs",ar:"اشتراكات المدربين",en:"Instructor subscriptions"})}</h2><p>{subscriptions.length} {t({fr:"opérations",ar:"عملية",en:"records"})}</p><button className="btn" onClick={exportSubscriptions}>{t({fr:"Télécharger CSV",ar:"تنزيل CSV",en:"Download CSV"})}</button></article>
    </div>
  </div></section>
}
