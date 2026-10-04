"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function KnowledgePage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [userId,setUserId]=useState("");
  const [docs,setDocs]=useState<any[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [fileTitle,setFileTitle]=useState("");
  const [noteTitle,setNoteTitle]=useState("");
  const [noteText,setNoteText]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    const {data}=await supabase.from("ai_knowledge_documents")
      .select("id,title,file_name,mime_type,file_size,status,chunk_count,character_count,error_message,created_at,updated_at")
      .eq("user_id",user.id).order("created_at",{ascending:false});
    setDocs(data||[]);
  }
  useEffect(()=>{load()},[]);

  function safeName(name:string){
    return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").slice(-140)||"document";
  }
  function formatBytes(n:number){
    if(n<1024)return n+" B"; if(n<1024*1024)return (n/1024).toFixed(1)+" KB"; return (n/1024/1024).toFixed(1)+" MB";
  }

  async function uploadFile(e:FormEvent){
    e.preventDefault();setNotice("");
    if(!file||!userId)return;
    setBusy(true);
    const path=userId+"/"+crypto.randomUUID()+"/"+safeName(file.name);
    const {error:upError}=await supabase.storage.from("ai-knowledge").upload(path,file,{upsert:false,contentType:file.type});
    if(upError){setBusy(false);setNotice(upError.message);return}
    const {data,error}=await supabase.functions.invoke("vydys-knowledge",{body:{
      action:"ingest_file",storage_path:path,title:(fileTitle||file.name),file_name:file.name,mime_type:file.type,file_size:file.size
    }});
    setBusy(false);
    if(error||data?.error){
      setNotice(data?.detail||data?.error||error?.message||"Erreur d’indexation");
      await load();return;
    }
    setFile(null);setFileTitle("");
    const input=document.getElementById("knowledge-file") as HTMLInputElement|null;if(input)input.value="";
    setNotice(t({fr:"Document indexé et prêt pour vos agents.",ar:"تمت فهرسة المستند وأصبح جاهزاً لوكلائك.",en:"Document indexed and ready for your agents."}));
    await load();
  }

  async function addNote(e:FormEvent){
    e.preventDefault();setNotice("");
    if(!noteTitle.trim()||noteText.trim().length<20)return;
    setBusy(true);
    const {data,error}=await supabase.functions.invoke("vydys-knowledge",{body:{
      action:"ingest_text",title:noteTitle.trim(),text:noteText.trim()
    }});
    setBusy(false);
    if(error||data?.error){setNotice(data?.detail||data?.error||error?.message||"Erreur");await load();return}
    setNoteTitle("");setNoteText("");
    setNotice(t({fr:"Note ajoutée à votre base de connaissances.",ar:"تمت إضافة الملاحظة إلى قاعدة معرفتك.",en:"Note added to your knowledge base."}));
    await load();
  }

  async function removeDoc(id:string){
    if(!window.confirm(t({fr:"Supprimer ce document et son index RAG ?",ar:"حذف هذا المستند وفهرس RAG؟",en:"Delete this document and its RAG index?"})))return;
    setBusy(true);
    const {data,error}=await supabase.functions.invoke("vydys-knowledge",{body:{action:"delete_document",document_id:id}});
    setBusy(false);
    if(error||data?.error){setNotice(data?.detail||data?.error||error?.message||"Erreur");return}
    setNotice(t({fr:"Document supprimé.",ar:"تم حذف المستند.",en:"Document deleted."}));await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès étudiant requis",ar:"يلزم دخول الطالب",en:"Student access required"})}</h1></article></div></section>;

  return <section className="knowledge-page"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys AI Lab 2 · RAG</span><h1>{t({fr:"Ma base de connaissances",ar:"قاعدة معرفتي",en:"My knowledge base"})}</h1><p>{t({fr:"Ajoutez vos documents. Vydys extrait le texte, le découpe, crée des embeddings et permet à vos agents de retrouver les passages pertinents.",ar:"أضف مستنداتك. تستخرج Vydys النص وتقسمه وتنشئ التضمينات لتمكين وكلائك من استرجاع المقاطع المناسبة.",en:"Add your documents. Vydys extracts text, chunks it, creates embeddings, and lets your agents retrieve relevant passages."})}</p></div><div className="dash-actions"><Link className="btn btn-ghost" href="/ai-lab">{t({fr:"← AI Lab",ar:"← مختبر AI",en:"← AI Lab"})}</Link><Link className="btn" href="/ai-lab/code">Code Lab</Link></div></div>
    {notice&&<p className="manual-note">{notice}</p>}

    <div className="knowledge-input-grid">
      <form className="panel trainer-form" onSubmit={uploadFile}>
        <span className="eyebrow">{t({fr:"Importer",ar:"استيراد",en:"Upload"})}</span>
        <h2>{t({fr:"Document",ar:"مستند",en:"Document"})}</h2>
        <label className="form-field"><span>{t({fr:"Titre",ar:"العنوان",en:"Title"})}</span><input value={fileTitle} onChange={e=>setFileTitle(e.target.value)} placeholder={file?.name||t({fr:"Nom du document",ar:"اسم المستند",en:"Document name"})}/></label>
        <label className="knowledge-drop"><input id="knowledge-file" type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/json" onChange={e=>setFile(e.target.files?.[0]||null)}/><strong>{file?file.name:t({fr:"Choisir PDF, DOCX, TXT, MD, CSV ou JSON",ar:"اختر PDF أو DOCX أو TXT أو MD أو CSV أو JSON",en:"Choose PDF, DOCX, TXT, MD, CSV or JSON"})}</strong><small>{file?formatBytes(file.size):t({fr:"15 MB maximum par fichier",ar:"15 ميغابايت كحد أقصى لكل ملف",en:"15 MB maximum per file"})}</small></label>
        <button className="btn" disabled={busy||!file}>{busy?"...":t({fr:"Indexer le document",ar:"فهرسة المستند",en:"Index document"})}</button>
      </form>

      <form className="panel trainer-form" onSubmit={addNote}>
        <span className="eyebrow">{t({fr:"Écrire",ar:"كتابة",en:"Write"})}</span>
        <h2>{t({fr:"Note personnelle",ar:"ملاحظة شخصية",en:"Personal note"})}</h2>
        <label className="form-field"><span>{t({fr:"Titre",ar:"العنوان",en:"Title"})}</span><input value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Contenu",ar:"المحتوى",en:"Content"})}</span><textarea rows={8} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder={t({fr:"Collez vos notes, procédures, recherches ou connaissances ici...",ar:"الصق ملاحظاتك وإجراءاتك وأبحاثك ومعرفتك هنا...",en:"Paste notes, procedures, research, or knowledge here..."})} required/></label>
        <button className="btn" disabled={busy||noteText.trim().length<20}>{busy?"...":t({fr:"Ajouter à la Knowledge Base",ar:"إضافة إلى قاعدة المعرفة",en:"Add to Knowledge Base"})}</button>
      </form>
    </div>

    <section className="lab-section">
      <div className="section-head compact"><div><span className="eyebrow">Knowledge Library</span><h2>{t({fr:"Mes sources",ar:"مصادري",en:"My sources"})}</h2></div><p>{docs.filter(d=>d.status==="ready").length} {t({fr:"source(s) prête(s)",ar:"مصدر جاهز",en:"ready source(s)"})}</p></div>
      <div className="knowledge-grid">
        {docs.length===0?<article className="panel lab-empty"><div className="ai-orb">RAG</div><h3>{t({fr:"Ajoutez votre première source.",ar:"أضف مصدرك الأول.",en:"Add your first source."})}</h3><p>{t({fr:"Vos agents pourront ensuite rechercher automatiquement les passages les plus pertinents.",ar:"سيتمكن وكلاؤك بعد ذلك من البحث تلقائياً عن المقاطع الأكثر صلة.",en:"Your agents will then be able to retrieve the most relevant passages automatically."})}</p></article>:docs.map(d=><article className="panel knowledge-card" key={d.id}><div className="knowledge-card-top"><span className={"knowledge-status "+d.status}>{d.status==="ready"?"✓":d.status==="processing"?"…":"!"} {d.status}</span><small>{new Date(d.created_at).toLocaleDateString()}</small></div><h3>{d.title}</h3><p>{d.file_name}</p><div className="knowledge-meta"><span>{formatBytes(Number(d.file_size||0))}</span><span>{d.chunk_count} chunks</span><span>{Number(d.character_count||0).toLocaleString()} chars</span></div>{d.error_message&&<p className="knowledge-error">{d.error_message}</p>}<button className="text-danger" disabled={busy} onClick={()=>removeDoc(d.id)}>{t({fr:"Supprimer",ar:"حذف",en:"Delete"})}</button></article>)}
      </div>
    </section>

    <p className="lab-security-note">🔐 {t({fr:"Les fichiers sont privés. Seul votre compte peut les lister. Les passages utilisés par un agent sont récupérés côté serveur.",ar:"الملفات خاصة. حسابك فقط يمكنه عرضها ويتم استرجاع المقاطع المستخدمة بواسطة الوكيل على الخادم.",en:"Files are private. Only your account can list them, and agent retrieval happens server-side."})}</p>
  </div></section>
}
