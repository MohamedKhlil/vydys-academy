"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function PortfolioSettingsPage(){
  const {t}=useLanguage();
  const [profile,setProfile]=useState<any>(null);
  const [displayName,setDisplayName]=useState("");
  const [headline,setHeadline]=useState("");
  const [bio,setBio]=useState("");
  const [github,setGithub]=useState("");
  const [linkedin,setLinkedin]=useState("");
  const [website,setWebsite]=useState("");
  const [isPublic,setIsPublic]=useState(true);
  const [skills,setSkills]=useState(0);
  const [projects,setProjects]=useState(0);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    await supabase.rpc("ensure_my_student_profile");
    const [{data:p},{count:sCount},{count:pCount}]=await Promise.all([
      supabase.from("student_profiles").select("*").eq("user_id",user.id).single(),
      supabase.from("user_skills").select("skill_id",{count:"exact",head:true}).eq("user_id",user.id).eq("verification_status","verified"),
      supabase.from("student_projects").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("status","approved")
    ]);
    if(p){setProfile(p);setDisplayName(p.display_name||"");setHeadline(p.headline||"");setBio(p.bio||"");setGithub(p.github_url||"");setLinkedin(p.linkedin_url||"");setWebsite(p.website_url||"");setIsPublic(Boolean(p.is_public))}
    setSkills(sCount||0);setProjects(pCount||0);
  }
  useEffect(()=>{load()},[]);

  async function save(e:FormEvent){
    e.preventDefault();setMessage("");
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {error}=await supabase.from("student_profiles").update({
      display_name:displayName,headline,bio,github_url:github||null,linkedin_url:linkedin||null,
      website_url:website||null,is_public:isPublic,updated_at:new Date().toISOString()
    }).eq("user_id",user.id);
    setMessage(error?error.message:t({fr:"Portfolio enregistré.",ar:"تم حفظ الملف.",en:"Portfolio saved."}));
    if(!error)await load();
  }

  if(!profile)return <section className="dashboard-shell"><div className="container">...</div></section>;
  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Portfolio</span><h1>{t({fr:"Votre identité professionnelle Tech",ar:"هويتك المهنية التقنية",en:"Your Tech professional identity"})}</h1><p>{t({fr:"Présentez vos projets, compétences vérifiées et certifications aux entreprises.",ar:"اعرض مشاريعك ومهاراتك المعتمدة وشهاداتك للشركات.",en:"Show employers your projects, verified skills and certifications."})}</p></div>{isPublic&&<Link className="btn" href={"/talent/"+profile.public_slug}>{t({fr:"Voir mon portfolio public",ar:"عرض ملفي العام",en:"View public portfolio"})}</Link>}</div>

    <div className="stat-grid"><article className="panel stat"><span>{t({fr:"Compétences vérifiées",ar:"مهارات معتمدة",en:"Verified skills"})}</span><strong>{skills}</strong></article><article className="panel stat"><span>{t({fr:"Projets validés",ar:"مشاريع معتمدة",en:"Approved projects"})}</span><strong>{projects}</strong></article><article className="panel stat"><span>URL</span><strong className="small-stat">/talent/{profile.public_slug}</strong></article></div>

    <form className="panel trainer-form portfolio-form" onSubmit={save}>
      <div className="form-grid"><label className="form-field"><span>{t({fr:"Nom public",ar:"الاسم العام",en:"Public name"})}</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} required/></label><label className="form-field"><span>{t({fr:"Titre professionnel",ar:"المسمى المهني",en:"Professional headline"})}</span><input value={headline} onChange={e=>setHeadline(e.target.value)} placeholder="AI Builder · Data Analyst · Developer"/></label></div>
      <label className="form-field"><span>Bio</span><textarea rows={6} value={bio} onChange={e=>setBio(e.target.value)}/></label>
      <div className="form-grid"><label className="form-field"><span>GitHub</span><input value={github} onChange={e=>setGithub(e.target.value)}/></label><label className="form-field"><span>LinkedIn</span><input value={linkedin} onChange={e=>setLinkedin(e.target.value)}/></label></div>
      <label className="form-field"><span>Website</span><input value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      <label className="checkbox-line"><input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)}/>{t({fr:"Portfolio visible publiquement",ar:"الملف ظاهر للعامة",en:"Public portfolio"})}</label>
      <button className="btn">{t({fr:"Enregistrer",ar:"حفظ",en:"Save"})}</button>{message&&<p className="manual-note">{message}</p>}
    </form>
  </div></section>
}
