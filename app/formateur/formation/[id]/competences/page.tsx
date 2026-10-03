"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../../components/language-provider";
import { supabase } from "../../../../../lib/supabase";

export default function CourseSkillsPage(){
  const {id}=useParams<{id:string}>();
  const {lang,t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [course,setCourse]=useState<any>(null);
  const [skills,setSkills]=useState<any[]>([]);
  const [selected,setSelected]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");

  function local(s:any){return lang==="ar"?s.name_ar:lang==="en"?s.name_en:s.name_fr}

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:c}=await supabase.from("courses").select("id,title_fr,instructor_id").eq("id",id).single();
    const ok=c?.instructor_id===user.id;setAllowed(ok);if(!ok)return;setCourse(c);
    const [{data:s},{data:m}]=await Promise.all([
      supabase.from("skills").select("*").eq("is_active",true).order("category").order("name_fr"),
      supabase.from("course_skills").select("skill_id,target_level").eq("course_id",id)
    ]);
    setSkills(s||[]);
    const map:Record<string,string>={};(m||[]).forEach((x:any)=>map[x.skill_id]=x.target_level);setSelected(map);
  }
  useEffect(()=>{load()},[id]);

  async function toggle(skillId:string,checked:boolean){
    setMessage("");
    if(checked){
      const level=selected[skillId]||"beginner";
      const {error}=await supabase.from("course_skills").insert({course_id:id,skill_id:skillId,target_level:level});
      if(error){setMessage(error.message);return}
      setSelected(v=>({...v,[skillId]:level}));
    }else{
      const {error}=await supabase.from("course_skills").delete().eq("course_id",id).eq("skill_id",skillId);
      if(error){setMessage(error.message);return}
      setSelected(v=>{const n={...v};delete n[skillId];return n});
    }
  }

  async function setLevel(skillId:string,level:string){
    const {error}=await supabase.from("course_skills").update({target_level:level}).eq("course_id",id).eq("skill_id",skillId);
    if(error){setMessage(error.message);return}
    setSelected(v=>({...v,[skillId]:level}));
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  const categories=Array.from(new Set(skills.map(s=>s.category)));
  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Skills Mapping</span><h1>{course?.title_fr}</h1><p>{t({fr:"Définissez les compétences réellement acquises dans cette formation. Elles pourront être ajoutées au Skills Passport après validation.",ar:"حدد المهارات المكتسبة فعلياً في هذه الدورة ليتم إضافتها إلى جواز المهارات بعد الاعتماد.",en:"Define the skills students truly gain. They can be added to the Skills Passport after validation."})}</p></div><a className="btn btn-ghost" href={"/formateur/formation/"+id+"/builder"}>{t({fr:"← Course Builder",ar:"← منشئ الدورة",en:"← Course Builder"})}</a></div>
    {message&&<p className="manual-note">{message}</p>}
    {categories.map(cat=><section className="skill-map-section" key={cat}><h2>{cat}</h2><div className="skill-map-grid">{skills.filter(s=>s.category===cat).map(s=>{const active=Boolean(selected[s.id]);return <article className={active?"panel skill-map-card selected":"panel skill-map-card"} key={s.id}><label><input type="checkbox" checked={active} onChange={e=>toggle(s.id,e.target.checked)}/><div><strong>{local(s)}</strong><p>{s.description}</p></div></label>{active&&<select value={selected[s.id]} onChange={e=>setLevel(s.id,e.target.value)}><option value="beginner">{t({fr:"Débutant",ar:"مبتدئ",en:"Beginner"})}</option><option value="intermediate">{t({fr:"Intermédiaire",ar:"متوسط",en:"Intermediate"})}</option><option value="advanced">{t({fr:"Avancé",ar:"متقدم",en:"Advanced"})}</option><option value="expert">Expert</option></select>}</article>})}</div></section>)}
  </div></section>
}
