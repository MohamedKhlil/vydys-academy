"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function InstructorProjectsPage(){
  const {lang,t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [projects,setProjects]=useState<any[]>([]);
  const [names,setNames]=useState<Record<string,string>>({});
  const [skills,setSkills]=useState<Record<string,any[]>>({});
  const [message,setMessage]=useState("");

  function localSkill(s:any){return lang==="ar"?s.name_ar:lang==="en"?s.name_en:s.name_fr}

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="instructor";setAllowed(ok);if(!ok)return;
    const {data:courses}=await supabase.from("courses").select("id,title_fr").eq("instructor_id",user.id);
    const ids=(courses||[]).map((c:any)=>c.id);
    if(!ids.length){setProjects([]);return}
    const {data:pr,error}=await supabase.from("student_projects").select("*,courses:course_id(title_fr)").in("course_id",ids).order("updated_at",{ascending:false});
    if(error){setMessage(error.message);return}
    setProjects(pr||[]);
    const userIds=[...new Set((pr||[]).map((x:any)=>x.user_id))];
    if(userIds.length){
      const {data:ps}=await supabase.from("profiles").select("id,full_name").in("id",userIds);
      const nm:Record<string,string>={};(ps||[]).forEach((x:any)=>nm[x.id]=x.full_name);setNames(nm);
    }
    const projectIds=(pr||[]).map((x:any)=>x.id);
    if(projectIds.length){
      const {data:sk}=await supabase.from("project_skills").select("project_id,skills:skill_id(name_fr,name_ar,name_en)").in("project_id",projectIds);
      const sm:Record<string,any[]>={};(sk||[]).forEach((x:any)=>(sm[x.project_id]??=[]).push(x.skills));setSkills(sm);
    }
  }
  useEffect(()=>{load()},[]);

  async function review(project:any,status:"approved"|"revision_required"){
    const feedback=window.prompt(status==="approved"?t({fr:"Feedback de validation",ar:"ملاحظة الاعتماد",en:"Approval feedback"}):t({fr:"Corrections demandées",ar:"التعديلات المطلوبة",en:"Requested changes"}),project.instructor_feedback||"");
    if(feedback===null)return;
    const {error}=await supabase.rpc("review_student_project",{p_project_id:project.id,p_status:status,p_feedback:feedback});
    if(error){setMessage(error.message);return}
    setMessage(status==="approved"?t({fr:"Projet validé et compétences attribuées.",ar:"تم اعتماد المشروع وإضافة المهارات.",en:"Project approved and skills awarded."}):t({fr:"Projet renvoyé pour révision.",ar:"تم إرجاع المشروع للمراجعة.",en:"Project returned for revision."}));
    await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Projects</span><h1>{t({fr:"Validation des projets étudiants",ar:"اعتماد مشاريع الطلاب",en:"Student project review"})}</h1><p>{t({fr:"La validation transforme un projet en preuve publique et attribue les compétences associées.",ar:"الاعتماد يحوّل المشروع إلى دليل عام ويمنح المهارات المرتبطة به.",en:"Approval turns a project into public evidence and awards its mapped skills."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="project-review-grid">{projects.length===0?<article className="panel"><p>{t({fr:"Aucun projet étudiant.",ar:"لا توجد مشاريع طلاب.",en:"No student projects yet."})}</p></article>:projects.map(p=><article className="panel project-review-card" key={p.id}><div className="project-card-head"><span className={p.status==="approved"?"status":"status pending"}>{p.status}</span><small>{p.courses?.title_fr}</small></div><h2>{p.title}</h2><p className="project-student">{names[p.user_id]||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</p><p>{p.summary}</p>{p.problem&&<div className="project-detail"><strong>{t({fr:"Problème",ar:"المشكلة",en:"Problem"})}</strong><p>{p.problem}</p></div>}{p.solution&&<div className="project-detail"><strong>{t({fr:"Solution",ar:"الحل",en:"Solution"})}</strong><p>{p.solution}</p></div>}{skills[p.id]?.length>0&&<div className="tech-stack">{skills[p.id].map((s:any)=><span key={s.name_fr}>✓ {localSkill(s)}</span>)}</div>}<div className="project-links">{p.github_url&&<a href={p.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{p.demo_url&&<a href={p.demo_url} target="_blank" rel="noreferrer">Demo ↗</a>}</div>{p.instructor_feedback&&<p className="feedback-box">{p.instructor_feedback}</p>}{p.status==="submitted"&&<div className="review-actions"><button className="approve" onClick={()=>review(p,"approved")}>{t({fr:"Valider",ar:"اعتماد",en:"Approve"})}</button><button className="reject" onClick={()=>review(p,"revision_required")}>{t({fr:"Demander révision",ar:"طلب مراجعة",en:"Request revision"})}</button></div>}</article>)}</div>
  </div></section>
}
