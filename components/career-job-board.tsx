"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import { trackGrowthEvent } from "../lib/growth-events";
import type { CareerListing } from "../app/carriere/page";

const labels={
 full_time:{fr:"Temps plein",ar:"دوام كامل",en:"Full time"},
 part_time:{fr:"Temps partiel",ar:"دوام جزئي",en:"Part time"},
 internship:{fr:"Stage",ar:"تدريب",en:"Internship"},
 freelance:{fr:"Freelance",ar:"عمل حر",en:"Freelance"},
 contract:{fr:"Contrat",ar:"عقد",en:"Contract"},
 apprenticeship:{fr:"Apprentissage",ar:"تدريب مهني",en:"Apprenticeship"}
} as const;

export default function CareerJobBoard({jobs,unavailable}:{jobs:CareerListing[];unavailable:boolean}){
 const {lang,t}=useLanguage();
 const [search,setSearch]=useState("");
 const [type,setType]=useState("all");
 const [remote,setRemote]=useState(false);
 const [country,setCountry]=useState("all");
 useEffect(()=>{void trackGrowthEvent("jobs_viewed")},[]);
 const countryList=useMemo(()=>Array.from(new Set(jobs.map(j=>j.country||j.career_companies?.country||"").filter(Boolean))).sort(),[jobs]);
 const filtered=useMemo(()=>jobs.filter(j=>{
   if(type!=="all"&&j.employment_type!==type)return false;
   if(remote&&!j.remote_allowed)return false;
   if(country!=="all"&&(j.country||j.career_companies?.country||"")!==country)return false;
   const haystack=[j.title,j.description,j.career_companies?.company_name,...(j.required_skills||[])].filter(Boolean).join(" ").toLowerCase();
   return haystack.includes(search.trim().toLowerCase());
 }),[jobs,search,type,country,remote]);

 return <div className="career-public">
  <section className="career-hero">
    <div className="container career-hero-inner">
      <div>
        <span className="eyebrow">VYDYS CAREER CONNECT</span>
        <h1>{t({fr:"Transformez vos compétences en opportunités.",ar:"حوّل مهاراتك إلى فرص حقيقية.",en:"Turn your skills into opportunities."})}</h1>
        <p>{t({fr:"Offres d'emploi, stages et missions publiés par des entreprises validées. Découvrez une opportunité et présentez votre CV Vydys.",
          ar:"وظائف وتدريب ومهام تعرضها شركات تمت الموافقة عليها. اكتشف الفرص وقدم سيرتك الذاتية عبر Vydys.",
          en:"Jobs, internships and projects posted by approved companies. Find an opportunity and apply with your Vydys CV."})}</p>
        <div className="career-hero-actions">
          <Link className="btn" href="/portfolio">{t({fr:"Préparer mon CV",ar:"جهز سيرتي الذاتية",en:"Prepare my CV"})} ↗</Link>
          <Link className="btn btn-ghost" href="/carriere/entreprise">{t({fr:"Je recrute",ar:"أريد التوظيف",en:"I'm hiring"})} →</Link>
        </div>
      </div>
      <div className="career-hero-symbol" aria-hidden="true">V<span>+</span></div>
    </div>
  </section>
  <div className="container career-content">
    <div className="career-toplinks"><Link href="/talents">← Vydys Talents</Link><Link href="/carriere/mes-candidatures">{t({fr:"Mes candidatures",ar:"طلباتي",en:"My applications"})} →</Link></div>
    <div className="career-title-row"><div><span className="eyebrow">{t({fr:"Marché de l'emploi",ar:"سوق العمل",en:"Career opportunities"})}</span><h2>{t({fr:"Explorez les opportunités",ar:"استكشف الفرص المتاحة",en:"Explore opportunities"})}</h2></div><strong>{filtered.length} {t({fr:"offre(s)",ar:"فرصة",en:"openings"})}</strong></div>
    <div className="career-filters">
      <label><span>{t({fr:"Métier ou compétence",ar:"المهنة أو المهارة",en:"Role or skill"})}</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Data, AI, Developer…" maxLength={120}/></label>
      <label><span>{t({fr:"Type d'offre",ar:"نوع الفرصة",en:"Type"})}</span><select value={type} onChange={e=>setType(e.target.value)}><option value="all">{t({fr:"Tous",ar:"الكل",en:"All"})}</option>
        {Object.entries(labels).map(([v,label])=><option value={v} key={v}>{t(label)}</option>)}</select></label>
      <label><span>{t({fr:"Pays",ar:"البلد",en:"Country"})}</span><select value={country} onChange={e=>setCountry(e.target.value)}><option value="all">{t({fr:"Tous",ar:"الكل",en:"All"})}</option>{countryList.map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="career-remote"><input type="checkbox" checked={remote} onChange={e=>setRemote(e.target.checked)}/>{t({fr:"Télétravail possible",ar:"العمل عن بعد",en:"Remote possible"})}</label>
    </div>
    {unavailable?<div className="panel career-empty" role="status">{t({fr:"Les offres ne sont pas disponibles pour le moment.",ar:"الوظائف غير متاحة حالياً.",en:"Jobs are temporarily unavailable."})}</div>
     :filtered.length===0?<div className="panel career-empty"><span aria-hidden="true">◇</span><h3>{jobs.length?t({fr:"Aucune offre ne correspond à votre recherche.",ar:"لا توجد فرص مطابقة.",en:"No matching job offers."}):t({fr:"Les premières offres vérifiées arrivent bientôt.",ar:"أولى فرص العمل المعتمدة ستظهر قريباً.",en:"Verified opportunities are coming soon."})}</h3>
      <p>{t({fr:"Seules les offres d'entreprises approuvées sont publiées. Les étudiants peuvent déjà préparer leur CV.",ar:"لا تُنشر إلا عروض الشركات المعتمدة. ويمكن للطلاب إعداد سيرتهم الذاتية الآن.",en:"Only approved companies can publish offers. You can prepare your CV in the meantime."})}</p>
      <Link className="btn" href="/portfolio">{t({fr:"Compléter mon CV",ar:"أكمل سيرتي",en:"Complete my CV"})}</Link></div>
      :<div className="career-cards">{filtered.map(j=><article key={j.id} className="career-card">
        <div className="career-company-mark" aria-hidden="true">{(j.career_companies?.company_name||"V").slice(0,2).toUpperCase()}</div>
        <div className="career-card-body"><small>{j.career_companies?.company_name||"Vydys Employer"}</small><h3>{j.title}</h3>
          <div className="career-tags"><span>{t(labels[j.employment_type as keyof typeof labels]||labels.full_time)}</span>
          {j.remote_allowed&&<span>{t({fr:"Télétravail",ar:"عن بعد",en:"Remote"})}</span>}
          {(j.city||j.country)&&<span>{[j.city,j.country].filter(Boolean).join(" · ")}</span>}</div>
          <p>{j.description.slice(0,175)}{j.description.length>175?"…":""}</p>
          <div className="career-skills">{(j.required_skills||[]).slice(0,5).map(s=><span key={s}>{s}</span>)}</div>
          <Link href={"/carriere/"+encodeURIComponent(j.id)}>{t({fr:"Voir l'offre et postuler",ar:"عرض الوظيفة والتقديم",en:"View and apply"})} ↗</Link>
        </div>
      </article>)}</div>}
    <p className="career-disclaimer">{t({fr:"Vydys vérifie les comptes entreprises avant publication, mais ne garantit pas l'embauche. Ne versez jamais d'argent à un recruteur pour obtenir un emploi.",
      ar:"تتحقق Vydys من حسابات الشركات قبل النشر لكنها لا تضمن التوظيف. لا تدفع مالاً مقابل فرصة عمل.",
      en:"Vydys reviews employer accounts before publication but cannot guarantee a job. Never pay a recruiter to obtain employment."})}</p>
  </div>
 </div>;
}
