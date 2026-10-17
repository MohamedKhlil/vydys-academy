"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";
import TalentContactForm from "./talent-contact-form";

type Profile={
  public_slug:string;display_name:string|null;headline:string|null;bio:string|null;
  avatar_url:string|null;github_url:string|null;linkedin_url:string|null;website_url:string|null;
  city:string|null;country:string|null;open_to_work:boolean;discoverable:boolean;
  self_reported_skills:string[];
};
type SkillRow={
  level:string;verification_status:string;
  skills:{name_fr:string|null;name_ar:string|null;name_en:string|null;category:string|null}|null
};
type ProjectRow={
  id:string;title:string;summary:string;tech_stack:string[];github_url:string|null;demo_url:string|null
};
type CertificateRow={
  certificate_code:string;issued_at:string;
  courses:{title_fr:string|null;title_ar:string|null;title_en:string|null}|null
};
type EducationRow={
  id:string;institution:string;degree:string;field_of_study:string|null;
  started_on:string|null;ended_on:string|null;description:string|null
};
type ExperienceRow={
  id:string;job_title:string;organization:string;employment_type:string|null;
  started_on:string|null;ended_on:string|null;description:string|null
};

function validExternal(url:string|null|undefined){
  if(!url)return "";
  try{const parsed=new URL(url);return ["http:","https:"].includes(parsed.protocol)?parsed.toString():""}
  catch{return ""}
}

