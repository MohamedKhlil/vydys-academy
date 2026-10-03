"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";

type Mode="student_tutor"|"instructor_copilot";

export function AIWorkspace({mode}:{mode:Mode}){
  const {lang,t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [userId,setUserId]=useState("");
  const [courses,setCourses]=useState<any[]>([]);
  const [courseId,setCourseId]=useState("");
  const [threads,setThreads]=useState<any[]>([]);
  const [threadId,setThreadId]=useState<string|null>(null);
  const [messages,setMessages]=useState<any[]>([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState("");
  const [remaining,setRemaining]=useState<number|null>(null);

  const isTutor=mode==="student_tutor";
  const suggestions=isTutor?[
    t({fr:"Explique-moi le dernier concept simplement avec un exemple.",ar:"اشرح لي آخر مفهوم ببساطة مع مثال.",en:"Explain the latest concept simply with an example."}),
    t({fr:"Fais-moi réviser avec 5 questions sans donner les réponses.",ar:"اختبرني بـ5 أسئلة دون إعطاء الإجابات.",en:"Quiz me with 5 questions without giving the answers."}),
    t({fr:"Donne-moi un exercice pratique adapté à cette formation.",ar:"أعطني تمريناً عملياً مناسباً لهذه الدورة.",en:"Give me a practical exercise for this course."}),
    t({fr:"Aide-moi à comprendre mes erreurs et à progresser.",ar:"ساعدني على فهم أخطائي والتقدم.",en:"Help me understand my mistakes and improve."})
  ]:[
    t({fr:"Propose un parcours pédagogique complet en modules et leçons.",ar:"اقترح مساراً تعليمياً كاملاً بوحدات ودروس.",en:"Propose a complete curriculum with modules and lessons."}),
    t({fr:"Crée une leçon pratique avec objectifs, exemple et exercice.",ar:"أنشئ درساً عملياً بأهداف ومثال وتمرين.",en:"Create a practical lesson with goals, example and exercise."}),
    t({fr:"Crée 10 questions de quiz de qualité avec explications.",ar:"أنشئ 10 أسئلة اختبار جيدة مع الشرح.",en:"Create 10 high-quality quiz questions with explanations."}),
    t({fr:"Propose un projet final avec livrables et grille d'évaluation.",ar:"اقترح مشروعاً نهائياً مع المخرجات ومعايير التقييم.",en:"Propose a final project with deliverables and a grading rubric."})
  ];

  function localCourse(c:any){
    return lang==="ar"?(c.title_ar||c.title_fr):lang==="en"?(c.title_en||c.title_fr):c.title_fr;
  }

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=isTutor?p?.role==="student":p?.role==="instructor";
    setAllowed(ok);
    if(!ok)return;

    if(isTutor){
      const {data:e}=await supabase.from("enrollments")
        .select("course_id,courses:course_id(id,title_fr,title_ar,title_en,status)")
        .eq("user_id",user.id).in("status",["active","completed"]);
      const list=(e||[]).map((x:any)=>x.courses).filter(Boolean);
      setCourses(list);if(list[0])setCourseId(list[0].id);
    }else{
      const {data:c}=await supabase.from("courses")
        .select("id,title_fr,title_ar,title_en,status")
        .eq("instructor_id",user.id).order("created_at",{ascending:false});
      setCourses(c||[]);if(c?.[0])setCourseId(c[0].id);
    }
  })()},[isTutor]);

  async function loadThreads(cid:string){
    if(!cid||!userId)return;
    const {data}=await supabase.from("ai_threads")
      .select("id,title,updated_at").eq("user_id",userId).eq("course_id",cid).eq("mode",mode)
      .order("updated_at",{ascending:false});
    setThreads(data||[]);
  }

  useEffect(()=>{if(courseId){setThreadId(null);setMessages([]);loadThreads(courseId)}},[courseId,userId]);

  async function openThread(id:string){
    setThreadId(id);setStatus("");
    const {data}=await supabase.from("ai_messages").select("id,role,content,created_at").eq("thread_id",id).order("created_at");
    setMessages(data||[]);
  }

  function newThread(){setThreadId(null);setMessages([]);setStatus("");setInput("")}

  async function send(e?:FormEvent){
    e?.preventDefault();
    const text=input.trim();
    if(!text||!courseId||loading)return;
    setLoading(true);setStatus("");
    const optimistic={id:"tmp-"+Date.now(),role:"user",content:text};
    setMessages(v=>[...v,optimistic]);setInput("");
    const {data,error}=await supabase.functions.invoke("vydys-ai",{body:{
      mode,course_id:courseId,thread_id:threadId,message:text,language:lang
    }});
    setLoading(false);
    if(error){
      setStatus(t({
        fr:"Le module Vydys AI est installé, mais le moteur IA serveur doit encore être activé avec sa clé API.",
        ar:"تم تثبيت Vydys AI، لكن يجب تفعيل محرك الذكاء الاصطناعي على الخادم بمفتاح API.",
        en:"Vydys AI is installed, but the server AI engine still needs its API key."
      }));
      await loadThreads(courseId);return;
    }
    if(data?.error){
      setStatus(data.message||data.error);return;
    }
    if(data?.thread_id){setThreadId(data.thread_id);await openThread(data.thread_id);await loadThreads(courseId)}
    if(typeof data?.remaining==="number")setRemaining(data.remaining);
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="ai-page"><div className="container">
    <div className="ai-page-head"><div><span className="eyebrow">Vydys AI</span><h1>{isTutor?t({fr:"Mon AI Tutor",ar:"مدرّسي الذكي",en:"My AI Tutor"}):t({fr:"Copilote Formateur",ar:"مساعد المدرب الذكي",en:"Instructor Copilot"})}</h1><p>{isTutor?t({fr:"Un tuteur qui connaît le contenu de votre formation et vous aide à comprendre, pratiquer et progresser.",ar:"مدرس يعرف محتوى دورتك ويساعدك على الفهم والتطبيق والتقدم.",en:"A tutor that knows your course and helps you understand, practice and improve."}):t({fr:"Concevez plus vite des formations IA et Tech de haute qualité, tout en gardant le contrôle éditorial.",ar:"أنشئ دورات ذكاء اصطناعي وتقنية عالية الجودة بسرعة مع الحفاظ على التحكم.",en:"Build high-quality AI and Tech courses faster while keeping editorial control."})}</p></div>{remaining!==null&&<span className="ai-quota">{remaining} {t({fr:"messages restants",ar:"رسالة متبقية",en:"messages left"})}</span>}</div>

    <div className="ai-course-bar"><select value={courseId} onChange={e=>setCourseId(e.target.value)}>{courses.length===0&&<option value="">{t({fr:"Aucune formation disponible",ar:"لا توجد دورة",en:"No course available"})}</option>}{courses.map(c=><option key={c.id} value={c.id}>{localCourse(c)}</option>)}</select><button className="btn btn-ghost" onClick={newThread}>{t({fr:"+ Nouvelle conversation",ar:"+ محادثة جديدة",en:"+ New chat"})}</button></div>

    <div className="ai-layout">
      <aside className="ai-history panel"><h3>{t({fr:"Historique",ar:"السجل",en:"History"})}</h3>{threads.length===0?<p>{t({fr:"Aucune conversation.",ar:"لا توجد محادثات.",en:"No conversations yet."})}</p>:threads.map(th=><button className={threadId===th.id?"active":""} onClick={()=>openThread(th.id)} key={th.id}><strong>{th.title}</strong><small>{new Date(th.updated_at).toLocaleDateString()}</small></button>)}</aside>

      <main className="ai-chat panel">
        {messages.length===0?<div className="ai-empty"><div className="ai-orb">AI</div><h2>{isTutor?t({fr:"Que voulez-vous apprendre aujourd'hui ?",ar:"ماذا تريد أن تتعلم اليوم؟",en:"What do you want to learn today?"}):t({fr:"Que voulez-vous construire ?",ar:"ماذا تريد أن تبني؟",en:"What do you want to build?"})}</h2><div className="ai-suggestions">{suggestions.map((s,i)=><button key={i} onClick={()=>setInput(s)}>{s}</button>)}</div></div>:<div className="ai-messages">{messages.map(m=><div className={m.role==="user"?"ai-message user":"ai-message assistant"} key={m.id}><div className="ai-role">{m.role==="user"?t({fr:"Vous",ar:"أنت",en:"You"}):"Vydys AI"}</div><div className="ai-message-content">{m.content}</div></div>)}{loading&&<div className="ai-message assistant"><div className="ai-role">Vydys AI</div><div className="ai-thinking">•••</div></div>}</div>}
        {status&&<p className="manual-note">{status}</p>}
        <form className="ai-composer" onSubmit={send}><textarea rows={3} value={input} onChange={e=>setInput(e.target.value)} placeholder={isTutor?t({fr:"Posez une question sur votre formation...",ar:"اطرح سؤالاً عن دورتك...",en:"Ask about your course..."}):t({fr:"Demandez un plan, une leçon, un quiz, un projet...",ar:"اطلب خطة أو درساً أو اختباراً أو مشروعاً...",en:"Ask for a curriculum, lesson, quiz or project..."})}/><button className="btn" disabled={loading||!input.trim()||!courseId}>{loading?"...":t({fr:"Envoyer",ar:"إرسال",en:"Send"})}</button></form>
      </main>
    </div>
  </div></section>
}
