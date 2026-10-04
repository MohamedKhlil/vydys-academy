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
  const [feedbacks,setFeedbacks]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
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
    setFeedbacks(v=>{
      const next={...v};
      (pr||[]).forEach((x:any)=>{if(next[x.id]===undefined)next[x.id]=x.instructor_feedback||""});
      return next;
    });
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
    const feedback=(feedbacks[project.id]||"").trim();
    if(!feedback){
      setMessage(t({fr:"Ajoutez un feedback avant de valider ou demander une révision.",ar:"أضف ملاحظة قبل الاعتماد أو طلب المراجعة.",en:"Add feedback before approving or requesting revision."}));
      return;
    }
    setBusy(project.id);setMessage("");
    const {error}=await supabase.rpc("review_student_project",{p_project_id:project.id,p_status:status,p_feedback:feedback});
    setBusy(null);
    if(error){setMessage(error.message);return}
    setMessage(status==="approved"?t({fr:"Projet validé et compétences attribuées.",ar:"تم اعتماد المشروع وإضافة المهارات.",en:"Project approved and skills awarded."}):t({fr:"Projet renvoyé pour révision.",ar:"تم إرجاع المشروع للمراجعة.",en:"Project returned for revision."}));
    await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Projects</span><h1>{t({fr:"Validation des projets étudiants",ar:"اعتماد مشاريع الطلاب",en:"Student project review"})}</h1><p>{t({fr:"La validation transforme un projet en preuve publique et attribue les compétences associées.",ar:"الاعتماد يحوّل المشروع إلى دليل عام ويمنح المهارات المرتبطة به.",en:"Approval turns a project into public evidence and awards its mapped skills."})}</p></div></div>
    {message&&<p className="manual-note">{message}</p>}
    <div className="project-review-grid">{projects.length===0?<article className="panel"><p>{t({fr:"Aucun projet étudiant.",ar:"لا توجد مشاريع طلاب.",en:"No student projects yet."})}</p></article>:projects.map(p=><article className="panel project-review-card" key={p.id}><div className="project-card-head"><span className={p.status==="approved"?"status":"status pending"}>{p.status}</span><small>{p.courses?.title_fr}</small></div><h2>{p.title}</h2><p className="project-student">{names[p.user_id]||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</p><p>{p.summary}</p>{p.problem&&<div className="project-detail"><strong>{t({fr:"Problème",ar:"المشكلة",en:"Problem"})}</strong><p>{p.problem}</p></div>}{p.solution&&<div className="project-detail"><strong>{t({fr:"Solution",ar:"الحل",en:"Solution"})}</strong><p>{p.solution}</p></div>}{skills[p.id]?.length>0&&<div className="tech-stack">{skills[p.id].map((s:any)=><span key={s.name_fr}>✓ {localSkill(s)}</span>)}</div>}<div className="project-links">{p.github_url&&<a href={p.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{p.demo_url&&<a href={p.demo_url} target="_blank" rel="noreferrer">Demo ↗</a>}</div>
      {p.status==="submitted"?<div className="project-review-form"><label><span>{t({fr:"Feedback au participant",ar:"ملاحظة للطالب",en:"Feedback to student"})}</span><textarea rows={4} value={feedbacks[p.id]||""} onChange={e=>setFeedbacks(v=>({...v,[p.id]:e.target.value}))} placeholder={t({fr:"Expliquez ce qui est réussi ou ce qui doit être amélioré...",ar:"اشرح ما تم إنجازه جيداً أو ما يحتاج إلى تحسين...",en:"Explain what was done well or what should be improved..."})}/></label><div className="review-actions"><button className="approve" disabled={busy===p.id} onClick={()=>review(p,"approved")}>{busy===p.id?"...":t({fr:"Valider le projet",ar:"اعتماد المشروع",en:"Approve project"})}</button><button className="reject" disabled={busy===p.id} onClick={()=>review(p,"revision_required")}>{t({fr:"Demander révision",ar:"طلب مراجعة",en:"Request revision"})}</button></div></div>:p.instructor_feedback&&<p className="feedback-box"><strong>{t({fr:"Feedback :",ar:"الملاحظة:",en:"Feedback:"})}</strong> {p.instructor_feedback}</p>}
    </article>)}</div>
  </div></section>
}
