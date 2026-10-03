"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function LearnCoursePage(){
  const {slug}=useParams<{slug:string}>();
  const {lang,t}=useLanguage();
  const [course,setCourse]=useState<any>(null);
  const [modules,setModules]=useState<any[]>([]);
  const [lessons,setLessons]=useState<any[]>([]);
  const [resources,setResources]=useState<any[]>([]);
  const [quizzes,setQuizzes]=useState<any[]>([]);
  const [assignments,setAssignments]=useState<any[]>([]);
  const [classrooms,setClassrooms]=useState<any[]>([]);
  const [progress,setProgress]=useState<string[]>([]);
  const [attempts,setAttempts]=useState<any[]>([]);
  const [submissions,setSubmissions]=useState<any[]>([]);
  const [activeLesson,setActiveLesson]=useState<any>(null);
  const [quizData,setQuizData]=useState<Record<string,any[]>>({});
  const [answers,setAnswers]=useState<Record<string,Record<string,string>>>({});
  const [message,setMessage]=useState("");
  const [certificate,setCertificate]=useState<string|null>(null);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:c}=await supabase.from("courses").select("*").eq("slug",slug).eq("status","published").single();
    if(!c){setCourse(false);return}
    const {data:e}=await supabase.from("enrollments").select("id,status").eq("course_id",c.id).eq("user_id",user.id).in("status",["active","completed"]).maybeSingle();
    if(!e){window.location.href="/formation/"+slug;return}
    setCourse(c);

    const [{data:m},{data:l},{data:r},{data:q},{data:a},{data:cl},{data:p},{data:at},{data:sub},{data:cert}]=await Promise.all([
      supabase.from("course_modules").select("*").eq("course_id",c.id).order("position"),
      supabase.from("course_lessons").select("*").eq("course_id",c.id).order("position"),
      supabase.from("lesson_resources").select("*").eq("course_id",c.id),
      supabase.from("quizzes").select("*").eq("course_id",c.id),
      supabase.from("assignments").select("*").eq("course_id",c.id),
      supabase.from("classrooms").select("*").eq("course_id",c.id).order("starts_at"),
      supabase.from("lesson_progress").select("lesson_id").eq("course_id",c.id).eq("user_id",user.id),
      supabase.from("quiz_attempts").select("quiz_id,score,passed,created_at").eq("course_id",c.id).eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("assignment_submissions").select("*").eq("course_id",c.id).eq("user_id",user.id),
      supabase.from("certificates").select("certificate_code").eq("course_id",c.id).eq("user_id",user.id).maybeSingle()
    ]);
    setModules(m||[]);setLessons(l||[]);setResources(r||[]);setQuizzes(q||[]);setAssignments(a||[]);setClassrooms(cl||[]);
    setProgress((p||[]).map((x:any)=>x.lesson_id));setAttempts(at||[]);setSubmissions(sub||[]);
    if(cert?.certificate_code)setCertificate(cert.certificate_code);
    if(!activeLesson&&l?.[0])setActiveLesson(l[0]);
  }
  useEffect(()=>{load()},[slug]);

  const completedPct=useMemo(()=>lessons.length?Math.round(progress.length/lessons.length*100):0,[progress,lessons]);
  const modulesWithLessons=useMemo(()=>modules.map(m=>({...m,lessons:lessons.filter(l=>l.module_id===m.id)})),[modules,lessons]);

  function local(v:any,base:string){
    return lang==="ar"?(v[base+"_ar"]||v[base+"_fr"]):lang==="en"?(v[base+"_en"]||v[base+"_fr"]):v[base+"_fr"];
  }

  async function completeLesson(){
    if(!activeLesson)return;
    const {error}=await supabase.rpc("mark_lesson_complete",{p_lesson_id:activeLesson.id});
    if(error)setMessage(error.message);else{setMessage(t({fr:"Leçon terminée ✓",ar:"تم إكمال الدرس ✓",en:"Lesson completed ✓"}));await load()}
  }

  async function openResource(r:any){
    const {data,error}=await supabase.storage.from("course-assets").createSignedUrl(r.file_path,3600);
    if(error){setMessage(error.message);return}
    if(data?.signedUrl)window.open(data.signedUrl,"_blank");
  }

  async function loadQuiz(q:any){
    if(quizData[q.id])return;
    const {data,error}=await supabase.rpc("get_quiz_questions",{p_quiz_id:q.id});
    if(error){setMessage(error.message);return}
    setQuizData(v=>({...v,[q.id]:data||[]}));
  }

  async function submitQuiz(q:any){
    const a=answers[q.id]||{};
    const {data,error}=await supabase.rpc("submit_quiz_attempt",{p_quiz_id:q.id,p_answers:a});
    if(error){setMessage(error.message);return}
    setMessage(data.passed
      ? t({fr:"Quiz réussi : ",ar:"نجحت في الاختبار: ",en:"Quiz passed: "})+data.score+"%"
      : t({fr:"Score : ",ar:"النتيجة: ",en:"Score: "})+data.score+"% · "+t({fr:"Réessayez.",ar:"حاول مرة أخرى.",en:"Try again."}));
    await load();
  }

  async function submitAssignment(a:any,text:string,file:File|null){
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    let path:string|null=null;
    if(file){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      path=user.id+"/"+course.id+"/assignments/"+crypto.randomUUID()+"-"+safe;
      const up=await supabase.storage.from("course-assets").upload(path,file,{contentType:file.type});
      if(up.error){setMessage(up.error.message);return}
    }
    const current=submissions.find(s=>s.assignment_id===a.id);
    const payload={assignment_id:a.id,course_id:course.id,user_id:user.id,submission_text:text||null,file_path:path||current?.file_path||null,status:"submitted",submitted_at:new Date().toISOString()};
    const res=current
      ? await supabase.from("assignment_submissions").update(payload).eq("id",current.id)
      : await supabase.from("assignment_submissions").insert(payload);
    if(res.error)setMessage(res.error.message);else{setMessage(t({fr:"Devoir envoyé.",ar:"تم إرسال الواجب.",en:"Assignment submitted."}));await load()}
  }

  async function issueCertificate(){
    const {data,error}=await supabase.rpc("try_issue_certificate",{p_course_id:course.id});
    if(error){setMessage(t({fr:"Certificat pas encore disponible : terminez les leçons, réussissez les quiz et faites valider les devoirs.",ar:"الشهادة غير متاحة بعد: أكمل الدروس والاختبارات والواجبات.",en:"Certificate not available yet: complete lessons, pass quizzes and have assignments accepted."}));return}
    setCertificate(data);setMessage(t({fr:"Certificat généré !",ar:"تم إنشاء الشهادة!",en:"Certificate generated!"}));
  }

  if(course===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(course===false)return <section className="dashboard-shell"><div className="container"><article className="panel">Course not found</article></div></section>;

  return <section className="learn-shell"><div className="learn-layout">
    <aside className="learn-sidebar">
      <Link className="learn-back" href="/dashboard">← {t({fr:"Mon espace",ar:"حسابي",en:"My space"})}</Link>
      <h2>{local(course,"title")}</h2>
      <div className="progress large"><span style={{width:completedPct+"%"}}/></div><small>{completedPct}% {t({fr:"terminé",ar:"مكتمل",en:"complete"})}</small>
      <div className="learn-nav">{modulesWithLessons.map(m=><div className="learn-module" key={m.id}><strong>{m.position}. {local(m,"title")}</strong>{m.lessons.map((l:any)=><button className={activeLesson?.id===l.id?"active":""} onClick={()=>setActiveLesson(l)} key={l.id}><span>{progress.includes(l.id)?"✓":l.lesson_type==="video"?"▶":"•"}</span>{local(l,"title")}</button>)}</div>)}</div>
    </aside>

    <main className="learn-main">
      {message&&<p className="manual-note">{message}</p>}
      {activeLesson&&<article className="lesson-view">
        <span className="tag">{activeLesson.lesson_type}</span><h1>{local(activeLesson,"title")}</h1>
        {activeLesson.video_url&&<div className="video-embed"><iframe src={activeLesson.video_url} title={local(activeLesson,"title")} allowFullScreen/></div>}
        {local(activeLesson,"content")&&<div className="lesson-text">{local(activeLesson,"content")}</div>}
        {resources.filter(r=>r.lesson_id===activeLesson.id).length>0&&<div className="lesson-resources"><h3>{t({fr:"Ressources",ar:"الموارد",en:"Resources"})}</h3>{resources.filter(r=>r.lesson_id===activeLesson.id).map(r=><button onClick={()=>openResource(r)} key={r.id}>📎 {r.file_name}</button>)}</div>}
        <button className="btn" onClick={completeLesson}>{progress.includes(activeLesson.id)?t({fr:"Terminée ✓",ar:"مكتمل ✓",en:"Completed ✓"}):t({fr:"Marquer comme terminée",ar:"تحديد كمكتمل",en:"Mark complete"})}</button>
      </article>}

      <section className="learning-block"><h2>Quiz</h2>{quizzes.map(q=>{const qs=quizData[q.id];const best=attempts.filter(a=>a.quiz_id===q.id).sort((a,b)=>b.score-a.score)[0];return <article className="panel quiz-student" key={q.id}><div className="panel-title"><div><h3>{local(q,"title")}</h3><small>{t({fr:"Score requis",ar:"الدرجة المطلوبة",en:"Passing score"})}: {q.passing_score}%</small></div>{best&&<strong>{best.score}%</strong>}</div>{!qs?<button className="btn btn-ghost" onClick={()=>loadQuiz(q)}>{t({fr:"Commencer",ar:"ابدأ",en:"Start quiz"})}</button>:<div className="quiz-questions">{qs.map((qq:any,i:number)=><div className="quiz-question" key={qq.id}><strong>{i+1}. {local(qq,"question")}</strong>{qq.options.map((o:any)=><label key={o.id}><input type="radio" name={qq.id} checked={(answers[q.id]||{})[qq.id]===o.id} onChange={()=>setAnswers(v=>({...v,[q.id]:{...(v[q.id]||{}),[qq.id]:o.id}}))}/><span>{local(o,"option")}</span></label>)}</div>)}<button className="btn" onClick={()=>submitQuiz(q)}>{t({fr:"Valider le quiz",ar:"إرسال الاختبار",en:"Submit quiz"})}</button></div>}</article>})}</section>

      <section className="learning-block"><h2>{t({fr:"Devoirs",ar:"الواجبات",en:"Assignments"})}</h2>{assignments.map(a=><AssignmentCard key={a.id} assignment={a} submission={submissions.find(s=>s.assignment_id===a.id)} local={local} t={t} onSubmit={submitAssignment}/>)}</section>

      <section className="learning-block"><h2>Classroom</h2><div className="classroom-list">{classrooms.map(c=><article className="panel" key={c.id}><span className="tag live">LIVE</span><h3>{c.title}</h3><p>{c.cohort_name}</p><small>{c.starts_at?new Date(c.starts_at).toLocaleString():""}</small>{c.meeting_url&&<a className="btn full" href={c.meeting_url} target="_blank" rel="noreferrer">{t({fr:"Rejoindre",ar:"انضم",en:"Join"})}</a>}</article>)}</div></section>

      <section className="certificate-cta panel"><div><span className="eyebrow">{t({fr:"Certification",ar:"الشهادة",en:"Certification"})}</span><h2>{t({fr:"Votre certificat Vydys",ar:"شهادة Vydys الخاصة بك",en:"Your Vydys certificate"})}</h2><p>{t({fr:"Disponible après avoir terminé toutes les leçons, réussi les quiz et fait accepter les devoirs.",ar:"متاحة بعد إكمال جميع الدروس والاختبارات والواجبات.",en:"Available after completing all lessons, passing quizzes and having assignments accepted."})}</p></div>{certificate?<Link className="btn" href={"/certificat/"+certificate}>{t({fr:"Voir le certificat",ar:"عرض الشهادة",en:"View certificate"})}</Link>:<button className="btn" onClick={issueCertificate}>{t({fr:"Générer mon certificat",ar:"إنشاء شهادتي",en:"Generate certificate"})}</button>}</section>
    </main>
  </div></section>
}

function AssignmentCard({assignment,submission,local,t,onSubmit}:{assignment:any,submission:any,local:(v:any,b:string)=>string,t:any,onSubmit:(a:any,text:string,file:File|null)=>void}){
  const [text,setText]=useState(submission?.submission_text||"");
  const [file,setFile]=useState<File|null>(null);
  return <article className="panel assignment-card"><div className="panel-title"><div><h3>{local(assignment,"title")}</h3><p>{local(assignment,"instructions")}</p></div>{submission&&<span className={"status "+(submission.status==="accepted"?"":"pending")}>{submission.status}</span>}</div>{submission?.feedback&&<p className="feedback-box"><strong>Feedback:</strong> {submission.feedback}{submission.grade!=null?" · "+submission.grade+"/100":""}</p>}<textarea rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder={t({fr:"Votre réponse...",ar:"إجابتك...",en:"Your answer..."})}/><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="btn" onClick={()=>onSubmit(assignment,text,file)}>{t({fr:"Envoyer le devoir",ar:"إرسال الواجب",en:"Submit assignment"})}</button></article>
}
