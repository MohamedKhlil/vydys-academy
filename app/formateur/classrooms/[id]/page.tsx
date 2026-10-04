"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../components/language-provider";
import { supabase } from "../../../../lib/supabase";

export default function ClassroomManagePage(){
  const {id}=useParams<{id:string}>();
  const {lang,t}=useLanguage();
  const [room,setRoom]=useState<any>(null);
  const [sessions,setSessions]=useState<any[]>([]);
  const [enrollments,setEnrollments]=useState<any[]>([]);
  const [attendance,setAttendance]=useState<any[]>([]);
  const [resources,setResources]=useState<any[]>([]);
  const [assignments,setAssignments]=useState<any[]>([]);
  const [prices,setPrices]=useState<any[]>([]);
  const [currencies,setCurrencies]=useState<any[]>([]);
  const [profiles,setProfiles]=useState<Record<string,any>>({});
  const [resourceTitle,setResourceTitle]=useState("");
  const [resourceUrl,setResourceUrl]=useState("");
  const [assignmentTitle,setAssignmentTitle]=useState("");
  const [assignmentDue,setAssignmentDue]=useState("");
  const [assignmentText,setAssignmentText]=useState("");
  const [priceCurrency,setPriceCurrency]=useState("USD");
  const [priceAmount,setPriceAmount]=useState("");
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}

    const [{data:r},{data:s},{data:e},{data:a},{data:res},{data:ass},{data:pr},{data:cur}]=await Promise.all([
      supabase.from("classrooms").select("*").eq("id",id).eq("instructor_id",user.id).maybeSingle(),
      supabase.from("classroom_sessions").select("*").eq("classroom_id",id).order("position"),
      supabase.from("classroom_enrollments").select("*").eq("classroom_id",id).order("enrolled_at"),
      supabase.from("classroom_attendance").select("*").in("session_id",(await supabase.from("classroom_sessions").select("id").eq("classroom_id",id)).data?.map((x:any)=>x.id)||["00000000-0000-0000-0000-000000000000"]),
      supabase.from("classroom_resources").select("*").eq("classroom_id",id).order("created_at",{ascending:false}),
      supabase.from("classroom_assignments").select("*").eq("classroom_id",id).order("created_at",{ascending:false}),
      supabase.from("classroom_prices").select("*").eq("classroom_id",id).order("currency"),
      supabase.from("currency_catalog").select("code,name").eq("enabled",true).order("code")
    ]);
    setRoom(r||false);setSessions(s||[]);setEnrollments(e||[]);setAttendance(a||[]);setResources(res||[]);setAssignments(ass||[]);setPrices(pr||[]);setCurrencies(cur||[]);
    const ids=[...new Set((e||[]).map((x:any)=>x.user_id).filter(Boolean))];
    if(ids.length){
      const {data:ps}=await supabase.from("profiles").select("id,full_name,phone").in("id",ids);
      const map:Record<string,any>={};(ps||[]).forEach((x:any)=>map[x.id]=x);setProfiles(map);
    }
  }
  useEffect(()=>{load()},[id]);

  const attendanceBySession=useMemo(()=>{
    const map:Record<string,{count:number,minutes:number}>={};
    attendance.forEach(a=>{
      const row=map[a.session_id]||(map[a.session_id]={count:0,minutes:0});
      row.count++;
      const openSeconds=a.last_joined_at&&a.last_seen_at?Math.max(0,(new Date(a.last_seen_at).getTime()-new Date(a.last_joined_at).getTime())/1000):0;
      row.minutes+=Math.round((Number(a.total_seconds||0)+openSeconds)/60);
    });
    return map;
  },[attendance]);

  async function submitReview(){
    setMessage("");
    const {error}=await supabase.rpc("submit_classroom_for_review",{p_classroom_id:id});
    if(error)setMessage(error.message);else{setMessage(t({fr:"Classroom envoyée à la Direction pour validation.",ar:"تم إرسال الفصل للإدارة للمراجعة.",en:"Classroom submitted to Management for review."}));await load()}
  }

  async function updateSession(session:any,starts:string,title:string){
    setMessage("");
    const start=new Date(starts);
    if(Number.isNaN(start.getTime())){setMessage(t({fr:"Date invalide.",ar:"تاريخ غير صالح.",en:"Invalid date."}));return}
    const end=new Date(start.getTime()+Number(room.session_duration_minutes)*60000);
    const {error}=await supabase.from("classroom_sessions").update({title,starts_at:start.toISOString(),ends_at:end.toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id);
    if(error)setMessage(error.message);else await load();
  }

  async function addResource(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {error}=await supabase.from("classroom_resources").insert({classroom_id:id,created_by:user.id,title:resourceTitle,resource_type:"link",url:resourceUrl});
    if(error)setMessage(error.message);else{setResourceTitle("");setResourceUrl("");await load()}
  }

  async function addAssignment(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {error}=await supabase.from("classroom_assignments").insert({classroom_id:id,created_by:user.id,title:assignmentTitle,instructions:assignmentText,due_at:assignmentDue?new Date(assignmentDue).toISOString():null});
    if(error)setMessage(error.message);else{setAssignmentTitle("");setAssignmentText("");setAssignmentDue("");await load()}
  }

  async function addPrice(e:FormEvent){
    e.preventDefault();
    const n=Number(priceAmount);if(!Number.isFinite(n)||n<0)return;
    const {error}=await supabase.from("classroom_prices").upsert({classroom_id:id,currency:priceCurrency,amount:n,is_active:true,updated_at:new Date().toISOString()},{onConflict:"classroom_id,currency"});
    if(error)setMessage(error.message);else{setPriceAmount("");await load()}
  }

  if(room===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(room===false)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Classroom introuvable",ar:"الفصل غير موجود",en:"Classroom not found"})}</h1></article></div></section>;

  const canEdit=room.status==="draft"||room.status==="rejected";
  const fmt=(iso:string)=>new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{dateStyle:"medium",timeStyle:"short",timeZone:room.timezone}).format(new Date(iso));
  const toLocal=(iso:string)=>{const d=new Date(iso);const pad=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};

  return <section className="dashboard-shell classroom-manage-page"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Classroom Studio</span><h1>{room.title_fr}</h1><p>{room.session_count} {t({fr:"sessions",ar:"حصص",en:"sessions"})} · {room.capacity} {t({fr:"places",ar:"مقعد",en:"seats"})} · {room.timezone}</p></div><div className="builder-head-actions">{room.status==="draft"||room.status==="rejected"?<button className="btn" onClick={submitReview}>{t({fr:"Soumettre à l’Admin",ar:"إرسال للإدارة",en:"Submit to Admin"})}</button>:null}{room.status==="approved_pending_fee"&&<Link className="btn" href={"/formateur/classrooms/"+id+"/launch"}>{t({fr:"Payer le lancement",ar:"دفع الإطلاق",en:"Pay launch fee"})}</Link>}{room.status==="published"&&<Link className="btn btn-ghost" href={"/classroom/"+room.slug}>{t({fr:"Voir la page publique",ar:"عرض الصفحة",en:"View public page"})}</Link>}</div></div>

    {message&&<p className="manual-note">{message}</p>}
    <div className="classroom-manage-kpis">
      <article className="panel"><span>{t({fr:"Statut",ar:"الحالة",en:"Status"})}</span><strong>{room.status}</strong></article>
      <article className="panel"><span>{t({fr:"Inscrits",ar:"المسجلون",en:"Enrolled"})}</span><strong>{enrollments.length}/{room.capacity}</strong></article>
      <article className="panel"><span>{t({fr:"Prix",ar:"السعر",en:"Price"})}</span><strong>{Number(room.base_price_amount).toLocaleString("fr-FR")} {room.base_currency}</strong></article>
      <article className="panel"><span>{t({fr:"Frais Vydys",ar:"رسوم Vydys",en:"Vydys fee"})}</span><strong>{room.launch_fee_status}</strong></article>
    </div>

    <div className="classroom-manage-grid">
      <article className="panel classroom-sessions-panel"><div className="admin-section-head"><div><span className="eyebrow">{t({fr:"Calendrier live",ar:"الجدول المباشر",en:"Live schedule"})}</span><h2>{t({fr:"Séances",ar:"الحصص",en:"Sessions"})}</h2></div></div>
        <div className="classroom-session-list">{sessions.map(s=><div className="classroom-session-edit" key={s.id}>
          <span className="session-number">{String(s.position).padStart(2,"0")}</span>
          <div><input defaultValue={s.title||"Session "+s.position} id={"title-"+s.id} disabled={!canEdit}/><small>{fmt(s.starts_at)}</small></div>
          <input type="datetime-local" defaultValue={toLocal(s.starts_at)} id={"date-"+s.id} disabled={!canEdit}/>
          <div className="classroom-session-attendance"><strong>{attendanceBySession[s.id]?.count||0}</strong><small>{t({fr:"présents",ar:"حاضر",en:"attendees"})}</small></div>
          {canEdit?<button onClick={()=>updateSession(s,(document.getElementById("date-"+s.id) as HTMLInputElement).value,(document.getElementById("title-"+s.id) as HTMLInputElement).value)}>{t({fr:"Sauver",ar:"حفظ",en:"Save"})}</button>:<Link href={"/classroom/"+room.slug+"/session/"+s.id}>{t({fr:"Ouvrir",ar:"فتح",en:"Open"})}</Link>}
        </div>)}</div>
      </article>

      <aside className="classroom-manage-side">
        <article className="panel"><h3>{t({fr:"Prix par devise",ar:"الأسعار حسب العملة",en:"Prices by currency"})}</h3><div className="classroom-price-chips">{prices.map(p=><span key={p.currency}><b>{p.currency}</b> {Number(p.amount).toLocaleString("fr-FR")}</span>)}</div>{canEdit&&<form onSubmit={addPrice} className="inline-price-form"><select value={priceCurrency} onChange={e=>setPriceCurrency(e.target.value)}>{currencies.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select><input type="number" min="0" step="0.01" value={priceAmount} onChange={e=>setPriceAmount(e.target.value)} placeholder="0.00"/><button>{t({fr:"Ajouter",ar:"إضافة",en:"Add"})}</button></form>}</article>
        <article className="panel"><h3>{t({fr:"Étudiants",ar:"الطلاب",en:"Learners"})}</h3><div className="classroom-learner-list">{enrollments.slice(0,12).map(e=><div key={e.id}><span>{(profiles[e.user_id]?.full_name||"V").slice(0,2).toUpperCase()}</span><div><strong>{profiles[e.user_id]?.full_name||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</strong><small>{profiles[e.user_id]?.phone||""}</small></div></div>)}{enrollments.length===0&&<p>{t({fr:"Aucun étudiant inscrit.",ar:"لا يوجد طلاب مسجلون.",en:"No learners enrolled."})}</p>}</div></article>
      </aside>
    </div>

    <div className="classroom-content-grid">
      <article className="panel"><h2>{t({fr:"Ressources",ar:"الموارد",en:"Resources"})}</h2>{canEdit&&<form className="trainer-form compact-form" onSubmit={addResource}><input required value={resourceTitle} onChange={e=>setResourceTitle(e.target.value)} placeholder={t({fr:"Titre de la ressource",ar:"عنوان المورد",en:"Resource title"})}/><input required type="url" value={resourceUrl} onChange={e=>setResourceUrl(e.target.value)} placeholder="https://..."/><button className="btn btn-small">{t({fr:"Ajouter",ar:"إضافة",en:"Add"})}</button></form>}<div className="classroom-resource-list">{resources.map(r=><a href={r.url||"#"} target="_blank" rel="noreferrer" key={r.id}><span>↗</span><strong>{r.title}</strong></a>)}{resources.length===0&&<p>{t({fr:"Aucune ressource.",ar:"لا توجد موارد.",en:"No resources yet."})}</p>}</div></article>

      <article className="panel"><h2>{t({fr:"Devoirs",ar:"الواجبات",en:"Assignments"})}</h2>{canEdit&&<form className="trainer-form compact-form" onSubmit={addAssignment}><input required value={assignmentTitle} onChange={e=>setAssignmentTitle(e.target.value)} placeholder={t({fr:"Titre du devoir",ar:"عنوان الواجب",en:"Assignment title"})}/><textarea rows={3} value={assignmentText} onChange={e=>setAssignmentText(e.target.value)} placeholder={t({fr:"Instructions",ar:"التعليمات",en:"Instructions"})}/><input type="datetime-local" value={assignmentDue} onChange={e=>setAssignmentDue(e.target.value)}/><button className="btn btn-small">{t({fr:"Créer",ar:"إنشاء",en:"Create"})}</button></form>}<div className="classroom-assignment-list">{assignments.map(a=><div key={a.id}><strong>{a.title}</strong><small>{a.due_at?fmt(a.due_at):t({fr:"Sans échéance",ar:"بدون موعد",en:"No due date"})}</small></div>)}{assignments.length===0&&<p>{t({fr:"Aucun devoir.",ar:"لا توجد واجبات.",en:"No assignments yet."})}</p>}</div></article>
    </div>
  </div></section>
}
