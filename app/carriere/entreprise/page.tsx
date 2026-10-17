"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../components/language-provider";
import { trackGrowthEvent } from "../../../lib/growth-events";

type Company={user_id:string;company_name:string;website:string|null;country:string|null;description:string|null;status:string};
type Job={id:string;title:string;description:string;required_skills:string[];country:string|null;city:string|null;remote_allowed:boolean;employment_type:string;status:string;expires_at:string|null};
type Application={id:string;job_id:string;applicant_id:string;candidate_name:string|null;share_cv:boolean;shared_public_slug:string|null;cover_letter:string;status:string;created_at:string};
const initialJob={id:"",title:"",description:"",skills:"",country:"",city:"",remote_allowed:false,employment_type:"full_time",status:"draft"};

export default function CareerCompanyPage(){
 const {t}=useLanguage();
 const [uid,setUid]=useState("");
 const [company,setCompany]=useState<Company|null>(null);
 const [name,setName]=useState("");
 const [website,setWebsite]=useState("");
 const [country,setCountry]=useState("");
 const [description,setDescription]=useState("");
 const [job,setJob]=useState({...initialJob});
 const [jobs,setJobs]=useState<Job[]>([]);
 const [applications,setApplications]=useState<Application[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [interviewId,setInterviewId]=useState("");
 const [interviewMessage,setInterviewMessage]=useState("");

 async function refresh(userId:string){
   const {data:c}=await supabase.from("career_companies").select("*").eq("user_id",userId).maybeSingle();
   const current=(c||null) as Company|null;setCompany(current);
   if(current){setName(current.company_name);setWebsite(current.website||"");setCountry(current.country||"");setDescription(current.description||"")}
   const {data:j}=await supabase.from("career_jobs").select("*").eq("employer_user_id",userId).order("created_at",{ascending:false});
   const list=(j||[]) as Job[];setJobs(list);
   if(list.length){
     const {data:a}=await supabase.from("career_applications")
       .select("id,job_id,applicant_id,candidate_name,share_cv,shared_public_slug,cover_letter,status,created_at")
       .in("job_id",list.map(row=>row.id)).order("created_at",{ascending:false}).limit(100);
     setApplications((a||[]) as Application[]);
   }else setApplications([]);
   setLoading(false);
 }
 useEffect(()=>{let mounted=true;(async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!mounted)return;
   if(!user){setLoading(false);return}
   setUid(user.id);await refresh(user.id);
 })();return()=>{mounted=false}},[]);

 async function saveCompany(e:FormEvent){
   e.preventDefault();if(!uid||busy)return;
   setBusy(true);setNotice("");
   const values={company_name:name.trim(),website:website.trim()||null,
    country:country.trim()||null,description:description.trim()||null,updated_at:new Date().toISOString()};
   const result=company?await supabase.from("career_companies").update(values).eq("user_id",uid)
    :await supabase.from("career_companies").insert({user_id:uid,...values});
   setBusy(false);
   if(result.error){setNotice(result.error.message);return}
   await refresh(uid);
   if(!company)void trackGrowthEvent("company_application_submitted");
   setNotice(t({fr:"Informations enregistrées. La première validation est réalisée par Vydys.",ar:"تم حفظ البيانات. ستقوم Vydys بمراجعة حساب الشركة.",en:"Information saved. Vydys reviews new employers before publication."}));
 }
 async function saveJob(e:FormEvent){
   e.preventDefault();if(!uid||busy||!company)return;
   setBusy(true);setNotice("");
   const payload={
     employer_user_id:uid,title:job.title.trim(),description:job.description.trim(),
     required_skills:Array.from(new Set(job.skills.split(",").map(s=>s.trim()).filter(Boolean))).slice(0,15),
     country:job.country.trim()||null,city:job.city.trim()||null,
     remote_allowed:job.remote_allowed,employment_type:job.employment_type,
     status:company.status==="approved"?job.status:"draft",updated_at:new Date().toISOString()
   };
   const result=job.id
     ?await supabase.from("career_jobs").update(payload).eq("id",job.id).eq("employer_user_id",uid)
     :await supabase.from("career_jobs").insert(payload);
   setBusy(false);
   if(result.error){setNotice(result.error.message);return}
   setJob({...initialJob});await refresh(uid);
   setNotice(t({fr:"Offre enregistrée.",ar:"تم حفظ العرض.",en:"Job saved."}));
 }
 async function requestInterview(applicationId:string){
   if(busy||!interviewMessage.trim())return;
   setBusy(true);setNotice("");
   const {error}=await supabase.rpc("career_request_applicant_contact",{
     p_application_id:applicationId,p_message:interviewMessage.trim()
   });
   setBusy(false);
   if(error){setNotice(error.message);return}
   setInterviewId("");setInterviewMessage("");
   setNotice(t({fr:"Demande d'entretien envoyée. Le candidat pourra accepter ou refuser.",ar:"تم إرسال طلب المقابلة ويمكن للمتقدم قبوله أو رفضه.",en:"Interview request sent. The applicant can accept or decline."}));
 }
 async function review(id:string,newStatus:"shortlisted"|"rejected"){
   if(busy)return;setBusy(true);setNotice("");
   const {error}=await supabase.rpc("career_review_application",{p_application_id:id,p_status:newStatus});
   setBusy(false);if(error){setNotice(error.message);return}
   await refresh(uid);
 }
 const label=(value:string)=>{
   const map:Record<string,{fr:string;ar:string;en:string}>={
    approved:{fr:"Entreprise validée",ar:"شركة معتمدة",en:"Approved employer"},
    pending:{fr:"Validation en attente",ar:"بانتظار المراجعة",en:"Pending verification"},
    rejected:{fr:"Demande refusée",ar:"طلب مرفوض",en:"Rejected"},
    published:{fr:"Publiée",ar:"منشورة",en:"Published"},
    draft:{fr:"Brouillon",ar:"مسودة",en:"Draft"},
    closed:{fr:"Clôturée",ar:"مغلقة",en:"Closed"},
    submitted:{fr:"Reçue",ar:"مستلمة",en:"Received"},
    shortlisted:{fr:"Présélectionnée",ar:"مقبولة مبدئياً",en:"Shortlisted"}
   };
   return map[value]?t(map[value]):value;
 };

 return <section className="dashboard-shell career-employer">
   <div className="container">
     <div className="dash-header"><div><span className="eyebrow">VYDYS CAREER CONNECT</span>
       <h1>{t({fr:"Espace recruteur",ar:"فضاء الشركات",en:"Employer workspace"})}</h1>
       <p>{t({fr:"Présentez votre entreprise, publiez des opportunités après validation et suivez les candidatures.",ar:"قدّم شركتك وانشر الفرص بعد الموافقة وتابع الطلبات.",en:"Introduce your company, publish roles after approval and review applications."})}</p>
     </div><Link className="btn btn-ghost" href="/carriere">{t({fr:"Offres publiques",ar:"الفرص المتاحة",en:"Public job board"})} ↗</Link></div>
     {!loading&&!uid&&<div className="panel career-workspace-panel"><p>{t({fr:"Connectez-vous pour créer votre espace recruteur.",ar:"سجّل الدخول لإنشاء حساب الشركة.",en:"Sign in to create an employer account."})}</p>
       <Link className="btn" href="/connexion?mode=register&next=%2Fcarriere%2Fentreprise">{t({fr:"Se connecter",ar:"دخول",en:"Sign in"})}</Link></div>}
     {loading&&<p role="status">{t({fr:"Chargement…",ar:"جار التحميل...",en:"Loading…" })}</p>}
     {uid&&<>
       <form className="panel career-workspace-panel" onSubmit={e=>void saveCompany(e)}>
         <div className="career-workspace-head"><div><span className="eyebrow">01 / COMPANY</span><h2>{t({fr:"Profil de votre entreprise",ar:"ملف الشركة",en:"Your company profile"})}</h2></div>
         {company&&<strong className="career-review-state">{label(company.status)}</strong>}</div>
         <p>{t({fr:"La validation par Vydys est obligatoire avant la publication d'offres. Aucun employeur n'est approuvé automatiquement.",ar:"يجب التحقق من الشركة قبل نشر الوظائف. لا تتم الموافقة تلقائياً.",en:"Vydys must approve your company before jobs go public. Approval is never automatic."})}</p>
         <div className="career-form-grid">
           <label><span>{t({fr:"Nom de l'entreprise",ar:"اسم الشركة",en:"Company name"})}</span><input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
           <label><span>{t({fr:"Pays",ar:"البلد",en:"Country"})}</span><input maxLength={90} value={country} onChange={e=>setCountry(e.target.value)}/></label>
           <label><span>{t({fr:"Site web (facultatif)",ar:"الموقع الإلكتروني (اختياري)",en:"Website (optional)"})}</span><input type="url" maxLength={250} placeholder="https://" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
         </div>
         <label><span>{t({fr:"Présentation de l'entreprise",ar:"نبذة عن الشركة",en:"Company description"})}</span>
           <textarea maxLength={1200} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
         <button type="submit" className="btn" disabled={busy}>{company?t({fr:"Enregistrer",ar:"حفظ",en:"Save company"}):t({fr:"Demander la validation",ar:"طلب التحقق",en:"Request verification"})}</button>
       </form>
       {company&&<div className="career-workspace-grid">
         <form className="panel career-workspace-panel" onSubmit={e=>void saveJob(e)}>
           <div className="career-workspace-head"><div><span className="eyebrow">02 / JOBS</span><h2>{t({fr:"Créer une offre",ar:"أنشئ فرصة",en:"Create an opportunity"})}</h2></div></div>
           <label><span>{t({fr:"Titre du poste",ar:"المسمى الوظيفي",en:"Job title"})}</span><input required minLength={5} maxLength={150} value={job.title} onChange={e=>setJob({...job,title:e.target.value})}/></label>
           <label><span>{t({fr:"Description du poste (50 caractères minimum)",ar:"وصف الوظيفة (50 حرفاً على الأقل)",en:"Job description (at least 50 characters)"})}</span><textarea required minLength={50} maxLength={5000} rows={6} value={job.description} onChange={e=>setJob({...job,description:e.target.value})}/></label>
           <label><span>{t({fr:"Compétences requises, séparées par des virgules",ar:"المهارات المطلوبة مفصولة بفواصل",en:"Required skills, comma-separated"})}</span><input maxLength={800} value={job.skills} onChange={e=>setJob({...job,skills:e.target.value})}/></label>
           <div className="career-form-grid">
             <label><span>{t({fr:"Ville",ar:"المدينة",en:"City"})}</span><input maxLength={90} value={job.city} onChange={e=>setJob({...job,city:e.target.value})}/></label>
             <label><span>{t({fr:"Pays",ar:"البلد",en:"Country"})}</span><input maxLength={90} value={job.country} onChange={e=>setJob({...job,country:e.target.value})}/></label>
             <label><span>{t({fr:"Type",ar:"النوع",en:"Type"})}</span><select value={job.employment_type} onChange={e=>setJob({...job,employment_type:e.target.value})}>
               {["full_time","part_time","internship","freelance","contract","apprenticeship"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></label>
           </div>
           <label className="career-check"><input type="checkbox" checked={job.remote_allowed} onChange={e=>setJob({...job,remote_allowed:e.target.checked})}/>{t({fr:"Télétravail possible",ar:"يمكن العمل عن بعد",en:"Remote possible"})}</label>
           <label><span>{t({fr:"Statut",ar:"الحالة",en:"Status"})}</span><select value={job.status} onChange={e=>setJob({...job,status:e.target.value})}>
             <option value="draft">{t({fr:"Brouillon",ar:"مسودة",en:"Draft"})}</option>
             <option value="published" disabled={company.status!=="approved"}>{t({fr:"Publier (entreprise validée)",ar:"نشر (شركة معتمدة)",en:"Publish (verified only)"})}</option>
             <option value="closed">{t({fr:"Clôturée",ar:"مغلقة",en:"Closed"})}</option>
           </select></label>
           <div className="career-form-actions"><button type="submit" className="btn" disabled={busy}>{job.id?t({fr:"Modifier l'offre",ar:"تحديث العرض",en:"Update job"}):t({fr:"Enregistrer l'offre",ar:"حفظ العرض",en:"Save job"})}</button>
             {job.id&&<button type="button" className="btn btn-ghost" onClick={()=>setJob({...initialJob})}>{t({fr:"Annuler",ar:"إلغاء",en:"Cancel"})}</button>}</div>
           {company.status!=="approved"&&<p className="career-muted">{t({fr:"Les offres restent en brouillon jusqu'à la validation de l'entreprise.",ar:"تبقى العروض مسودات حتى الموافقة على الشركة.",en:"Jobs remain drafts until employer verification is approved."})}</p>}
         </form>
         <section className="panel career-workspace-panel">
           <span className="eyebrow">03 / MY JOBS</span><h2>{t({fr:"Mes offres",ar:"عروضي",en:"My jobs"})}</h2>
           {!jobs.length&&<p>{t({fr:"Aucune offre pour le moment.",ar:"لا توجد عروض بعد.",en:"No job offers yet."})}</p>}
           <div className="career-employer-list">{jobs.map(item=><article key={item.id}>
             <div><strong>{item.title}</strong><small>{label(item.status)}</small></div>
             <button type="button" onClick={()=>setJob({id:item.id,title:item.title,description:item.description,
               skills:(item.required_skills||[]).join(", "),country:item.country||"",city:item.city||"",
               remote_allowed:item.remote_allowed,employment_type:item.employment_type,status:item.status})}>{t({fr:"Modifier",ar:"تعديل",en:"Edit"})}</button>
           </article>)}</div>
           <h2>{t({fr:"Candidatures reçues",ar:"طلبات التوظيف",en:"Applications received"})}</h2>
           {!applications.length&&<p>{t({fr:"Aucune candidature reçue.",ar:"لا توجد طلبات.",en:"No applications yet."})}</p>}
           <div className="career-employer-list">{applications.map(a=><article key={a.id} className="career-application-summary">
             <div><strong>{jobs.find(j=>j.id===a.job_id)?.title||"Job"}</strong>
               <small>{a.candidate_name||t({fr:"Candidat",ar:"متقدم",en:"Applicant"})} · {label(a.status)}</small>
               {a.share_cv&&a.shared_public_slug&&<Link className="career-cv-link" href={"/talent/"+encodeURIComponent(a.shared_public_slug)}>{t({fr:"CV partagé volontairement",ar:"السيرة الذاتية المشتركة بموافقة",en:"CV shared with consent"})} ↗</Link>}
               <p>{a.cover_letter}</p>
             </div>
             {a.status==="shortlisted"&&<div className="career-interview-box">
               {interviewId===a.id?<><label><span>{t({fr:"Votre proposition d’entretien",ar:"رسالة طلب المقابلة",en:"Interview proposal"})}</span><textarea minLength={20} maxLength={1000} rows={3} value={interviewMessage} onChange={e=>setInterviewMessage(e.target.value)} /></label><div className="career-application-actions"><button type="button" disabled={busy||interviewMessage.trim().length<20} onClick={()=>void requestInterview(a.id)}>{t({fr:"Envoyer la demande",ar:"إرسال الطلب",en:"Send request"})}</button><button type="button" onClick={()=>setInterviewId("")}>{t({fr:"Annuler",ar:"إلغاء",en:"Cancel"})}</button></div></>:<button className="career-interview-start" type="button" onClick={()=>{setInterviewId(a.id);setInterviewMessage("")}}>{t({fr:"Proposer un entretien",ar:"اقترح مقابلة",en:"Request an interview"})}</button>}</div>}
             {a.status==="submitted"&&<div className="career-application-actions">
               <button type="button" disabled={busy} onClick={()=>void review(a.id,"shortlisted")}>{t({fr:"Présélectionner",ar:"قبول مبدئي",en:"Shortlist"})}</button>
               <button type="button" disabled={busy} onClick={()=>void review(a.id,"rejected")}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button>
             </div>}
           </article>)}</div>
         </section>
       </div>}
       {notice&&<p role="status" className="career-workspace-notice">{notice}</p>}
     </>}
   </div>
 </section>;
}
