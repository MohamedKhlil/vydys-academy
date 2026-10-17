"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "./language-provider";
import { trackGrowthEvent } from "../lib/growth-events";

export default function CareerApplyForm({jobId,jobTitle}:{jobId:string;jobTitle:string}){
 const {t}=useLanguage();
 const [uid,setUid]=useState("");
 const [letter,setLetter]=useState("");
 const [existing,setExisting]=useState<string|null>(null);
 const [checking,setChecking]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [complete,setComplete]=useState(false);
 useEffect(()=>{
  let mounted=true;
  (async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!mounted)return;
   setUid(user?.id||"");
   if(user){
    const {data}=await supabase.from("career_applications").select("status").eq("job_id",jobId).eq("applicant_id",user.id).maybeSingle();
    if(mounted)setExisting(data?.status||null);
   }
   if(mounted)setChecking(false);
  })();
  return()=>{mounted=false};
 },[jobId]);
 async function submit(e:FormEvent){
  e.preventDefault();if(busy||!uid)return;
  const content=letter.trim();
  if(content.length<20||content.length>2000){setError(t({fr:"Le message doit contenir de 20 à 2 000 caractères.",ar:"الرسالة يجب أن تحتوي 20 إلى 2000 حرف.",en:"Write between 20 and 2,000 characters."}));return}
  setBusy(true);setError("");
  const {error:err}=await supabase.from("career_applications").insert({job_id:jobId,applicant_id:uid,cover_letter:content,status:"submitted"});
  setBusy(false);
  if(err){setError(err.code==="23505"?t({fr:"Vous avez déjà postulé à cette offre.",ar:"لقد تقدمت لهذه الوظيفة من قبل.",en:"You've already applied for this job."}):err.message);return}
  setComplete(true);setExisting("submitted");
  void trackGrowthEvent("job_application_submitted");
 }
 return <div className="career-apply">
  <span className="eyebrow">APPLY WITH VYDYS</span>
  <h2>{t({fr:"Envoyer ma candidature",ar:"قدم طلب التوظيف",en:"Apply for this role"})}</h2>
  <p>{t({fr:"Votre CV Vydys reste sous votre contrôle. Le recruteur ne reçoit pas votre adresse e-mail automatiquement.",ar:"تظل سيرتك الذاتية تحت سيطرتك، ولا يحصل صاحب العمل على بريدك تلقائياً.",en:"You control your Vydys CV. Your email address is not automatically shared with the employer."})}</p>
  {checking?<p role="status">{t({fr:"Chargement…",ar:"جار التحميل...",en:"Loading…" })}</p>
  :!uid?<div className="career-apply-info"><p>{t({fr:"Connectez-vous pour postuler avec votre profil Vydys.",ar:"سجل الدخول للتقديم عبر ملف Vydys.",en:"Sign in to apply with your Vydys profile."})}</p>
     <Link className="btn" href={"/connexion?mode=register&next="+encodeURIComponent("/carriere/"+jobId)}>{t({fr:"Se connecter / créer un compte",ar:"دخول / إنشاء حساب",en:"Sign in / create account"})}</Link></div>
  :existing||complete?<div role="status" className="career-apply-info">
     <strong>{t({fr:"Candidature enregistrée",ar:"تم تسجيل الطلب",en:"Application recorded"})}</strong>
     <p>{t({fr:"Statut :",ar:"الحالة:",en:"Status:"})} {existing||"submitted"}</p>
     <Link href="/carriere/mes-candidatures">{t({fr:"Suivre ma candidature",ar:"تتبع طلباتي",en:"Track my application"})} →</Link>
   </div>
  :<form onSubmit={e=>void submit(e)} className="career-apply-form">
     <label><span>{t({fr:"Pourquoi ce poste vous intéresse-t-il ?",ar:"لماذا تريد هذه الوظيفة؟",en:"Why are you interested in this position?"})}</span>
       <textarea required minLength={20} maxLength={2000} rows={8} value={letter} onChange={e=>setLetter(e.target.value)}
        placeholder={t({fr:"Présentez brièvement votre motivation et les compétences utiles pour ce poste.",ar:"اشرح دوافعك ومهاراتك المرتبطة بالوظيفة.",en:"Briefly describe your motivation and relevant skills."})}/></label>
     <p>{t({fr:"Consultez votre CV avant d'envoyer une candidature.",ar:"راجع سيرتك الذاتية قبل إرسال الطلب.",en:"Review your CV before you apply."})} <Link href="/portfolio">Vydys Portfolio ↗</Link></p>
     {error&&<p className="career-form-error" role="alert">{error}</p>}
     <button type="submit" className="btn" disabled={busy}>{busy?t({fr:"Envoi…",ar:"جار الإرسال...",en:"Submitting…"}):t({fr:"Envoyer ma candidature",ar:"إرسال الطلب",en:"Submit application"})}</button>
   </form>}
  <small className="career-apply-warning">{t({fr:"Ne payez jamais un recruteur pour obtenir un emploi.",ar:"لا تدفع أي مبلغ للحصول على وظيفة.",en:"Never pay a recruiter to get a job."})}</small>
 </div>;
}
