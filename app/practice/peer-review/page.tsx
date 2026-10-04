"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function PeerReview(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null),[userId,setUserId]=useState("");
  const [projects,setProjects]=useState<any[]>([]),[requests,setRequests]=useState<any[]>([]),[mine,setMine]=useState<any[]>([]),[received,setReceived]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null),[scores,setScores]=useState({clarity:4,technical:4,usefulness:4}),[feedback,setFeedback]=useState(""),[notice,setNotice]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}setUserId(user.id);
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    const [{data:ownProjects},{data:open},{data:ownReq}]=await Promise.all([
      supabase.from("student_projects").select("id,title,summary,tech_stack,status,is_public").eq("user_id",user.id).eq("status","approved").order("reviewed_at",{ascending:false}),
      supabase.from("peer_review_requests").select("id,project_id,requester_id,requested_reviews,status,created_at,projects:project_id(id,title,summary,tech_stack,is_public,status)").eq("status","open").neq("requester_id",user.id).order("created_at",{ascending:false}),
      supabase.from("peer_review_requests").select("id,project_id,requested_reviews,status,created_at,projects:project_id(id,title),reviews:peer_reviews(id,clarity_score,technical_score,usefulness_score,feedback,created_at)").eq("requester_id",user.id).order("created_at",{ascending:false})
    ]);
    setProjects(ownProjects||[]);setRequests(open||[]);setMine(ownReq||[]);
    setReceived((ownReq||[]).flatMap((r:any)=>(r.reviews||[]).map((v:any)=>({...v,project_title:r.projects?.title||"Project"}))));
  }
  useEffect(()=>{load()},[]);

  const openProjectIds=useMemo(()=>new Set(mine.filter(r=>r.status==="open").map(r=>r.project_id)),[mine]);

  async function requestReview(projectId:string){
    setNotice("");const {error}=await supabase.rpc("request_peer_review",{p_project_id:projectId,p_requested_reviews:2});setNotice(error?error.message:t({fr:"Demande de peer review publiée.",ar:"تم نشر طلب المراجعة.",en:"Peer review request published."}));if(!error)await load();
  }
  async function submit(e:FormEvent){
    e.preventDefault();if(!selected)return;
    const {error}=await supabase.rpc("submit_peer_review",{p_request_id:selected.id,p_clarity:scores.clarity,p_technical:scores.technical,p_usefulness:scores.usefulness,p_feedback:feedback});
    setNotice(error?error.message:t({fr:"Review envoyée. Merci pour votre contribution.",ar:"تم إرسال المراجعة. شكراً لمساهمتك.",en:"Review submitted. Thanks for contributing."}));
    if(!error){setSelected(null);setFeedback("");await load()}
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Peer Review...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Peer Review</span><h1>{t({fr:"Apprenez aussi en évaluant les autres.",ar:"تعلّم أيضاً من تقييم الآخرين.",en:"Learn by reviewing others too."})}</h1><p>{t({fr:"Demandez du feedback sur un projet approuvé, ou aidez un autre étudiant avec une review structurée.",ar:"اطلب ملاحظات على مشروع معتمد أو ساعد طالباً آخر بمراجعة منظمة.",en:"Request feedback on an approved project or help another learner with a structured review."})}</p></div><Link className="btn" href="/projects">My Projects →</Link></div>
    {notice&&<p className="manual-note">{notice}</p>}
    <div className="peer-layout">
      <main>
        <section className="lab-section"><div className="section-head compact"><div><span className="eyebrow">{t({fr:"À reviewer",ar:"للمراجعة",en:"Review queue"})}</span><h2>{t({fr:"Projets de la communauté",ar:"مشاريع المجتمع",en:"Community projects"})}</h2></div></div><div className="peer-project-grid">{requests.length===0?<article className="panel"><p>{t({fr:"Aucune demande ouverte pour le moment.",ar:"لا توجد طلبات مفتوحة حالياً.",en:"No open requests right now."})}</p></article>:requests.map(r=><article className="panel peer-project-card" key={r.id}><span className="tag">Peer Review</span><h3>{r.projects?.title}</h3><p>{r.projects?.summary}</p><div>{(r.projects?.tech_stack||[]).map((x:string)=><small key={x}>{x}</small>)}</div><button className="btn btn-small" onClick={()=>setSelected(r)}>{t({fr:"Reviewer",ar:"مراجعة",en:"Review"})} →</button></article>)}</div></section>

        <section className="lab-section"><div className="section-head compact"><div><span className="eyebrow">{t({fr:"Mes projets",ar:"مشاريعي",en:"My projects"})}</span><h2>{t({fr:"Demander du feedback",ar:"اطلب ملاحظات",en:"Request feedback"})}</h2></div></div><div className="peer-project-grid">{projects.map(p=><article className="panel peer-project-card" key={p.id}><h3>{p.title}</h3><p>{p.summary}</p>{openProjectIds.has(p.id)?<span className="peer-open">● {t({fr:"Demande ouverte",ar:"طلب مفتوح",en:"Request open"})}</span>:<button className="btn btn-small" onClick={()=>requestReview(p.id)}>{t({fr:"Demander 2 reviews",ar:"طلب مراجعتين",en:"Request 2 reviews"})}</button>}</article>)}</div></section>
      </main>
      <aside>
        <section className="panel peer-received"><span className="eyebrow">{t({fr:"Feedback reçu",ar:"الملاحظات المستلمة",en:"Feedback received"})}</span><h2>{received.length}</h2>{received.slice(0,6).map((r:any,i:number)=><article key={i}><strong>{r.project_title}</strong><span>Clarity {r.clarity_score}/5 · Tech {r.technical_score}/5 · Useful {r.usefulness_score}/5</span><p>{r.feedback}</p></article>)}{received.length===0&&<p>{t({fr:"Pas encore de peer review reçue.",ar:"لم تستلم مراجعة بعد.",en:"No peer review received yet."})}</p>}</section>
        <article className="panel practice-tip"><strong>{t({fr:"Règle communautaire",ar:"قاعدة المجتمع",en:"Community rule"})}</strong><p>{t({fr:"Soyez précis, utile et respectueux. Une peer review n’accorde jamais une compétence Verified.",ar:"كن دقيقاً ومفيداً ومحترماً. المراجعة بين الطلاب لا تمنح Verified.",en:"Be specific, useful and respectful. Peer review never grants a Verified skill."})}</p></article>
      </aside>
    </div>

    {selected&&<div className="peer-modal-backdrop"><form className="panel peer-review-modal" onSubmit={submit}><div className="peer-modal-head"><div><span className="eyebrow">Peer Review</span><h2>{selected.projects?.title}</h2></div><button type="button" onClick={()=>setSelected(null)}>×</button></div><p>{selected.projects?.summary}</p>{(["clarity","technical","usefulness"] as const).map(k=><label className="peer-score" key={k}><span>{k}</span><input type="range" min="1" max="5" value={scores[k]} onChange={e=>setScores(v=>({...v,[k]:Number(e.target.value)}))}/><strong>{scores[k]}/5</strong></label>)}<label className="form-field"><span>{t({fr:"Feedback constructif",ar:"ملاحظات بناءة",en:"Constructive feedback"})}</span><textarea rows={7} minLength={20} value={feedback} onChange={e=>setFeedback(e.target.value)} required placeholder={t({fr:"Ce qui fonctionne, ce qui peut être amélioré, et une prochaine action concrète...",ar:"ما الذي يعمل وما الذي يمكن تحسينه وخطوة عملية تالية...",en:"What works, what could improve, and one concrete next step..."})}/></label><button className="btn" disabled={feedback.trim().length<20}>{t({fr:"Envoyer la review",ar:"إرسال المراجعة",en:"Submit review"})}</button></form></div>}
  </div></section>
}
