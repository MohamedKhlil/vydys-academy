"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function TalentPage(){
  const {slug}=useParams<{slug:string}>();
  const {lang,t}=useLanguage();
  const [profile,setProfile]=useState<any>(null);
  const [skills,setSkills]=useState<any[]>([]);
  const [projects,setProjects]=useState<any[]>([]);
  const [certs,setCerts]=useState<any[]>([]);

  useEffect(()=>{(async()=>{
    const {data:p}=await supabase.from("student_profiles").select("*").eq("public_slug",slug).eq("is_public",true).single();
    if(!p){setProfile(false);return}setProfile(p);
    const [{data:s},{data:pr},{data:c}]=await Promise.all([
      supabase.from("user_skills").select("level,verification_status,source_type,skills:skill_id(name_fr,name_ar,name_en,category)").eq("user_id",p.user_id),
      supabase.from("student_projects").select("id,title,summary,problem,solution,tech_stack,github_url,demo_url,created_at").eq("user_id",p.user_id).eq("status","approved").eq("is_public",true).order("reviewed_at",{ascending:false}),
      supabase.from("certificates").select("certificate_code,issued_at,courses:course_id(title_fr,title_ar,title_en)").eq("user_id",p.user_id).order("issued_at",{ascending:false})
    ]);
    setSkills(s||[]);setProjects(pr||[]);setCerts(c||[]);
  })()},[slug]);

  const grouped=useMemo(()=>skills.reduce((a:any,r:any)=>{const k=r.skills?.category||"Tech";(a[k]??=[]).push(r);return a},{}),[skills]);
  const localSkill=(s:any)=>lang==="ar"?s.name_ar:lang==="en"?s.name_en:s.name_fr;
  const localCourse=(c:any)=>lang==="ar"?(c?.title_ar||c?.title_fr):lang==="en"?(c?.title_en||c?.title_fr):c?.title_fr;

  if(profile===null)return <section className="section page-top"><div className="container">...</div></section>;
  if(profile===false)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Portfolio introuvable",ar:"الملف غير موجود",en:"Portfolio not found"})}</h1></article></div></section>;

  return <section className="talent-page"><div className="container">
    <div className="talent-hero"><div className="talent-avatar">{profile.display_name?.slice(0,2).toUpperCase()||"V"}</div><div><span className="eyebrow">Vydys Talent</span><h1>{profile.display_name}</h1><h2>{profile.headline}</h2><p>{profile.bio}</p><div className="talent-links">{profile.github_url&&<a href={profile.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{profile.linkedin_url&&<a href={profile.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>}{profile.website_url&&<a href={profile.website_url} target="_blank" rel="noreferrer">Website ↗</a>}</div></div><div className="verified-profile"><span>✓</span><strong>{t({fr:"Profil Vydys",ar:"ملف Vydys",en:"Vydys Profile"})}</strong></div></div>

    <section className="talent-section"><h2>{t({fr:"Compétences vérifiées",ar:"المهارات المعتمدة",en:"Verified skills"})}</h2>{skills.length===0?<p>{t({fr:"Aucune compétence affichée.",ar:"لا توجد مهارات معروضة.",en:"No skills displayed."})}</p>:Object.entries(grouped).map(([cat,items]:any)=><div className="talent-skill-group" key={cat}><strong>{cat}</strong><div>{items.map((r:any)=><span className="talent-skill" key={r.skills.name_fr}>✓ {localSkill(r.skills)} · {r.level}</span>)}</div></div>)}</section>

    <section className="talent-section"><h2>{t({fr:"Projets validés",ar:"المشاريع المعتمدة",en:"Approved projects"})}</h2><div className="portfolio-project-grid">{projects.map(p=><article className="panel portfolio-project" key={p.id}><span className="tag">Verified Project</span><h3>{p.title}</h3><p>{p.summary}</p>{p.tech_stack?.length>0&&<div className="tech-stack">{p.tech_stack.map((x:string)=><span key={x}>{x}</span>)}</div>}<div className="project-links">{p.github_url&&<a href={p.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{p.demo_url&&<a href={p.demo_url} target="_blank" rel="noreferrer">Live Demo ↗</a>}</div></article>)}</div></section>

    <section className="talent-section"><h2>{t({fr:"Certifications Vydys",ar:"شهادات Vydys",en:"Vydys certifications"})}</h2><div className="certificate-mini-grid">{certs.map(c=><a className="panel certificate-mini" href={"/certificat/"+c.certificate_code} key={c.certificate_code}><span>V</span><div><strong>{localCourse(c.courses)}</strong><small>{c.certificate_code} · {new Date(c.issued_at).toLocaleDateString()}</small></div></a>)}</div></section>
  </div></section>
}
