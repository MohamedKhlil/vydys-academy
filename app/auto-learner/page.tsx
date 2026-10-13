"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type Project={
  id:string;
  user_id:string;
  source_document_id:string;
  title:string;
  language:"fr"|"ar"|"en";
  level:string;
  status:"processing"|"ready"|"error";
  summary:string|null;
  generated_course:any;
  error_message:string|null;
  created_at:string;
  updated_at:string;
};

export default function AutoLearnerPage(){
  const {lang,t}=useLanguage();
  const [userId,setUserId]=useState("");
  const [ready,setReady]=useState(false);
  const [projects,setProjects]=useState<Project[]>([]);
  const [active,setActive]=useState<Project|null>(null);
  const [progress,setProgress]=useState<Set<string>>(new Set());
  const [file,setFile]=useState<File|null>(null);
  const [title,setTitle]=useState("");
  const [noteTitle,setNoteTitle]=useState("");
  const [noteText,setNoteText]=useState("");
  const [targetLanguage,setTargetLanguage]=useState<"fr"|"ar"|"en">(lang);
  const [level,setLevel]=useState("auto");
  const [busy,setBusy]=useState(false);
  const [stage,setStage]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{setTargetLanguage(lang)},[lang]);

  async function loadProjects(selectId?:string){
    const {data}=await supabase.from("auto_learner_projects")
      .select("id,user_id,source_document_id,title,language,level,status,summary,generated_course,error_message,created_at,updated_at")
      .order("created_at",{ascending:false});
    const rows=(data||[]) as Project[];
    setProjects(rows);
    if(selectId){
      const found=rows.find(x=>x.id===selectId)||null;
      if(found){setActive(found);await loadProgress(found.id)}
    }else if(!active&&rows[0]){
      setActive(rows[0]);await loadProgress(rows[0].id)
    }
  }

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion?next=/auto-learner";return}
    setUserId(user.id);
    setReady(true);
    await loadProjects();
  })()},[]);

  async function loadProgress(projectId:string){
    const {data}=await supabase.from("auto_learner_progress")
      .select("module_index,lesson_index,completed")
      .eq("project_id",projectId);
    setProgress(new Set((data||[]).filter((x:any)=>x.completed).map((x:any)=>x.module_index+":"+x.lesson_index)));
  }

  function safeName(name:string){
    return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").slice(-140)||"document";
  }
  function formatBytes(n:number){
    if(n<1024)return n+" B";
    if(n<1024*1024)return (n/1024).toFixed(1)+" KB";
    return (n/1024/1024).toFixed(1)+" MB";
  }
  function detectedMime(f:File){
    if(f.type)return f.type;
    const n=f.name.toLowerCase();
    if(n.endsWith(".pdf"))return "application/pdf";
    if(n.endsWith(".docx"))return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if(n.endsWith(".pptx"))return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    if(n.endsWith(".md"))return "text/markdown";
    if(n.endsWith(".csv"))return "text/csv";
    if(n.endsWith(".json"))return "application/json";
    return "text/plain";
  }

  async function generate(documentId:string,projectId?:string){
    setStage(t({fr:"L’IA analyse le contenu et construit votre parcours…",ar:"يحلل الذكاء الاصطناعي المحتوى ويبني مسارك…",en:"AI is analyzing the content and building your pathway…"}));
    const {data,error}=await supabase.functions.invoke("vydys-auto-learner",{body:{
      action:"generate",
      document_id:documentId,
      language:targetLanguage,
      level,
      project_id:projectId||undefined
    }});
    if(error||data?.error)throw new Error(data?.detail||data?.error||error?.message||"Auto Learner error");
    await loadProjects(data.project_id);
    return data.project_id as string;
  }

  async function uploadCourse(e:FormEvent){
    e.preventDefault();setNotice("");
    if(!file||!userId)return;
    setBusy(true);
    try{
      setStage(t({fr:"Import du document…",ar:"جارٍ استيراد المستند…",en:"Uploading document…"}));
      const path=userId+"/"+crypto.randomUUID()+"/"+safeName(file.name);
      const mime=detectedMime(file);
      const {error:upError}=await supabase.storage.from("ai-knowledge").upload(path,file,{upsert:false,contentType:mime});
      if(upError)throw upError;

      setStage(t({fr:"Extraction et indexation du contenu…",ar:"استخراج المحتوى وفهرسته…",en:"Extracting and indexing content…"}));
      const {data:ingest,error:ingestError}=await supabase.functions.invoke("vydys-knowledge",{body:{
        action:"ingest_file",
        storage_path:path,
        title:(title||file.name).trim(),
        file_name:file.name,
        mime_type:mime,
        file_size:file.size
      }});
      if(ingestError||ingest?.error)throw new Error(ingest?.detail||ingest?.error||ingestError?.message||"Indexing error");

      await generate(ingest.document_id);
      setFile(null);setTitle("");
      const input=document.getElementById("auto-learner-file") as HTMLInputElement|null;
      if(input)input.value="";
      setNotice(t({
        fr:"Votre cours a été analysé et transformé en parcours d’apprentissage.",
        ar:"تم تحليل دورتك وتحويلها إلى مسار تعلم.",
        en:"Your course has been analyzed and turned into a learning pathway."
      }));
    }catch(error:any){
      setNotice(error?.message||String(error));
    }finally{
      setBusy(false);setStage("");
    }
  }

  async function createFromNotes(e:FormEvent){
    e.preventDefault();setNotice("");
    if(!noteTitle.trim()||noteText.trim().length<40)return;
    setBusy(true);
    try{
      setStage(t({fr:"Préparation de vos notes…",ar:"جارٍ تجهيز ملاحظاتك…",en:"Preparing your notes…"}));
      const {data:ingest,error}=await supabase.functions.invoke("vydys-knowledge",{body:{
        action:"ingest_text",title:noteTitle.trim(),text:noteText.trim()
      }});
      if(error||ingest?.error)throw new Error(ingest?.detail||ingest?.error||error?.message||"Indexing error");
      await generate(ingest.document_id);
      setNoteTitle("");setNoteText("");
      setNotice(t({
        fr:"Vos notes sont devenues un parcours d’apprentissage complet.",
        ar:"تم تحويل ملاحظاتك إلى مسار تعلم كامل.",
        en:"Your notes are now a complete learning pathway."
      }));
    }catch(error:any){
      setNotice(error?.message||String(error));
    }finally{
      setBusy(false);setStage("");
    }
  }

  async function openProject(p:Project){
    setActive(p);
    await loadProgress(p.id);
    await supabase.from("auto_learner_projects").update({last_opened_at:new Date().toISOString()}).eq("id",p.id);
  }

  async function regenerate(){
    if(!active||busy)return;
    setBusy(true);setNotice("");
    try{
      await generate(active.source_document_id,active.id);
      setNotice(t({fr:"Parcours régénéré.",ar:"تمت إعادة إنشاء المسار.",en:"Pathway regenerated."}));
    }catch(error:any){setNotice(error?.message||String(error))}
    finally{setBusy(false);setStage("")}
  }

  async function removeProject(p:Project){
    if(!window.confirm(t({fr:"Supprimer ce parcours Auto Learner ?",ar:"حذف مسار Auto Learner هذا؟",en:"Delete this Auto Learner pathway?"})))return;
    await supabase.from("auto_learner_projects").delete().eq("id",p.id);
    if(active?.id===p.id){setActive(null);setProgress(new Set())}
    await loadProjects();
  }

  async function toggleLesson(moduleIndex:number,lessonIndex:number){
    if(!active||!userId)return;
    const key=moduleIndex+":"+lessonIndex;
    const next=!progress.has(key);
    const {error}=await supabase.from("auto_learner_progress").upsert({
      project_id:active.id,user_id:userId,module_index:moduleIndex,lesson_index:lessonIndex,
      completed:next,updated_at:new Date().toISOString()
    },{onConflict:"project_id,user_id,module_index,lesson_index"});
    if(error){setNotice(error.message);return}
    setProgress(prev=>{const n=new Set(prev);next?n.add(key):n.delete(key);return n});
  }

  const generated=active?.generated_course||{};
  const modules=Array.isArray(generated.modules)?generated.modules:[];
  const totalLessons=useMemo(()=>modules.reduce((sum:number,m:any)=>sum+(Array.isArray(m.lessons)?m.lessons.length:0),0),[modules]);
  const completedLessons=progress.size;
  const completion=totalLessons?Math.round(completedLessons/totalLessons*100):0;

  if(!ready)return <section className="dashboard-shell"><div className="container">...</div></section>;

  return <section className="auto-learner-page"><div className="container">
    <div className="auto-learner-hero">
      <div>
        <span className="eyebrow">Vydys Auto Learner · AI</span>
        <h1>{t({
          fr:"Importez n’importe quel cours. Vydys le transforme en expérience d’apprentissage.",
          ar:"استورد أي دورة. يحولها Vydys إلى تجربة تعلم كاملة.",
          en:"Import any course. Vydys turns it into a complete learning experience."
        })}</h1>
        <p>{t({
          fr:"PDF, DOCX, notes ou supports de cours : l’IA analyse votre contenu et génère automatiquement modules, leçons, résumés, exercices, flashcards, quiz, planning d’étude et projet final.",
          ar:"PDF أو DOCX أو ملاحظات أو محتوى دراسي: يحلل الذكاء الاصطناعي المحتوى وينشئ وحدات ودروساً وملخصات وتمارين وبطاقات واختبارات وخطة دراسة ومشروعاً نهائياً.",
          en:"PDF, DOCX, notes or course material: AI analyzes the content and automatically creates modules, lessons, summaries, exercises, flashcards, quizzes, a study plan and a final challenge."
        })}</p>
        <div className="auto-learner-feature-strip">
          <span>AI · {t({fr:"Analyse",ar:"تحليل",en:"Analysis"})}</span>
          <span>▦ {t({fr:"Modules & leçons",ar:"وحدات ودروس",en:"Modules & lessons"})}</span>
          <span>★ {t({fr:"Quiz & flashcards",ar:"اختبارات وبطاقات",en:"Quizzes & flashcards"})}</span>
          <span>✓ {t({fr:"Progression",ar:"تقدم",en:"Progress"})}</span>
        </div>
      </div>
      <div className="auto-learner-orb"><span>AI</span><small>AUTO LEARNER</small></div>
    </div>

    {notice&&<p className="manual-note">{notice}</p>}
    {busy&&<div className="panel auto-learner-processing"><div className="auth-complete-spinner"></div><div><strong>{stage||t({fr:"Traitement en cours…",ar:"جارٍ المعالجة…",en:"Processing…"})}</strong><small>{t({fr:"Le temps dépend de la taille du document.",ar:"يعتمد الوقت على حجم المستند.",en:"Time depends on document size."})}</small></div></div>}

    <div className="auto-learner-create-grid">
      <form className="panel auto-learner-import-card" onSubmit={uploadCourse}>
        <div className="auto-learner-card-head"><span>01</span><div><h2>{t({fr:"Importer mon cours",ar:"استيراد دورتي",en:"Import my course"})}</h2><p>{t({fr:"Déposez votre support original.",ar:"ارفع المادة الأصلية.",en:"Upload your original material."})}</p></div></div>
        <label className="form-field"><span>{t({fr:"Titre (facultatif)",ar:"العنوان (اختياري)",en:"Title (optional)"})}</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={file?.name||t({fr:"Nom du cours",ar:"اسم الدورة",en:"Course name"})}/></label>
        <label className="knowledge-drop auto-learner-drop">
          <input id="auto-learner-file" type="file"
            accept=".pdf,.docx,.pptx,.txt,.md,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/csv,application/json"
            onChange={e=>setFile(e.target.files?.[0]||null)}/>
          <span className="auto-upload-icon">↑</span>
          <strong>{file?file.name:t({fr:"Choisir ou déposer votre cours",ar:"اختر أو ارفع دورتك",en:"Choose or drop your course"})}</strong>
          <small>{file?formatBytes(file.size):"PDF · DOCX · PPTX · TXT · MD · CSV · JSON · 15 MB max"}</small>
        </label>
        <div className="auto-learner-options">
          <label><span>{t({fr:"Langue de sortie",ar:"لغة المخرجات",en:"Output language"})}</span><select value={targetLanguage} onChange={e=>setTargetLanguage(e.target.value as any)}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></label>
          <label><span>{t({fr:"Niveau",ar:"المستوى",en:"Level"})}</span><select value={level} onChange={e=>setLevel(e.target.value)}><option value="auto">{t({fr:"Détection automatique",ar:"تلقائي",en:"Auto detect"})}</option><option value="beginner">{t({fr:"Débutant",ar:"مبتدئ",en:"Beginner"})}</option><option value="intermediate">{t({fr:"Intermédiaire",ar:"متوسط",en:"Intermediate"})}</option><option value="advanced">{t({fr:"Avancé",ar:"متقدم",en:"Advanced"})}</option></select></label>
        </div>
        <button className="btn full" disabled={busy||!file}>{busy?"...":t({fr:"Analyser et créer mon parcours",ar:"تحليل وإنشاء مساري",en:"Analyze & build my pathway"})}</button>
      </form>

      <form className="panel auto-learner-import-card" onSubmit={createFromNotes}>
        <div className="auto-learner-card-head"><span>02</span><div><h2>{t({fr:"Ou coller mes notes",ar:"أو ألصق ملاحظاتي",en:"Or paste my notes"})}</h2><p>{t({fr:"Cours texte, notes, chapitre ou documentation.",ar:"نص أو ملاحظات أو فصل أو وثائق.",en:"Text course, notes, chapter or documentation."})}</p></div></div>
        <label className="form-field"><span>{t({fr:"Titre",ar:"العنوان",en:"Title"})}</span><input value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Contenu",ar:"المحتوى",en:"Content"})}</span><textarea rows={9} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder={t({fr:"Collez ici votre cours ou vos notes…",ar:"ألصق دورتك أو ملاحظاتك هنا…",en:"Paste your course or notes here…"})}/></label>
        <button className="btn btn-ghost full" disabled={busy||noteText.trim().length<40}>{busy?"...":t({fr:"Créer avec l’IA",ar:"إنشاء بالذكاء الاصطناعي",en:"Create with AI"})}</button>
      </form>
    </div>

    <div className="auto-learner-workspace">
      <aside className="panel auto-learner-library">
        <div className="auto-library-head"><div><span className="eyebrow">{t({fr:"Ma bibliothèque",ar:"مكتبتي",en:"My library"})}</span><h2>{t({fr:"Mes parcours",ar:"مساراتي",en:"My pathways"})}</h2></div><b>{projects.length}</b></div>
        {projects.length===0?<div className="auto-empty"><span>＋</span><p>{t({fr:"Importez votre premier cours pour commencer.",ar:"استورد دورتك الأولى للبدء.",en:"Import your first course to begin."})}</p></div>:projects.map(p=><button type="button" className={active?.id===p.id?"auto-project-item active":"auto-project-item"} key={p.id} onClick={()=>openProject(p)}>
          <span className={"auto-project-status "+p.status}>{p.status==="ready"?"✓":p.status==="error"?"!":"…"}</span>
          <div><strong>{p.title}</strong><small>{new Date(p.created_at).toLocaleDateString()} · {p.language.toUpperCase()}</small></div>
          <b>→</b>
        </button>)}
      </aside>

      <main className="auto-learner-course">
        {!active?<article className="panel auto-course-empty"><div className="auto-learner-orb small"><span>AI</span></div><h2>{t({fr:"Votre prochain cours commence ici.",ar:"دورتك القادمة تبدأ هنا.",en:"Your next course starts here."})}</h2><p>{t({fr:"Importez un document et laissez Auto Learner créer tout le parcours.",ar:"استورد مستنداً ودع Auto Learner ينشئ المسار بالكامل.",en:"Import a document and let Auto Learner build the whole pathway."})}</p></article>:
        active.status==="error"?<article className="panel auto-course-empty"><h2>{t({fr:"Analyse interrompue",ar:"توقف التحليل",en:"Analysis stopped"})}</h2><p>{active.error_message||"Error"}</p><button className="btn" onClick={regenerate} disabled={busy}>{t({fr:"Réessayer",ar:"إعادة المحاولة",en:"Try again"})}</button></article>:
        active.status!=="ready"?<article className="panel auto-course-empty"><div className="auth-complete-spinner"></div><h2>{t({fr:"Création en cours…",ar:"جارٍ الإنشاء…",en:"Building your pathway…"})}</h2></article>:
        <div className="auto-generated-course">
          <article className="panel auto-course-overview">
            <div className="auto-course-actions"><div><span className="eyebrow">AI GENERATED LEARNING PATH</span><h2>{generated.title||active.title}</h2></div><div><button className="btn btn-ghost btn-small" onClick={regenerate} disabled={busy}>↻ {t({fr:"Régénérer",ar:"إعادة إنشاء",en:"Regenerate"})}</button><button className="text-danger" onClick={()=>removeProject(active)}>{t({fr:"Supprimer",ar:"حذف",en:"Delete"})}</button></div></div>
            <p className="auto-course-description">{generated.description||active.summary}</p>
            <div className="auto-course-kpis">
              <div><strong>{modules.length}</strong><span>{t({fr:"modules",ar:"وحدات",en:"modules"})}</span></div>
              <div><strong>{totalLessons}</strong><span>{t({fr:"leçons",ar:"دروس",en:"lessons"})}</span></div>
              <div><strong>{generated.estimated_hours||"—"}h</strong><span>{t({fr:"estimées",ar:"تقديري",en:"estimated"})}</span></div>
              <div><strong>{completion}%</strong><span>{t({fr:"progression",ar:"تقدم",en:"progress"})}</span></div>
            </div>
            <div className="auto-progress"><span style={{width:completion+"%"}}></span></div>
          </article>

          <div className="auto-overview-grid">
            <article className="panel"><span className="eyebrow">{t({fr:"Objectifs",ar:"الأهداف",en:"Objectives"})}</span><ul>{(generated.learning_objectives||[]).map((x:string,i:number)=><li key={i}>✓ {x}</li>)}</ul></article>
            <article className="panel"><span className="eyebrow">{t({fr:"Concepts clés",ar:"المفاهيم الرئيسية",en:"Key concepts"})}</span><div className="auto-chip-list">{(generated.key_concepts||[]).map((x:string,i:number)=><span key={i}>{x}</span>)}</div></article>
          </div>

          <section className="auto-modules">
            <div className="section-head compact"><div><span className="eyebrow">{t({fr:"Parcours généré",ar:"المسار المُنشأ",en:"Generated pathway"})}</span><h2>{t({fr:"Modules & leçons",ar:"الوحدات والدروس",en:"Modules & lessons"})}</h2></div></div>
            {modules.map((m:any,mi:number)=><details className="panel auto-module" key={mi} open={mi===0}>
              <summary><span>{String(mi+1).padStart(2,"0")}</span><div><strong>{m.title}</strong><small>{m.objective} · {m.estimated_minutes||0} min</small></div><b>⌄</b></summary>
              <div className="auto-module-body">
                {(m.lessons||[]).map((lesson:any,li:number)=>{
                  const key=mi+":"+li;const done=progress.has(key);
                  return <article className={done?"auto-lesson done":"auto-lesson"} key={li}>
                    <div className="auto-lesson-head"><button type="button" className="auto-complete" onClick={()=>toggleLesson(mi,li)}>{done?"✓":"○"}</button><div><small>{t({fr:"Leçon",ar:"الدرس",en:"Lesson"})} {li+1}</small><h3>{lesson.title}</h3></div></div>
                    <p>{lesson.explanation}</p>
                    {(lesson.key_points||[]).length>0&&<div className="auto-key-points">{lesson.key_points.map((x:string,i:number)=><span key={i}>✓ {x}</span>)}</div>}
                    {(lesson.examples||[]).length>0&&<div className="auto-examples"><strong>{t({fr:"Exemples",ar:"أمثلة",en:"Examples"})}</strong>{lesson.examples.map((x:string,i:number)=><p key={i}>{x}</p>)}</div>}
                    {lesson.exercise&&<div className="auto-exercise"><strong>✎ {t({fr:"Exercice pratique",ar:"تمرين عملي",en:"Practical exercise"})}</strong><p>{lesson.exercise}</p></div>}
                    {(lesson.flashcards||[]).length>0&&<div className="auto-flashcards">{lesson.flashcards.map((f:any,i:number)=><details key={i}><summary>{f.front}</summary><p>{f.back}</p></details>)}</div>}
                  </article>
                })}
                {(m.quiz||[]).length>0&&<div className="auto-quiz"><div className="auto-quiz-title"><span>★</span><div><strong>{t({fr:"Quiz du module",ar:"اختبار الوحدة",en:"Module quiz"})}</strong><small>{m.quiz.length} {t({fr:"questions",ar:"أسئلة",en:"questions"})}</small></div></div>{m.quiz.map((q:any,qi:number)=><details key={qi}><summary>{qi+1}. {q.question}</summary><div><div className="auto-quiz-options">{(q.options||[]).map((o:string,oi:number)=><span key={oi}>{String.fromCharCode(65+oi)} · {o}</span>)}</div><p><strong>{t({fr:"Réponse :",ar:"الإجابة:",en:"Answer:"})}</strong> {q.correct_answer}</p><small>{q.explanation}</small></div></details>)}</div>}
              </div>
            </details>)}
          </section>

          <div className="auto-bottom-grid">
            <article className="panel auto-study-plan"><span className="eyebrow">{t({fr:"Planning IA",ar:"خطة الذكاء الاصطناعي",en:"AI study plan"})}</span><h2>{t({fr:"Plan d’étude",ar:"خطة الدراسة",en:"Study plan"})}</h2>{(generated.study_plan||[]).map((d:any,i:number)=><div className="auto-study-day" key={i}><span>J{d.day}</span><div><strong>{d.title}</strong><ul>{(d.tasks||[]).map((x:string,j:number)=><li key={j}>{x}</li>)}</ul></div></div>)}</article>
            {generated.final_challenge&&<article className="panel auto-final-challenge"><span className="eyebrow">FINAL CHALLENGE</span><h2>{generated.final_challenge.title}</h2><p>{generated.final_challenge.instructions}</p><strong>{t({fr:"Livrables",ar:"المخرجات",en:"Deliverables"})}</strong><ul>{(generated.final_challenge.deliverables||[]).map((x:string,i:number)=><li key={i}>{x}</li>)}</ul><strong>{t({fr:"Critères de réussite",ar:"معايير النجاح",en:"Success criteria"})}</strong><ul>{(generated.final_challenge.success_criteria||[]).map((x:string,i:number)=><li key={i}>✓ {x}</li>)}</ul></article>}
          </div>
        </div>}
      </main>
    </div>
  </div></section>
}
