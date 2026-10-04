"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../../components/language-provider";
import ClassroomLiveRoom from "../../../../../components/classroom-live-room";
import { supabase } from "../../../../../lib/supabase";

export default function ClassroomSessionPage(){
  const {slug,sessionId}=useParams<{slug:string;sessionId:string}>();
  const {lang,t}=useLanguage();
  const [room,setRoom]=useState<any>(null);
  const [session,setSession]=useState<any>(null);
  const [access,setAccess]=useState<any>(null);
  const [accessError,setAccessError]=useState("");
  const [resources,setResources]=useState<any[]>([]);
  const [assignments,setAssignments]=useState<any[]>([]);
  const [messages,setMessages]=useState<any[]>([]);
  const [profiles,setProfiles]=useState<Record<string,any>>({});
  const [attendance,setAttendance]=useState<any[]>([]);
  const [submissions,setSubmissions]=useState<Record<string,any>>({});
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [chat,setChat]=useState("");
  const [userId,setUserId]=useState("");
  const [message,setMessage]=useState("");

  async function hydrateProfiles(items:any[]){
    const ids=[...new Set(items.map(x=>x.user_id).filter(Boolean))];
    if(!ids.length)return;
    const {data}=await supabase.from("profiles").select("id,full_name").in("id",ids);
    setProfiles(prev=>{const next={...prev};(data||[]).forEach((x:any)=>next[x.id]=x);return next});
  }

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);

    const {data:r}=await supabase.from("classrooms").select("*").eq("slug",slug).maybeSingle();
    if(!r){setRoom(false);return}
    setRoom(r);

    const {data:s}=await supabase.from("classroom_sessions").select("*").eq("id",sessionId).eq("classroom_id",r.id).maybeSingle();
    if(!s){setSession(false);return}
    setSession(s);

    const accessResult=await supabase.rpc("get_classroom_session_access",{p_session_id:sessionId});
    if(accessResult.error){setAccessError(accessResult.error.message)}else{setAccess(accessResult.data);setAccessError("")}

    const [{data:res},{data:ass},{data:chatRows},{data:att}]=await Promise.all([
      supabase.from("classroom_resources").select("*").eq("classroom_id",r.id).or(`session_id.is.null,session_id.eq.${sessionId}`).order("created_at",{ascending:false}),
      supabase.from("classroom_assignments").select("*").eq("classroom_id",r.id).or(`session_id.is.null,session_id.eq.${sessionId}`).order("created_at",{ascending:false}),
      supabase.from("classroom_chat_messages").select("*").eq("classroom_id",r.id).eq("session_id",sessionId).order("created_at").limit(200),
      supabase.from("classroom_attendance").select("*").eq("session_id",sessionId)
    ]);
    setResources(res||[]);setAssignments(ass||[]);setMessages(chatRows||[]);setAttendance(att||[]);
    hydrateProfiles([...(chatRows||[]),...(att||[])]);

    if((ass||[]).length){
      const ids=(ass||[]).map((x:any)=>x.id);
      const {data:subs}=await supabase.from("classroom_submissions").select("*").in("assignment_id",ids);
      const map:Record<string,any>={};(subs||[]).forEach((x:any)=>{if(x.user_id===user.id)map[x.assignment_id]=x});setSubmissions(map);
    }
  }

  useEffect(()=>{load()},[slug,sessionId]);

  useEffect(()=>{
    if(!room?.id)return;
    const channel=supabase.channel("classroom-chat-"+sessionId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"classroom_chat_messages",filter:`classroom_id=eq.${room.id}`},async payload=>{
        const row=payload.new as any;
        if(row.session_id!==sessionId)return;
        setMessages(prev=>prev.some(x=>x.id===row.id)?prev:[...prev,row]);
        if(!profiles[row.user_id]){
          const {data:p}=await supabase.from("profiles").select("id,full_name").eq("id",row.user_id).maybeSingle();
          if(p)setProfiles(prev=>({...prev,[p.id]:p}));
        }
      }).subscribe();
    return()=>{supabase.removeChannel(channel)}
  },[room?.id,sessionId]);

  async function sendChat(e:FormEvent){
    e.preventDefault();const value=chat.trim();if(!value||!room?.id||!userId)return;
    setChat("");
    const {error}=await supabase.from("classroom_chat_messages").insert({classroom_id:room.id,session_id:sessionId,user_id:userId,message:value});
    if(error)setMessage(error.message);
  }

  async function submitAssignment(assignmentId:string){
    const text=(answers[assignmentId]||"").trim();if(!text)return;
    const {error}=await supabase.from("classroom_submissions").upsert({assignment_id:assignmentId,user_id:userId,text_answer:text,submitted_at:new Date().toISOString()},{onConflict:"assignment_id,user_id"});
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Devoir envoyé.",ar:"تم إرسال الواجب.",en:"Assignment submitted."}));
    await load();
  }

  const attendanceSummary=useMemo(()=>{
    return attendance.map(a=>{
      const open=a.last_joined_at&&a.last_seen_at?Math.max(0,(new Date(a.last_seen_at).getTime()-new Date(a.last_joined_at).getTime())/1000):0;
      return {...a,minutes:Math.round((Number(a.total_seconds||0)+open)/60)};
    }).sort((a,b)=>b.minutes-a.minutes);
  },[attendance]);

  if(room===null||session===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(room===false||session===false)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Session introuvable",ar:"الحصة غير موجودة",en:"Session not found"})}</h1></article></div></section>;

  const title=lang==="ar"?room.title_ar:lang==="en"?room.title_en:room.title_fr;
  const isModerator=access?.role==="moderator";
  const fmt=(iso:string)=>new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{dateStyle:"medium",timeStyle:"short",timeZone:room.timezone}).format(new Date(iso));

  return <section className="live-classroom-page"><div className="live-classroom-topbar"><div><Link href={"/classroom/"+room.slug}>←</Link><span className="live-brand">V</span><div><strong>{title}</strong><small>{session.title||"Session "+session.position} · {fmt(session.starts_at)}</small></div></div><div><span className="live-secure">● {t({fr:"Accès Vydys sécurisé",ar:"وصول Vydys آمن",en:"Secure Vydys access"})}</span><Link href="/classroom">{t({fr:"Mes Classrooms",ar:"فصولي",en:"My Classrooms"})}</Link></div></div>

    {message&&<div className="live-toast">{message}</div>}

    <div className="live-classroom-layout">
      <main className="live-main-column">
        {access?<ClassroomLiveRoom access={access}/>:<div className="vydys-live-waiting"><div className="waiting-orb">V</div><span className="eyebrow">{t({fr:"Salle protégée",ar:"قاعة محمية",en:"Protected room"})}</span><h1>{t({fr:"La salle vidéo n’est pas encore ouverte.",ar:"قاعة الفيديو لم تفتح بعد.",en:"The video room is not open yet."})}</h1><p>{accessError||t({fr:"Les étudiants peuvent rejoindre 30 minutes avant la séance. Le formateur peut ouvrir la salle à tout moment.",ar:"يمكن للطلاب الانضمام قبل 30 دقيقة ويمكن للمدرب فتحها في أي وقت.",en:"Learners can join 30 minutes before the session. The instructor can open it anytime."})}</p><strong>{fmt(session.starts_at)}</strong></div>}

        <div className="live-learning-tools">
          <article className="panel live-resource-panel"><div className="live-panel-head"><span>↗</span><div><strong>{t({fr:"Ressources de séance",ar:"موارد الحصة",en:"Session resources"})}</strong><small>{resources.length} items</small></div></div><div>{resources.map(r=><a href={r.url||"#"} target="_blank" rel="noreferrer" key={r.id}><span>↗</span><strong>{r.title}</strong></a>)}{resources.length===0&&<p>{t({fr:"Aucune ressource pour cette séance.",ar:"لا توجد موارد لهذه الحصة.",en:"No resources for this session."})}</p>}</div></article>

          <article className="panel live-assignment-panel"><div className="live-panel-head"><span>✓</span><div><strong>{t({fr:"Devoirs",ar:"الواجبات",en:"Assignments"})}</strong><small>{assignments.length} tasks</small></div></div><div>{assignments.map(a=><div className="live-assignment" key={a.id}><strong>{a.title}</strong><p>{a.instructions}</p><small>{a.due_at?fmt(a.due_at):t({fr:"Sans échéance",ar:"بدون موعد",en:"No due date"})}</small>{submissions[a.id]?<span className="assignment-submitted">✓ {t({fr:"Envoyé",ar:"تم الإرسال",en:"Submitted"})}</span>:!isModerator&&<><textarea rows={3} value={answers[a.id]||""} onChange={e=>setAnswers(prev=>({...prev,[a.id]:e.target.value}))} placeholder={t({fr:"Votre réponse...",ar:"إجابتك...",en:"Your answer..."})}/><button onClick={()=>submitAssignment(a.id)}>{t({fr:"Envoyer",ar:"إرسال",en:"Submit"})}</button></>}</div>)}{assignments.length===0&&<p>{t({fr:"Aucun devoir associé.",ar:"لا توجد واجبات.",en:"No assignments attached."})}</p>}</div></article>
        </div>
      </main>

      <aside className="live-side-column">
        <article className="live-chat-panel"><div className="live-side-head"><div><strong>{t({fr:"Chat Vydys",ar:"دردشة Vydys",en:"Vydys chat"})}</strong><small>{messages.length} messages</small></div><span>LIVE</span></div><div className="live-chat-messages">{messages.map(m=><div className={m.user_id===userId?"mine":""} key={m.id}><span>{(profiles[m.user_id]?.full_name||"V").slice(0,2).toUpperCase()}</span><div><strong>{profiles[m.user_id]?.full_name||t({fr:"Participant",ar:"مشارك",en:"Participant"})}</strong><p>{m.message}</p><small>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div></div>)}</div><form onSubmit={sendChat} className="live-chat-form"><input value={chat} onChange={e=>setChat(e.target.value)} maxLength={4000} placeholder={t({fr:"Écrire au groupe...",ar:"اكتب للمجموعة...",en:"Message the group..."})}/><button>↑</button></form></article>

        {isModerator&&<article className="panel live-attendance-panel"><div className="live-side-head"><div><strong>{t({fr:"Présence",ar:"الحضور",en:"Attendance"})}</strong><small>{attendanceSummary.length} {t({fr:"participants suivis",ar:"مشارك متابع",en:"tracked participants"})}</small></div><span>AUTO</span></div><div className="attendance-live-list">{attendanceSummary.map(a=><div key={a.user_id}><span>{(profiles[a.user_id]?.full_name||"V").slice(0,2).toUpperCase()}</span><div><strong>{profiles[a.user_id]?.full_name||"Participant"}</strong><small>{a.minutes} min · {a.connection_count} connexions</small></div></div>)}{attendanceSummary.length===0&&<p>{t({fr:"La présence sera enregistrée automatiquement dès l’entrée dans la vidéo.",ar:"سيتم تسجيل الحضور تلقائياً عند دخول الفيديو.",en:"Attendance starts automatically when participants enter the video."})}</p>}</div></article>}

        <article className="panel live-ai-panel"><span className="eyebrow">Vydys AI Ready</span><h3>{t({fr:"Après la séance",ar:"بعد الحصة",en:"After the session"})}</h3><p>{t({fr:"Cette architecture est prête pour transcription, résumé IA, chapitres et replay lorsque le provider d’enregistrement sécurisé est activé.",ar:"البنية جاهزة للنسخ والملخص الذكي والفصول والإعادة عند تفعيل مزود تسجيل آمن.",en:"This architecture is ready for transcript, AI summary, chapters and replay when a secure recording provider is enabled."})}</p></article>
      </aside>
    </div>
  </section>
}
