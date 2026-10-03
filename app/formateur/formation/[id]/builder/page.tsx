"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../../components/language-provider";
import { supabase } from "../../../../../lib/supabase";

export default function CourseBuilderPage(){
  const {id}=useParams<{id:string}>();
  const {t}=useLanguage();
  const [course,setCourse]=useState<any>(null);
  const [modules,setModules]=useState<any[]>([]);
  const [lessons,setLessons]=useState<any[]>([]);
  const [quizzes,setQuizzes]=useState<any[]>([]);
  const [assignments,setAssignments]=useState<any[]>([]);
  const [classrooms,setClassrooms]=useState<any[]>([]);
  const [submissions,setSubmissions]=useState<any[]>([]);
  const [message,setMessage]=useState("");
  const [activeSub,setActiveSub]=useState(false);

  const [moduleTitle,setModuleTitle]=useState("");
  const [lessonModule,setLessonModule]=useState("");
  const [lessonType,setLessonType]=useState("video");
  const [lessonTitle,setLessonTitle]=useState("");
  const [lessonContent,setLessonContent]=useState("");
  const [videoUrl,setVideoUrl]=useState("");
  const [preview,setPreview]=useState(false);
  const [resourceLesson,setResourceLesson]=useState("");
  const [resourceFile,setResourceFile]=useState<File|null>(null);

  const [quizModule,setQuizModule]=useState("");
  const [quizTitle,setQuizTitle]=useState("");
  const [passingScore,setPassingScore]=useState("70");
  const [questionQuiz,setQuestionQuiz]=useState("");
  const [questionText,setQuestionText]=useState("");
  const [options,setOptions]=useState(["","","",""]);
  const [correctIndex,setCorrectIndex]=useState(0);

  const [assignmentModule,setAssignmentModule]=useState("");
  const [assignmentTitle,setAssignmentTitle]=useState("");
  const [assignmentInstructions,setAssignmentInstructions]=useState("");
  const [assignmentDue,setAssignmentDue]=useState("");

  const [classTitle,setClassTitle]=useState("");
  const [cohort,setCohort]=useState("");
  const [startsAt,setStartsAt]=useState("");
  const [endsAt,setEndsAt]=useState("");
  const [meetingUrl,setMeetingUrl]=useState("");

  async function load(){
    setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:c,error}=await supabase.from("courses").select("*").eq("id",id).eq("instructor_id",user.id).single();
    if(error||!c){setCourse(false);return}
    setCourse(c);
    const [{data:m},{data:l},{data:q},{data:a},{data:cl},{data:sub},{data:subscription}]=await Promise.all([
      supabase.from("course_modules").select("*").eq("course_id",id).order("position"),
      supabase.from("course_lessons").select("*").eq("course_id",id).order("position"),
      supabase.from("quizzes").select("*").eq("course_id",id).order("created_at"),
      supabase.from("assignments").select("*").eq("course_id",id).order("created_at"),
      supabase.from("classrooms").select("*").eq("course_id",id).order("starts_at"),
      supabase.from("assignment_submission_view").select("*").eq("course_id",id).order("submitted_at",{ascending:false}),
      supabase.from("trainer_subscriptions").select("id,ends_at").eq("instructor_id",user.id).eq("status","active")
    ]);
    setModules(m||[]);setLessons(l||[]);setQuizzes(q||[]);setAssignments(a||[]);setClassrooms(cl||[]);setSubmissions(sub||[]);
    setActiveSub((subscription||[]).some((s:any)=>!s.ends_at||new Date(s.ends_at)>=new Date()));
    if(m?.[0]&&!lessonModule){setLessonModule(m[0].id);setQuizModule(m[0].id);setAssignmentModule(m[0].id)}
    if(l?.[0]&&!resourceLesson)setResourceLesson(l[0].id);
    if(q?.[0]&&!questionQuiz)setQuestionQuiz(q[0].id);
  }
  useEffect(()=>{load()},[id]);

  const lessonsByModule=useMemo(()=>{
    const map:Record<string,any[]>={};
    modules.forEach(m=>map[m.id]=[]);
    lessons.forEach(l=>(map[l.module_id]??=[]).push(l));
    return map;
  },[modules,lessons]);

  async function addModule(e:FormEvent){
    e.preventDefault();
    const {error}=await supabase.from("course_modules").insert({course_id:id,title_fr:moduleTitle,title_ar:moduleTitle,title_en:moduleTitle,position:modules.length+1});
    if(error)setMessage(error.message);else{setModuleTitle("");await load()}
  }

  async function addLesson(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const pos=lessons.filter(l=>l.module_id===lessonModule).length+1;
    const {error}=await supabase.from("course_lessons").insert({
      course_id:id,module_id:lessonModule,instructor_id:user.id,lesson_type:lessonType,
      title_fr:lessonTitle,title_ar:lessonTitle,title_en:lessonTitle,
      content_fr:lessonContent,content_ar:lessonContent,content_en:lessonContent,
      video_url:videoUrl||null,position:pos,is_preview:preview
    });
    if(error)setMessage(error.message);else{setLessonTitle("");setLessonContent("");setVideoUrl("");setPreview(false);await load()}
  }

  async function uploadResource(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();if(!user||!resourceFile)return;
    const safe=resourceFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=user.id+"/"+id+"/resources/"+crypto.randomUUID()+"-"+safe;
    const up=await supabase.storage.from("course-assets").upload(path,resourceFile,{contentType:resourceFile.type});
    if(up.error){setMessage(up.error.message);return}
    const {error}=await supabase.from("lesson_resources").insert({
      lesson_id:resourceLesson,course_id:id,instructor_id:user.id,file_name:resourceFile.name,file_path:path,mime_type:resourceFile.type
    });
    if(error)setMessage(error.message);else{setResourceFile(null);setMessage(t({fr:"Ressource ajoutée.",ar:"تمت إضافة المورد.",en:"Resource added."}))}
  }

  async function addQuiz(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {error}=await supabase.from("quizzes").insert({course_id:id,module_id:quizModule||null,instructor_id:user.id,title_fr:quizTitle,title_ar:quizTitle,title_en:quizTitle,passing_score:Number(passingScore)});
    if(error)setMessage(error.message);else{setQuizTitle("");await load()}
  }

  async function addQuestion(e:FormEvent){
    e.preventDefault();
    if(options.some(x=>!x.trim())){setMessage(t({fr:"Remplissez les 4 réponses.",ar:"أدخل الإجابات الأربع.",en:"Fill all 4 answers."}));return}
    const {data:q,error}=await supabase.from("quiz_questions").insert({quiz_id:questionQuiz,question_fr:questionText,question_ar:questionText,question_en:questionText,position:1}).select("id").single();
    if(error||!q){setMessage(error?.message||"Erreur");return}
    const rows=options.map((opt,i)=>({question_id:q.id,option_fr:opt,option_ar:opt,option_en:opt,is_correct:i===correctIndex,position:i+1}));
    const res=await supabase.from("quiz_options").insert(rows);
    if(res.error)setMessage(res.error.message);else{setQuestionText("");setOptions(["","","",""]);setCorrectIndex(0);setMessage(t({fr:"Question ajoutée.",ar:"تمت إضافة السؤال.",en:"Question added."}))}
  }

  async function addAssignment(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {error}=await supabase.from("assignments").insert({
      course_id:id,module_id:assignmentModule||null,instructor_id:user.id,
      title_fr:assignmentTitle,title_ar:assignmentTitle,title_en:assignmentTitle,
      instructions_fr:assignmentInstructions,instructions_ar:assignmentInstructions,instructions_en:assignmentInstructions,
      due_days:assignmentDue?Number(assignmentDue):null
    });
    if(error)setMessage(error.message);else{setAssignmentTitle("");setAssignmentInstructions("");setAssignmentDue("");await load()}
  }

  async function addClassroom(e:FormEvent){
    e.preventDefault();
    const {error}=await supabase.from("classrooms").insert({
      course_id:id,title:classTitle,cohort_name:cohort,starts_at:startsAt||null,ends_at:endsAt||null,meeting_url:meetingUrl||null
    });
    if(error)setMessage(error.message);else{setClassTitle("");setCohort("");setStartsAt("");setEndsAt("");setMeetingUrl("");await load()}
  }

  async function submitForReview(){
    if(!activeSub){setMessage(t({fr:"Activez d'abord votre abonnement formateur.",ar:"فعّل اشتراك المدرب أولاً.",en:"Activate your instructor subscription first."}));return}
    if(modules.length===0||lessons.length===0){setMessage(t({fr:"Ajoutez au moins un module et une leçon avant soumission.",ar:"أضف وحدة ودرساً واحداً على الأقل قبل الإرسال.",en:"Add at least one module and one lesson before submitting."}));return}
    const {error}=await supabase.rpc("submit_course_for_review",{p_course_id:id});
    if(error)setMessage(error.message);else{setMessage(t({fr:"Formation envoyée à la Direction pour validation.",ar:"تم إرسال الدورة إلى الإدارة للمراجعة.",en:"Course submitted to Management for review."}));await load()}
  }

  async function gradeSubmission(s:any,status:"accepted"|"revision_required"){
    const gradeText=window.prompt(t({fr:"Note sur 100",ar:"الدرجة من 100",en:"Grade out of 100"}),String(s.grade??100));
    if(gradeText===null)return;
    const feedback=window.prompt(t({fr:"Commentaire au participant",ar:"ملاحظة للطالب",en:"Feedback for student"}),s.feedback||"");
    if(feedback===null)return;
    const {error}=await supabase.rpc("review_assignment_submission",{p_submission_id:s.id,p_status:status,p_grade:Number(gradeText),p_feedback:feedback});
    if(error)setMessage(error.message);else await load();
  }

  if(course===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(course===false)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Formation introuvable",ar:"الدورة غير موجودة",en:"Course not found"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Course Builder",ar:"منشئ الدورة",en:"Course Builder"})}</span><h1>{course.title_fr}</h1><p>{t({fr:"Construisez tout le parcours pédagogique avant publication.",ar:"أنشئ المسار التعليمي كاملاً قبل النشر.",en:"Build the full learning journey before publishing."})}</p></div><button className="btn" onClick={submitForReview}>{t({fr:"Soumettre à la Direction",ar:"إرسال للإدارة",en:"Submit to Management"})}</button></div>
    <div className="builder-status"><span className="tag">{course.status}</span><span>{modules.length} {t({fr:"modules",ar:"وحدات",en:"modules"})}</span><span>{lessons.length} {t({fr:"leçons",ar:"دروس",en:"lessons"})}</span><span>{quizzes.length} quiz</span><span>{assignments.length} {t({fr:"devoirs",ar:"واجبات",en:"assignments"})}</span><span>{classrooms.length} Classroom</span></div>
    {message&&<p className="manual-note">{message}</p>}

    <div className="builder-grid">
      <section className="panel builder-section"><h2>1. {t({fr:"Modules",ar:"الوحدات",en:"Modules"})}</h2>
        <form onSubmit={addModule} className="inline-form"><input value={moduleTitle} onChange={e=>setModuleTitle(e.target.value)} placeholder={t({fr:"Titre du module",ar:"عنوان الوحدة",en:"Module title"})} required/><button className="btn">+</button></form>
        <div className="builder-list">{modules.map(m=><div key={m.id}><strong>{m.position}. {m.title_fr}</strong><small>{(lessonsByModule[m.id]||[]).length} {t({fr:"leçons",ar:"دروس",en:"lessons"})}</small></div>)}</div>
      </section>

      <section className="panel builder-section"><h2>2. {t({fr:"Leçons / chapitres",ar:"الدروس / الفصول",en:"Lessons / chapters"})}</h2>
        <form onSubmit={addLesson} className="builder-form">
          <select value={lessonModule} onChange={e=>setLessonModule(e.target.value)} required><option value="">{t({fr:"Choisir module",ar:"اختر الوحدة",en:"Choose module"})}</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title_fr}</option>)}</select>
          <select value={lessonType} onChange={e=>setLessonType(e.target.value)}><option value="video">Vidéo</option><option value="text">Texte</option><option value="resource">Ressource</option><option value="live">Live</option></select>
          <input value={lessonTitle} onChange={e=>setLessonTitle(e.target.value)} placeholder={t({fr:"Titre de la leçon",ar:"عنوان الدرس",en:"Lesson title"})} required/>
          <textarea rows={4} value={lessonContent} onChange={e=>setLessonContent(e.target.value)} placeholder={t({fr:"Contenu / instructions",ar:"المحتوى / التعليمات",en:"Content / instructions"})}/>
          <input value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="YouTube / Vimeo / video URL"/>
          <label className="checkbox-line"><input type="checkbox" checked={preview} onChange={e=>setPreview(e.target.checked)}/>{t({fr:"Leçon gratuite en aperçu",ar:"درس مجاني للمعاينة",en:"Free preview lesson"})}</label>
          <button className="btn">{t({fr:"Ajouter la leçon",ar:"إضافة الدرس",en:"Add lesson"})}</button>
        </form>
      </section>

      <section className="panel builder-section"><h2>3. {t({fr:"Documents / ressources",ar:"الملفات / الموارد",en:"Documents / resources"})}</h2>
        <form onSubmit={uploadResource} className="builder-form">
          <select value={resourceLesson} onChange={e=>setResourceLesson(e.target.value)} required><option value="">{t({fr:"Choisir leçon",ar:"اختر الدرس",en:"Choose lesson"})}</option>{lessons.map(l=><option key={l.id} value={l.id}>{l.title_fr}</option>)}</select>
          <input type="file" accept=".pdf,image/*,video/mp4" onChange={e=>setResourceFile(e.target.files?.[0]||null)} required/>
          <button className="btn">{t({fr:"Téléverser",ar:"رفع",en:"Upload"})}</button>
        </form>
      </section>

      <section className="panel builder-section"><h2>4. Quiz</h2>
        <form onSubmit={addQuiz} className="builder-form">
          <select value={quizModule} onChange={e=>setQuizModule(e.target.value)}><option value="">{t({fr:"Module optionnel",ar:"الوحدة اختيارية",en:"Optional module"})}</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title_fr}</option>)}</select>
          <input value={quizTitle} onChange={e=>setQuizTitle(e.target.value)} placeholder={t({fr:"Titre du quiz",ar:"عنوان الاختبار",en:"Quiz title"})} required/>
          <input type="number" min="0" max="100" value={passingScore} onChange={e=>setPassingScore(e.target.value)} placeholder="70"/>
          <button className="btn">{t({fr:"Créer le quiz",ar:"إنشاء الاختبار",en:"Create quiz"})}</button>
        </form>
        {quizzes.length>0&&<form onSubmit={addQuestion} className="builder-form question-form">
          <h3>{t({fr:"Ajouter une question",ar:"إضافة سؤال",en:"Add question"})}</h3>
          <select value={questionQuiz} onChange={e=>setQuestionQuiz(e.target.value)} required>{quizzes.map(q=><option key={q.id} value={q.id}>{q.title_fr}</option>)}</select>
          <input value={questionText} onChange={e=>setQuestionText(e.target.value)} placeholder={t({fr:"Question",ar:"السؤال",en:"Question"})} required/>
          {options.map((opt,i)=><div className="option-editor" key={i}><input type="radio" name="correct" checked={correctIndex===i} onChange={()=>setCorrectIndex(i)}/><input value={opt} onChange={e=>setOptions(v=>v.map((x,j)=>j===i?e.target.value:x))} placeholder={t({fr:"Réponse",ar:"إجابة",en:"Answer"})+" "+(i+1)} required/></div>)}
          <button className="btn btn-ghost">{t({fr:"Ajouter la question",ar:"إضافة السؤال",en:"Add question"})}</button>
        </form>}
      </section>

      <section className="panel builder-section"><h2>5. {t({fr:"Devoirs",ar:"الواجبات",en:"Assignments"})}</h2>
        <form onSubmit={addAssignment} className="builder-form">
          <select value={assignmentModule} onChange={e=>setAssignmentModule(e.target.value)}><option value="">{t({fr:"Module optionnel",ar:"الوحدة اختيارية",en:"Optional module"})}</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title_fr}</option>)}</select>
          <input value={assignmentTitle} onChange={e=>setAssignmentTitle(e.target.value)} placeholder={t({fr:"Titre du devoir",ar:"عنوان الواجب",en:"Assignment title"})} required/>
          <textarea rows={4} value={assignmentInstructions} onChange={e=>setAssignmentInstructions(e.target.value)} placeholder={t({fr:"Instructions",ar:"التعليمات",en:"Instructions"})} required/>
          <input type="number" min="1" value={assignmentDue} onChange={e=>setAssignmentDue(e.target.value)} placeholder={t({fr:"Délai en jours",ar:"المهلة بالأيام",en:"Due in days"})}/>
          <button className="btn">{t({fr:"Ajouter le devoir",ar:"إضافة الواجب",en:"Add assignment"})}</button>
        </form>
      </section>

      <section className="panel builder-section"><h2>6. Classroom</h2>
        <form onSubmit={addClassroom} className="builder-form">
          <input value={classTitle} onChange={e=>setClassTitle(e.target.value)} placeholder={t({fr:"Titre de la session",ar:"عنوان الحصة",en:"Session title"})} required/>
          <input value={cohort} onChange={e=>setCohort(e.target.value)} placeholder={t({fr:"Promotion / groupe",ar:"الدفعة / المجموعة",en:"Cohort / group"})} required/>
          <input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/>
          <input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)}/>
          <input value={meetingUrl} onChange={e=>setMeetingUrl(e.target.value)} placeholder="Zoom / Meet / Teams URL"/>
          <button className="btn">{t({fr:"Créer la Classroom",ar:"إنشاء الفصل",en:"Create classroom"})}</button>
        </form>
      </section>
    </div>

    <section className="panel builder-outline"><h2>{t({fr:"Structure de la formation",ar:"هيكل الدورة",en:"Course structure"})}</h2>
      {modules.map(m=><div className="outline-module" key={m.id}><strong>{m.position}. {m.title_fr}</strong>{(lessonsByModule[m.id]||[]).map(l=><span key={l.id}>{l.lesson_type==="video"?"▶":"•"} {l.title_fr}{l.is_preview?" · Preview":""}</span>)}</div>)}
    </section>

    <section className="panel assignment-review"><h2>{t({fr:"Devoirs reçus",ar:"الواجبات المستلمة",en:"Assignment submissions"})}</h2>
      {submissions.length===0?<p>{t({fr:"Aucun devoir reçu.",ar:"لا توجد واجبات.",en:"No submissions yet."})}</p>:submissions.map(s=><div className="submission-row" key={s.id}><div><strong>{s.assignment_title_fr}</strong><span>{s.student_name||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</span><p>{s.submission_text}</p></div><div className="review-actions"><button className="approve" onClick={()=>gradeSubmission(s,"accepted")}>{t({fr:"Accepter",ar:"قبول",en:"Accept"})}</button><button className="reject" onClick={()=>gradeSubmission(s,"revision_required")}>{t({fr:"Révision",ar:"مراجعة",en:"Revision"})}</button></div></div>)}
    </section>
  </div></section>
}