export default function TalentProfileClient({
  profile,skills,projects,certs,education,experience
}:{
  profile:Profile;skills:SkillRow[];projects:ProjectRow[];
  certs:CertificateRow[];education:EducationRow[];experience:ExperienceRow[]
}){
  const {lang,t}=useLanguage();
  const locale=lang==="ar"?"ar-MR":lang==="en"?"en-GB":"fr-FR";
  const localized=(item:{name_fr:string|null;name_ar:string|null;name_en:string|null})=>
    (lang==="ar"?item.name_ar||item.name_fr||item.name_en:
    lang==="en"?item.name_en||item.name_fr||item.name_ar:item.name_fr||item.name_en||item.name_ar)||"";
  const localCourse=(row:CertificateRow["courses"])=>
    row?(lang==="ar"?row.title_ar||row.title_fr||row.title_en:
    lang==="en"?row.title_en||row.title_fr||row.title_ar:
    row.title_fr||row.title_en||row.title_ar)||"": "";
  const printDate=(value:string|null)=>value
    ?new Intl.DateTimeFormat(locale,{month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(value+"T12:00:00Z")):"";
  const range=(start:string|null,end:string|null)=>
    [printDate(start),end?printDate(end):(start?t({fr:"Aujourd’hui",ar:"حتى الآن",en:"Present"}):"")].filter(Boolean).join(" – ");
  const skillsByGroup=new Map<string,SkillRow[]>();
  for(const row of skills){
    if(!row.skills||row.verification_status!=="verified")continue;
    const group=row.skills.category||"Tech";
    const groupRows=skillsByGroup.get(group)||[];
    groupRows.push(row);skillsByGroup.set(group,groupRows);
  }
  const linkRows=[
    {label:"LinkedIn",url:validExternal(profile.linkedin_url)},
    {label:"GitHub",url:validExternal(profile.github_url)},
    {label:t({fr:"Site web",ar:"موقع إلكتروني",en:"Website"}),url:validExternal(profile.website_url)}
  ].filter(item=>item.url);

  return <section className="talent-cv" aria-labelledby="talent-name">
    <div className="container">
      <div className="talent-cv-topbar">
        <Link href="/talents">← {t({fr:"Annuaire des talents",ar:"دليل المواهب",en:"Talent directory"})}</Link>
        <div>
          <button type="button" onClick={()=>window.print()}>{t({fr:"Imprimer / enregistrer en PDF",ar:"طباعة / حفظ PDF",en:"Print / save as PDF"})}</button>
          <Link href="/portfolio">{t({fr:"Gérer mon CV",ar:"إدارة سيرتي",en:"Manage my CV"})}</Link>
        </div>
      </div>
      <header className="talent-cv-hero">
        <div className="talent-cv-avatar" aria-hidden="true">{(profile.display_name||"V").slice(0,2).toLocaleUpperCase()}</div>
        <div className="talent-cv-hero-main">
          <span className="talent-cv-label">VYDYS / TALENT PROFILE</span>
          <h1 id="talent-name">{profile.display_name||"Vydys Talent"}</h1>
          {profile.headline&&<h2>{profile.headline}</h2>}
          {(profile.city||profile.country)&&<p className="talent-cv-location">{[profile.city,profile.country].filter(Boolean).join(" · ")}</p>}
          {profile.bio&&<p className="talent-cv-bio">{profile.bio}</p>}
          {linkRows.length>0&&<div className="talent-cv-socials">
            {linkRows.map(item=><a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>)}
          </div>}
        </div>
        {profile.open_to_work&&<div className="talent-open-badge">{t({fr:"Ouvert aux opportunités",ar:"متاح للفرص",en:"Open to opportunities"})}</div>}
      </header>
      <div className="talent-cv-content">
        <div className="talent-cv-main">
          {experience.length>0&&<section className="talent-cv-section">
            <h2>{t({fr:"Expériences professionnelles",ar:"الخبرات المهنية",en:"Work experience"})}</h2>
            <div className="talent-cv-timeline">{experience.map(item=><article key={item.id}>
              <span aria-hidden="true" className="talent-timeline-dot"/>
              <div><h3>{item.job_title}</h3><strong>{item.organization}</strong>
                {(item.started_on||item.ended_on)&&<small>{range(item.started_on,item.ended_on)}</small>}
                {item.description&&<p>{item.description}</p>}
              </div>
            </article>)}</div>
          </section>}
          {education.length>0&&<section className="talent-cv-section">
            <h2>{t({fr:"Diplômes et formation",ar:"الشهادات والدراسة",en:"Education and degrees"})}</h2>
            <div className="talent-cv-timeline">{education.map(item=><article key={item.id}>
              <span aria-hidden="true" className="talent-timeline-dot"/>
              <div><h3>{item.degree}</h3><strong>{item.institution}</strong>
                {item.field_of_study&&<p>{item.field_of_study}</p>}
                {(item.started_on||item.ended_on)&&<small>{range(item.started_on,item.ended_on)}</small>}
                {item.description&&<p>{item.description}</p>}
              </div>
            </article>)}</div>
          </section>}
          {projects.length>0&&<section className="talent-cv-section">
            <div className="talent-cv-section-heading"><h2>{t({fr:"Projets validés par Vydys",ar:"مشاريع اعتمدها Vydys",en:"Vydys-approved projects"})}</h2>
              <span>{projects.length}</span></div>
            <div className="talent-cv-projects">{projects.map(item=><article key={item.id}>
              <span className="talent-verified-badge">✓ {t({fr:"Projet validé",ar:"مشروع معتمد",en:"Approved project"})}</span>
              <h3>{item.title}</h3><p>{item.summary}</p>
              {item.tech_stack?.length>0&&<div className="talent-cv-tags">{item.tech_stack.map(v=><span key={v}>{v}</span>)}</div>}
              <div className="talent-cv-links">
                {validExternal(item.github_url)&&<a href={validExternal(item.github_url)} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
                {validExternal(item.demo_url)&&<a href={validExternal(item.demo_url)} target="_blank" rel="noopener noreferrer">Demo ↗</a>}
              </div>
            </article>)}</div>
          </section>}
          {certs.length>0&&<section className="talent-cv-section">
            <h2>{t({fr:"Certifications Vydys",ar:"شهادات Vydys",en:"Vydys certificates"})}</h2>
            <div className="talent-cv-certs">{certs.map(item=><a key={item.certificate_code}
              href={"/certificat/"+encodeURIComponent(item.certificate_code)}>
              <span aria-hidden="true">V</span><div><strong>{localCourse(item.courses)}</strong>
                <small>{item.certificate_code} · {new Date(item.issued_at).toLocaleDateString(locale)}</small></div><b aria-hidden="true">↗</b>
            </a>)}</div>
          </section>}
        </div>
        <aside className="talent-cv-sidebar">
          <TalentContactForm slug={profile.public_slug} available={profile.discoverable&&profile.open_to_work}/>
          <div className="talent-cv-sidecard">
            <h2>{t({fr:"Compétences vérifiées",ar:"المهارات المعتمدة",en:"Verified skills"})}</h2>
            {Array.from(skillsByGroup).length>0?Array.from(skillsByGroup).map(([category,rows])=>
              <div key={category} className="talent-cv-skill-group">
                <strong>{category}</strong>
                <div>{rows.map((row,i)=><span key={i}>✓ {localized(row.skills!)}{row.level?" · "+row.level:""}</span>)}</div>
              </div>):
              <p>{t({fr:"Aucune compétence vérifiée affichée pour le moment.",ar:"لا توجد مهارات معتمدة للعرض حالياً.",en:"No verified skills to display yet."})}</p>}
          </div>
          {(profile.self_reported_skills||[]).length>0&&<div className="talent-cv-sidecard">
            <h2>{t({fr:"Autres compétences",ar:"مهارات أخرى",en:"Other skills"})}</h2>
            <p className="talent-cv-clarifier">{t({
              fr:"Renseignées par le titulaire du CV — non vérifiées par Vydys.",
              ar:"أضافها صاحب السيرة الذاتية ولم تتحقق منها Vydys.",
              en:"Self-reported by the profile owner — not verified by Vydys."
            })}</p>
            <div className="talent-cv-tags">{profile.self_reported_skills.map(skill=><span key={skill}>{skill}</span>)}</div>
          </div>}
          <div className="talent-cv-sidecard talent-cv-help">
            <h2>{t({fr:"À propos de ce profil",ar:"حول هذا الملف",en:"About this profile"})}</h2>
            <p>{t({
              fr:"Diplômes et expériences sont déclarés par cette personne. Seuls les projets validés et les compétences vérifiées portent explicitement une mention de validation Vydys.",
              ar:"الدراسة والخبرات معلومات يضيفها صاحب الحساب. المشاريع المعتمدة والمهارات الموثقة فقط تحمل علامة تحقق Vydys.",
              en:"Education and work history are self-reported. Only approved projects and verified skills are explicitly labeled as validated by Vydys."
            })}</p>
            {profile.discoverable&&<Link href="/talents">{t({fr:"Découvrir d’autres talents",ar:"اكتشف مواهب أخرى",en:"Discover more talent"})} →</Link>}
          </div>
        </aside>
      </div>
    </div>
  </section>;
}
