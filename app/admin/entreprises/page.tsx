"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";
type Company={user_id:string;company_name:string;website:string|null;country:string|null;description:string|null;status:string;created_at:string};
export default function AdminCareerCompanies(){
 const {t}=useLanguage();
 const [authorized,setAuthorized]=useState<boolean|null>(null);
 const [companies,setCompanies]=useState<Company[]>([]);
 const [busy,setBusy]=useState("");
 const [notice,setNotice]=useState("");
 const [me,setMe]=useState("");
 async function refresh(){
  const {data,error}=await supabase.from("career_companies")
    .select("user_id,company_name,website,country,description,status,created_at")
    .order("created_at",{ascending:false}).limit(100);
  if(error)setNotice(error.message);
  setCompanies((data||[]) as Company[]);
 }
 useEffect(()=>{let active=true;(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){if(active)setAuthorized(false);return}
  const {data}=await supabase.from("profiles").select("role").eq("id",user.id).single();
  if(!active)return;
  if(!["admin","direction"].includes(data?.role||"")){setAuthorized(false);return}
  setMe(user.id);setAuthorized(true);await refresh();
 })();return()=>{active=false}},[]);
 async function review(company:Company,status:"approved"|"rejected"){
  if(!me||busy)return;
  if(!window.confirm(t({fr:"Confirmer la décision pour cette entreprise ?",ar:"هل تؤكد قرار الشركة؟",en:"Confirm this employer review?"})))return;
  setBusy(company.user_id);setNotice("");
  const {error}=await supabase.from("career_companies").update({
   status,reviewed_by:me,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()
  }).eq("user_id",company.user_id);
  setBusy("");
  if(error){setNotice(error.message);return}
  await refresh();
 }
 if(authorized===null)return <section className="dashboard-shell"><div className="container"><p>{t({fr:"Vérification des accès…",ar:"جار التحقق من الصلاحيات...",en:"Checking access…"})}</p></div></section>;
 if(!authorized)return <section className="dashboard-shell"><div className="container"><p>{t({fr:"Accès réservé à l'administration Vydys.",ar:"هذه الصفحة مخصصة للإدارة فقط.",en:"Vydys administration only."})}</p><Link href="/connexion">Connexion</Link></div></section>;
 return <section className="dashboard-shell career-employer"><div className="container">
   <div className="dash-header"><div><span className="eyebrow">VYDYS / ADMIN</span><h1>{t({fr:"Validation des entreprises",ar:"التحقق من الشركات",en:"Employer verification"})}</h1><p>{t({fr:"Contrôlez chaque entreprise avant d'autoriser ses offres publiques.",ar:"تحقق من كل شركة قبل السماح بنشر عروضها.",en:"Review companies before allowing public recruitment offers."})}</p></div><Link href="/admin">← Admin</Link></div>
   {!companies.length&&<div className="panel career-empty"><p>{t({fr:"Aucune demande pour le moment.",ar:"لا توجد طلبات.",en:"No requests yet."})}</p></div>}
   <div className="career-admin-grid">{companies.map(c=><article key={c.user_id} className="panel career-workspace-panel">
     <span className="eyebrow">{c.status.toUpperCase()}</span><h2>{c.company_name}</h2>
     <p>{c.country||"—"}</p>{c.description&&<p>{c.description}</p>}
     {c.website&&<p>{t({fr:"Site déclaré :",ar:"الموقع المعلن:",en:"Submitted website:"})} <a href={c.website} target="_blank" rel="noopener noreferrer">{c.website}</a></p>}
     <small>{t({fr:"Demande :",ar:"الطلب:",en:"Request:"})} {new Date(c.created_at).toLocaleDateString()}</small>
     <div className="career-admin-actions">
       <button className="btn" type="button" disabled={Boolean(busy)||c.status==="approved"} onClick={()=>void review(c,"approved")}>{t({fr:"Approuver",ar:"الموافقة",en:"Approve"})}</button>
       <button className="btn btn-ghost" type="button" disabled={Boolean(busy)||c.status==="rejected"} onClick={()=>void review(c,"rejected")}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button>
     </div>
   </article>)}</div>
   {notice&&<p role="status" className="career-form-error">{notice}</p>}
 </div></section>;
}
