"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../components/language-provider";

type Application={id:string;job_id:string;status:string;created_at:string;cover_letter:string};
export default function MyCareerApplications(){
 const {t,lang}=useLanguage();
 const [uid,setUid]=useState("");
 const [rows,setRows]=useState<Application[]>([]);
 const [jobs,setJobs]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(id:string){
  const {data,error}=await supabase.from("career_applications")
   .select("id,job_id,status,created_at,cover_letter").eq("applicant_id",id)
   .order("created_at",{ascending:false}).limit(100);
  setRows((data||[]) as Application[]);
  if(error)setError(error.message);
  const ids=Array.from(new Set((data||[]).map(row=>row.job_id)));
  if(ids.length){
   const {data:offers}=await supabase.from("career_jobs").select("id,title").in("id",ids);
   setJobs(Object.fromEntries((offers||[]).map(offer=>[offer.id,offer.title])));
  }
  setLoading(false);
 }
 useEffect(()=>{let active=true;(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!active)return;
  if(user){setUid(user.id);await load(user.id)}else setLoading(false);
 })();return()=>{active=false}},[]);
 async function withdraw(id:string){
  if(busy||!window.confirm(t({fr:"Retirer cette candidature ?",ar:"سحب هذا الطلب؟",en:"Withdraw this application?"})))return;
  setBusy(true);
  const {error}=await supabase.rpc("career_withdraw_application",{p_application_id:id});
  setBusy(false);
  if(error){setError(error.message);return}
  await load(uid);
 }
 const statusName=(status:string)=>{
  const labels:Record<string,{fr:string;ar:string;en:string}>={
   submitted:{fr:"Envoyée",ar:"تم الإرسال",en:"Submitted"},
   shortlisted:{fr:"Présélectionnée",ar:"مقبولة مبدئياً",en:"Shortlisted"},
   rejected:{fr:"Non retenue",ar:"غير مقبول",en:"Not selected"},
   withdrawn:{fr:"Retirée",ar:"تم السحب",en:"Withdrawn"}
  };
  return labels[status]?t(labels[status]):status;
 };
 return <section className="dashboard-shell career-student-applications"><div className="container">
  <div className="dash-header"><div><span className="eyebrow">VYDYS CAREER CONNECT</span>
    <h1>{t({fr:"Mes candidatures",ar:"طلبات التوظيف الخاصة بي",en:"My job applications"})}</h1>
    <p>{t({fr:"Suivez vos demandes et gardez le contrôle de vos candidatures.",ar:"تابع طلباتك وتحكم فيها.",en:"Track your applications and remain in control."})}</p></div>
    <Link className="btn btn-ghost" href="/carriere">{t({fr:"Explorer les offres",ar:"استكشف العروض",en:"Explore jobs"})} ↗</Link></div>
  {loading&&<p role="status">{t({fr:"Chargement…",ar:"جار التحميل...",en:"Loading…" })}</p>}
  {!loading&&!uid&&<div className="panel career-workspace-panel"><p>{t({fr:"Connectez-vous pour consulter vos candidatures.",ar:"سجل الدخول لعرض طلباتك.",en:"Sign in to view applications."})}</p>
    <Link className="btn" href="/connexion?mode=register&next=%2Fcarriere%2Fmes-candidatures">{t({fr:"Me connecter",ar:"تسجيل الدخول",en:"Sign in"})}</Link></div>}
  {!loading&&uid&&!rows.length&&<div className="panel career-empty"><h2>{t({fr:"Aucune candidature enregistrée",ar:"لا توجد طلبات بعد",en:"No applications yet"})}</h2>
    <p>{t({fr:"Découvrez les offres d'entreprises validées et postulez avec Vydys.",ar:"اكتشف فرص الشركات المعتمدة وقدم عبر Vydys.",en:"Explore verified employer offers and apply with Vydys."})}</p><Link className="btn" href="/carriere">{t({fr:"Voir les offres",ar:"عرض الوظائف",en:"View jobs"})}</Link></div>}
  {rows.length>0&&<div className="career-student-list">{rows.map(a=><article key={a.id} className="panel">
    <span className="eyebrow">{new Date(a.created_at).toLocaleDateString(lang==="ar"?"ar-MR":lang==="en"?"en-GB":"fr-FR")}</span>
    <h2>{jobs[a.job_id]||t({fr:"Offre de recrutement",ar:"فرصة توظيف",en:"Job opportunity"})}</h2>
    <strong>{statusName(a.status)}</strong>
    <p>{a.cover_letter}</p>
    <div className="career-student-actions">
      <Link href={"/carriere/"+encodeURIComponent(a.job_id)}>{t({fr:"Voir l'offre",ar:"عرض الفرصة",en:"View opportunity"})} ↗</Link>
      {["submitted","shortlisted"].includes(a.status)&&<button disabled={busy} type="button" onClick={()=>void withdraw(a.id)}>{t({fr:"Retirer ma candidature",ar:"سحب الطلب",en:"Withdraw application"})}</button>}
    </div>
   </article>)}</div>}
  {error&&<p role="alert" className="career-form-error">{error}</p>}
 </div></section>;
}
