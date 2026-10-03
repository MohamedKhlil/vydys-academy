"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function ProjectsPage(){
  const {t,lang}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [courses,setCourses]=useState<any[]>([]);
  const [projects,setProjects]=useState<any[]>([]);
  const [courseId,setCourseId]=useState("");
  const [courseSkills,setCourseSkills]=useState<any[]>([]);
  const [selectedSkills,setSelectedSkills]=useState<string[]>([]);
  const [title,setTitle]=useState("");
  const [summary,setSummary]=useState("");
  const [problem,setProblem]=useState("");
  const [solution,setSolution]=useState("");
  const [stack,setStack]=useState("");
  const [github,setGithub]=useState("");
  const [demo,setDemo]=useState("");
  const [isPublic,setIsPublic]=useState(true);
  const [message,setMessage]=useState("");

  function localSkill(s:any){return lang==="ar"?s.name_ar:lang==="en"?s.name_en:s.name_fr}
  function localCourse(c:any){return lang==="ar"?(c.title_ar||c.title_fr):lang==="en"?(c.title_en||c.title_fr):c.title_fr}

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    await supabase.rpc("ensure_my_student_profile");

    const [{data:e},{data:pr}]=await Promise.all([
      supabase.from("enrollments").select("course_id,courses:course_id(id,title_fr,title_ar,title_en)").eq("user_id",user.id).in("status",["active","completed"]),
      supabase.from("student_projects").select("*").eq("user_id",user.id).order("created_at",{ascending:false})
    ]);
    const cs=(e||[]).map((x:any)=>x.courses).filter(Boolean);
    setCourses(cs);setProjects(pr||[]);
    if(!courseId&&cs[0])setCourseId(cs[0].id);
  }

  async function loadSkills(cid:string){
    if(!cid){setCourseSkills([]);return}
    const {data}=await supabase.from("course_skills")
      .select("skill_id,target_level,skills:skill_id(id,slug,name_fr,name_ar,name_en,category)")
      .eq("course_id",cid);
    setCourseSkills(data||[]);setSelectedSkills([]);
  }

  useEffect(()=>{load()},[]);
  useEffect(()=>{loadSkills(courseId)},[courseId]);

  async function createProject(e:FormEvent){
    e.preventDefault();setMessage("");
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const tech=stack.split(",").map(x=>x.trim()).filter(Boolean);
    const {data,error}=await supabase.from("student_projects").insert({
      user_id:user.id,course_id:courseId||null,title,summary,problem,solution,
      tech_stack:tech,github_url:github||null,demo_url:demo||null,is_public:isPublic,status:"draft"
    }).select("id").single();
    if(error||!data){setMessage(error?.message||"Erreur");return}
    if(selectedSkills.length){
      const {error:skillError}=await supabase.from("project_skills").insert(selectedSkills.map(skill_id=>({project_id:data.id,skill_id})));
      if(skillError){setMessage(skillError.message);return}
    }
    setTitle("");setSummary("");setProblem("");setSolution("");setStack("");setGithub("");setDemo("");setSelectedSkills([]);
    setMessage(t({fr:"Projet créé en brouillon.",ar:"تم إنشاء المشروع كمسودة.",en:"Project created as a draft."}));
    await load();
  }

  async function submitProject(id:string){
    const {error}=await supabase.rpc("submit_student_project",{p_project_id:id});
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Projet envoyé au formateur pour validation.",ar:"تم إرسال المشروع للمدرب للمراجعة.",en:"Project sent to the instructor for review."}));
    await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Espace étudiant",ar:"مساحة الطالب",en:"Student area"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Projects</span><h1>{t({fr:"Construisez votre portfolio par la pratique",ar:"ابنِ ملف أعمالك من خلال التطبيق",en:"Build your portfolio through practice"})}</h1><p>{t({fr:"Transformez vos formations en projets concrets validés par vos formateurs.",ar:"حوّل دوراتك إلى مشاريع حقيقية يعتمدها المدربون.",en:"Turn your courses into real projects validated by instructors."})}</p></div><Link className="btn btn-ghost" href="/portfolio">{t({fr:"Configurer mon portfolio",ar:"إعداد ملفي",en:"Set up portfolio"})}</Link></div>
    {message&&<p className="manual-note">{message}</p>}

    <div className="project-layout">
      <form className="panel trainer-form" onSubmit={createProject}>
        <h2>{t({fr:"Nouveau projet",ar:"مشروع جديد",en:"New project"})}</h2>
        <label className="form-field"><span>{t({fr:"Formation liée",ar:"الدورة المرتبطة",en:"Related course"})}</span><select value={courseId} onChange={e=>setCourseId(e.target.value)} required><option value="">{t({fr:"Choisir...",ar:"اختر...",en:"Choose..."})}</option>{courses.map(c=><option value={c.id} key={c.id}>{localCourse(c)}</option>)}</select></label>
        <label className="form-field"><span>{t({fr:"Titre du projet",ar:"عنوان المشروع",en:"Project title"})}</span><input value={title} onChange={e=>setTitle(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Résumé",ar:"ملخص",en:"Summary"})}</span><textarea rows={3} value={summary} onChange={e=>setSummary(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Problème traité",ar:"المشكلة",en:"Problem"})}</span><textarea rows={3} value={problem} onChange={e=>setProblem(e.target.value)}/></label>
        <label className="form-field"><span>{t({fr:"Solution réalisée",ar:"الحل",en:"Solution"})}</span><textarea rows={4} value={solution} onChange={e=>setSolution(e.target.value)}/></label>
        <label className="form-field"><span>{t({fr:"Technologies (séparées par virgules)",ar:"التقنيات مفصولة بفواصل",en:"Technologies (comma separated)"})}</span><input value={stack} onChange={e=>setStack(e.target.value)} placeholder="Python, OpenAI API, Supabase"/></label>
        <div className="form-grid"><label className="form-field"><span>GitHub</span><input value={github} onChange={e=>setGithub(e.target.value)} placeholder="https://github.com/..."/></label><label className="form-field"><span>Demo</span><input value={demo} onChange={e=>setDemo(e.target.value)} placeholder="https://..."/></label></div>

        {courseSkills.length>0&&<div className="project-skill-picker"><strong>{t({fr:"Compétences démontrées",ar:"المهارات المثبتة",en:"Skills demonstrated"})}</strong><div>{courseSkills.map(cs=><label key={cs.skill_id}><input type="checkbox" checked={selectedSkills.includes(cs.skill_id)} onChange={e=>setSelectedSkills(v=>e.target.checked?[...v,cs.skill_id]:v.filter(x=>x!==cs.skill_id))}/><span>{localSkill(cs.skills)} · {cs.target_level}</span></label>)}</div></div>}

        <label className="checkbox-line"><input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)}/>{t({fr:"Afficher sur mon portfolio après validation",ar:"عرضه في ملفي بعد الاعتماد",en:"Show on my portfolio after approval"})}</label>
        <button className="btn">{t({fr:"Créer le projet",ar:"إنشاء المشروع",en:"Create project"})}</button>
      </form>

      <div className="project-list">
        {projects.length===0?<article className="panel"><h2>{t({fr:"Votre premier projet commence ici.",ar:"مشروعك الأول يبدأ هنا.",en:"Your first project starts here."})}</h2><p>{t({fr:"Choisissez une formation et documentez ce que vous avez réellement construit.",ar:"اختر دورة ووثّق ما بنيته فعلياً.",en:"Choose a course and document what you actually built."})}</p></article>:projects.map(p=><article className="panel project-card" key={p.id}><div className="project-card-head"><span className={p.status==="approved"?"status":"status pending"}>{p.status}</span><small>{new Date(p.created_at).toLocaleDateString()}</small></div><h2>{p.title}</h2><p>{p.summary}</p>{p.tech_stack?.length>0&&<div className="tech-stack">{p.tech_stack.map((x:string)=><span key={x}>{x}</span>)}</div>}<div className="project-links">{p.github_url&&<a href={p.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{p.demo_url&&<a href={p.demo_url} target="_blank" rel="noreferrer">Demo ↗</a>}</div>{p.instructor_feedback&&<p className="feedback-box"><strong>{t({fr:"Feedback formateur :",ar:"ملاحظة المدرب:",en:"Instructor feedback:"})}</strong> {p.instructor_feedback}</p>}{(p.status==="draft"||p.status==="revision_required")&&<button className="btn" onClick={()=>submitProject(p.id)}>{t({fr:"Soumettre pour validation",ar:"إرسال للاعتماد",en:"Submit for validation"})}</button>}</article>)}
      </div>
    </div>
  </div></section>
}
