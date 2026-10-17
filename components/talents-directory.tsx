"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import type { PublicTalentRow } from "../app/talents/page";

export default function TalentsDirectory({rows,unavailable}:{rows:PublicTalentRow[];unavailable:boolean}){
  const {lang,t}=useLanguage();
  const [query,setQuery]=useState("");
  const [availableOnly,setAvailableOnly]=useState(false);
  const [country,setCountry]=useState("");

  const countries=useMemo(()=>Array.from(new Set(rows
    .map(r=>(r.country||"").trim()).filter(Boolean))).sort(),[rows]);

  const filtered=useMemo(()=>{
    const clean=query.toLocaleLowerCase().trim();
    return rows.filter(row=>{
      if(availableOnly&&!row.open_to_work)return false;
      if(country&&(row.country||"")!==country)return false;
      if(!clean)return true;
      const text=[row.display_name,row.headline,row.city,row.country,...(row.self_reported_skills||[])]
        .filter(Boolean).join(" ").toLocaleLowerCase();
      return text.includes(clean);
    });
  },[rows,query,availableOnly,country]);

  return <section className="talents-directory">
    <div className="talents-hero">
      <div className="container talents-hero-inner">
        <div>
          <span className="eyebrow">VYDYS TALENTS</span>
          <h1>{t({
            fr:"Les compétences de demain. Des profils à découvrir aujourd’hui.",
            ar:"مهارات المستقبل. مواهب يمكنك اكتشافها اليوم.",
            en:"Tomorrow's skills. Talents to discover today."
          })}</h1>
          <p>{t({
            fr:"Découvrez les profils que leurs propriétaires ont choisi de publier : parcours, compétences, projets et réalisations. Une vitrine pour les recruteurs, entreprises et collaborateurs.",
            ar:"تعرّف على الملفات التي اختار أصحابها نشرها: مسارهم ومهاراتهم ومشاريعهم وإنجازاتهم. مساحة لأصحاب العمل والشركات والمتعاونين.",
            en:"Discover profiles whose owners chose to be visible: experience, skills, projects and accomplishments. For recruiters, companies and collaborators."
          })}</p>
        </div>
        <div className="talents-hero-actions">
          <Link className="btn" href="/portfolio">{t({fr:"Créer mon CV sur Vydys",ar:"أنشئ سيرتي الذاتية",en:"Create my Vydys CV"})} ↗</Link>
          <Link className="btn btn-ghost" href="/formations">{t({fr:"Découvrir nos formations",ar:"اكتشف الدورات",en:"Explore courses"})}</Link>
        </div>
      </div>
    </div>
    <div className="container talents-content">
      <div className="talents-content-head">
        <div>
          <span className="eyebrow">{t({fr:"Annuaire de talents",ar:"دليل المواهب",en:"Talent directory"})}</span>
          <h2>{t({fr:"Trouvez les profils qui vous intéressent.",ar:"اعثر على المواهب المناسبة.",en:"Find the people you're looking for."})}</h2>
          <p>{t({
            fr:"Seuls les profils ayant explicitement activé leur présence dans cet annuaire sont affichés.",
            ar:"تظهر هنا فقط الملفات التي اختار أصحابها الظهور في هذا الدليل.",
            en:"Only profiles that explicitly opted in to this public directory are listed."
          })}</p>
        </div>
        <strong className="talents-count">{filtered.length} {t({fr:"profil(s)",ar:"ملف",en:"profiles"})}</strong>
      </div>
      <div className="talents-filters">
        <label className="talents-search">
          <span>{t({fr:"Nom, métier ou compétence",ar:"الاسم أو المهنة أو المهارة",en:"Name, role or skill"})}</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t({
            fr:"Ex. développeur, Python, Data…",
            ar:"مثال: مطور، Python، بيانات...",
            en:"e.g. developer, Python, Data…"
          })} type="search" maxLength={100}/>
        </label>
        <label className="talents-filter-select">
          <span>{t({fr:"Pays",ar:"البلد",en:"Country"})}</span>
          <select value={country} onChange={e=>setCountry(e.target.value)}>
            <option value="">{t({fr:"Tous les pays",ar:"جميع البلدان",en:"All countries"})}</option>
            {countries.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="talents-work-check">
          <input type="checkbox" checked={availableOnly} onChange={e=>setAvailableOnly(e.target.checked)}/>
          {t({fr:"Ouvert aux opportunités",ar:"متاح للفرص",en:"Open to opportunities"})}
        </label>
      </div>
      {unavailable&&<div role="status" className="talents-empty panel"><p>{t({
        fr:"L’annuaire est momentanément indisponible. Réessayez plus tard.",
        ar:"الدليل غير متاح حالياً. حاول لاحقاً.",
        en:"The directory is temporarily unavailable. Try again later."
      })}</p></div>}
      {!unavailable&&filtered.length===0&&<div className="talents-empty panel">
        <div className="talents-empty-icon" aria-hidden="true">◎</div>
        <h3>{rows.length===0?t({
          fr:"Les premiers profils arrivent bientôt.",
          ar:"ستظهر أولى الملفات قريباً.",
          en:"The first profiles are coming soon."
        }):t({fr:"Aucun profil ne correspond à votre recherche.",ar:"لا توجد نتائج مطابقة.",en:"No matching profiles found."})}</h3>
        <p>{rows.length===0?t({
          fr:"Les étudiants peuvent créer leur CV dans Vydys, puis décider librement de figurer dans l’annuaire.",
          ar:"يمكن للطلاب إنشاء سيرتهم الذاتية على Vydys ثم اختيار الظهور في الدليل.",
          en:"Learners can create their CV on Vydys and choose whether to appear in this directory."
        }):t({fr:"Essayez un autre nom, métier ou compétence.",ar:"جرب اسماً أو وظيفة أو مهارة أخرى.",en:"Try another name, role or skill."})}</p>
        <Link href="/portfolio" className="btn">{t({fr:"Compléter mon profil",ar:"أكمل ملفي",en:"Complete my profile"})}</Link>
      </div>}
      {!unavailable&&filtered.length>0&&<div className="talents-card-grid">
        {filtered.map(person=><article className="talents-person" key={person.public_slug}>
          <div className="talents-person-top">
            <div className="talents-avatar" aria-hidden="true">{person.display_name.trim().slice(0,2).toLocaleUpperCase()}</div>
            {person.open_to_work&&<span className="talents-available">{t({fr:"Ouvert aux opportunités",ar:"متاح للفرص",en:"Open to work"})}</span>}
          </div>
          <h3>{person.display_name}</h3>
          <p className="talents-headline">{person.headline||t({fr:"Membre de la communauté Vydys",ar:"عضو في مجتمع Vydys",en:"Vydys community member"})}</p>
          {(person.city||person.country)&&<span className="talents-location">{[person.city,person.country].filter(Boolean).join(" · ")}</span>}
          {person.bio&&<p className="talents-person-bio">{person.bio.slice(0,130)}{person.bio.length>130?"…":""}</p>}
          <div className="talents-skill-tags">
            {(person.self_reported_skills||[]).slice(0,4).map(tag=><span key={tag}>{tag}</span>)}
          </div>
          <Link className="talents-profile-link" href={"/talent/"+encodeURIComponent(person.public_slug)}>
            {t({fr:"Voir le CV et les réalisations",ar:"عرض السيرة والإنجازات",en:"View CV and portfolio"})} <span aria-hidden="true">↗</span>
          </Link>
        </article>)}
      </div>}
      <div className="talents-directory-note">{t({
        fr:"Les informations de CV sont renseignées par leurs auteurs. Les compétences vérifiées et certifications Vydys sont identifiées séparément sur les profils.",
        ar:"بيانات السيرة الذاتية يضيفها أصحابها. وتُميّز مهارات وشهادات Vydys المعتمدة بشكل منفصل.",
        en:"CV information is supplied by profile owners. Vydys-verified skills and certificates are labeled separately on profiles."
      })}</div>
    </div>
  </section>;
}
