"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

const providerLabels:Record<string,string>={openai:"OpenAI",anthropic:"Claude",google:"Gemini"};
const defaults:Record<string,string>={openai:"gpt-6-luna",anthropic:"claude-sonnet-4-5",google:"gemini-2.5-flash"};

export default function AILabPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [userId,setUserId]=useState("");
  const [credentials,setCredentials]=useState<any[]>([]);
  const [agents,setAgents]=useState<any[]>([]);
  const [courses,setCourses]=useState<any[]>([]);
  const [knowledgeDocs,setKnowledgeDocs]=useState<any[]>([]);
  const [selectedDocIds,setSelectedDocIds]=useState<string[]>([]);
  const [provider,setProvider]=useState("openai");
  const [apiKey,setApiKey]=useState("");
  const [savingKey,setSavingKey]=useState(false);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [model,setModel]=useState(defaults.openai);
  const [systemPrompt,setSystemPrompt]=useState("");
  const [knowledgeMode,setKnowledgeMode]=useState("none");
  const [courseId,setCourseId]=useState("");
  const [activeAgent,setActiveAgent]=useState<any>(null);
  const [threads,setThreads]=useState<any[]>([]);
  const [threadId,setThreadId]=useState<string|null>(null);
  const [messages,setMessages]=useState<any[]>([]);
  const [chat,setChat]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");

  const connected=useMemo(()=>new Set(credentials.filter(x=>x.status==="active").map(x=>x.provider)),[credentials]);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="student";setAllowed(ok);if(!ok)return;

    const [{data:keys},{data:a},{data:e},{data:kdocs}]=await Promise.all([
      supabase.from("user_ai_credentials").select("id,provider,key_hint,status,last_tested_at,last_error,created_at,updated_at").eq("user_id",user.id),
      supabase.from("ai_agents").select("*").eq("user_id",user.id).eq("status","active").order("updated_at",{ascending:false}),
      supabase.from("enrollments").select("course_id,courses:course_id(id,title_fr,title_ar,title_en)").eq("user_id",user.id).in("status",["active","completed"]),
      supabase.from("ai_knowledge_documents").select("id,title,file_name,status,chunk_count").eq("user_id",user.id).eq("status","ready").order("created_at",{ascending:false})
    ]);
    setCredentials(keys||[]);setAgents(a||[]);
    setCourses((e||[]).map((x:any)=>x.courses).filter(Boolean));
    setKnowledgeDocs(kdocs||[]);
  }

  useEffect(()=>{load()},[]);
  useEffect(()=>{setModel(defaults[provider]||"")},[provider]);

  async function connectKey(e:FormEvent){
    e.preventDefault();setNotice("");
    if(!apiKey.trim())return;
    setSavingKey(true);
    const {data,error}=await supabase.functions.invoke("vydys-personal-ai",{body:{action:"save_key",provider,key:apiKey.trim()}});
    setSavingKey(false);setApiKey("");
    if(error||data?.error){
      setNotice(data?.detail||data?.error||error?.message||t({fr:"Clé invalide.",ar:"المفتاح غير صالح.",en:"Invalid key."}));return;
    }
    setNotice(t({fr:"Clé testée et enregistrée de manière chiffrée.",ar:"تم اختبار المفتاح وحفظه بشكل مشفر.",en:"Key tested and stored encrypted."}));
    await load();
  }

  async function disconnect(providerName:string){
    if(!window.confirm(t({fr:"Déconnecter cette clé ?",ar:"فصل هذا المفتاح؟",en:"Disconnect this key?"})))return;
    const {data,error}=await supabase.functions.invoke("vydys-personal-ai",{body:{action:"delete_key",provider:providerName}});
    if(error||data?.error){setNotice(data?.detail||data?.error||error?.message||"Erreur");return}
    if(activeAgent?.provider===providerName){setActiveAgent(null);setMessages([]);setThreadId(null)}
    setNotice(t({fr:"Clé supprimée du coffre-fort.",ar:"تم حذف المفتاح من الخزنة.",en:"Key removed from the vault."}));
    await load();
  }

  async function createAgent(e:FormEvent){
    e.preventDefault();setNotice("");
    if(!connected.has(provider)){
      setNotice(t({fr:"Connectez d’abord une clé pour ce fournisseur.",ar:"اربط مفتاحاً لهذا المزود أولاً.",en:"Connect a key for this provider first."}));return;
    }
    const {data,error}=await supabase.from("ai_agents").insert({
      user_id:userId,name,description:description||null,provider,model,
      system_prompt:systemPrompt,
      knowledge_mode:knowledgeMode,
      course_id:knowledgeMode==="course"?courseId:null,
      knowledge_base_enabled:selectedDocIds.length>0
    }).select("*").single();
    if(error){setNotice(error.message);return}
    if(data&&selectedDocIds.length){
      const {error:mapError}=await supabase.from("ai_agent_knowledge").insert(
        selectedDocIds.map(document_id=>({agent_id:data.id,document_id}))
      );
      if(mapError){
        await supabase.from("ai_agents").delete().eq("id",data.id);
        setNotice(mapError.message);return;
      }
    }
    setName("");setDescription("");setSystemPrompt("");setKnowledgeMode("none");setCourseId("");setSelectedDocIds([]);
    setNotice(t({fr:"Agent créé. Vous pouvez maintenant discuter avec lui.",ar:"تم إنشاء الوكيل ويمكنك التحدث معه الآن.",en:"Agent created. You can chat with it now."}));
    await load();if(data)openAgent({...data,knowledge_base_enabled:selectedDocIds.length>0});
  }

  async function openAgent(agent:any){
    setActiveAgent(agent);setThreadId(null);setMessages([]);setChat("");setNotice("");
    const {data}=await supabase.from("ai_agent_threads").select("id,title,updated_at").eq("user_id",userId).eq("agent_id",agent.id).order("updated_at",{ascending:false});
    setThreads(data||[]);
  }

  async function openThread(id:string){
    setThreadId(id);
    const {data}=await supabase.from("ai_agent_messages").select("id,role,content,created_at").eq("thread_id",id).order("created_at");
    setMessages(data||[]);
  }

  function newThread(){setThreadId(null);setMessages([]);setChat("")}

  async function send(e:FormEvent){
    e.preventDefault();
    const text=chat.trim();if(!text||!activeAgent||busy)return;
    setBusy(true);setNotice("");setChat("");
    setMessages(v=>[...v,{id:"tmp-"+Date.now(),role:"user",content:text}]);
    const {data,error}=await supabase.functions.invoke("vydys-personal-ai",{body:{
      action:"run_agent",agent_id:activeAgent.id,thread_id:threadId,message:text
    }});
    setBusy(false);
    if(error||data?.error){
      setNotice(data?.detail||data?.error||error?.message||t({fr:"Erreur de l’agent.",ar:"خطأ في الوكيل.",en:"Agent error."}));return;
    }
    setThreadId(data.thread_id);
    await openThread(data.thread_id);
    const {data:th}=await supabase.from("ai_agent_threads").select("id,title,updated_at").eq("user_id",userId).eq("agent_id",activeAgent.id).order("updated_at",{ascending:false});
    setThreads(th||[]);
  }

  async function deleteAgent(id:string){
    if(!window.confirm(t({fr:"Supprimer cet agent et ses conversations ?",ar:"حذف هذا الوكيل ومحادثاته؟",en:"Delete this agent and its chats?"})))return;
    const {error}=await supabase.from("ai_agents").delete().eq("id",id);
    if(error){setNotice(error.message);return}
    if(activeAgent?.id===id){setActiveAgent(null);setMessages([]);setThreads([]);setThreadId(null)}
    await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Vydys AI Lab est réservé aux étudiants.",ar:"مختبر Vydys AI مخصص للطلاب.",en:"Vydys AI Lab is for students."})}</h1></article></div></section>;

  return <section className="ai-lab-page"><div className="container">
    <div className="dash-header ai-lab-hero"><div><span className="eyebrow">Vydys AI Lab · BYOK</span><h1>{t({fr:"Construisez votre propre agent IA.",ar:"ابنِ وكيل الذكاء الاصطناعي الخاص بك.",en:"Build your own AI agent."})}</h1><p>{t({fr:"Connectez votre propre fournisseur IA, choisissez un modèle, donnez des instructions à votre agent et utilisez éventuellement le contenu de vos formations Vydys comme contexte.",ar:"اربط مزود الذكاء الاصطناعي الخاص بك واختر النموذج والتعليمات ويمكنك استخدام محتوى دورات Vydys كسياق.",en:"Connect your own AI provider, choose a model, define your agent instructions, and optionally use your Vydys course content as context."})}</p></div><a className="btn btn-ghost" href="/ai-tutor">{t({fr:"Utiliser Vydys AI",ar:"استخدام Vydys AI",en:"Use Vydys AI"})}</a></div>
    {notice&&<p className="manual-note">{notice}</p>}

    <div className="lab2-launch-grid">
      <a className="panel lab2-launch-card rag" href="/ai-lab/knowledge"><span>RAG</span><div><strong>{t({fr:"Knowledge Base",ar:"قاعدة المعرفة",en:"Knowledge Base"})}</strong><p>{t({fr:"PDF, DOCX, notes et recherche sémantique pour vos agents.",ar:"PDF وDOCX والملاحظات والبحث الدلالي لوكلائك.",en:"PDF, DOCX, notes and semantic retrieval for your agents."})}</p></div></a>
      <a className="panel lab2-launch-card code" href="/ai-lab/code"><span>&lt;/&gt;</span><div><strong>Code Lab</strong><p>{t({fr:"Exécutez Python et JavaScript dans un bac à sable.",ar:"شغّل Python وJavaScript في بيئة معزولة.",en:"Run Python and JavaScript in a sandbox."})}</p></div></a>
      <a className="panel lab2-launch-card tutor" href="/ai-tutor"><span>AI</span><div><strong>Vydys AI Tutor</strong><p>{t({fr:"Revenez au tuteur intégré avec quota Vydys.",ar:"ارجع إلى المدرس المدمج بحصة Vydys.",en:"Use the built-in tutor with your Vydys quota."})}</p></div></a>
    </div>

    <section className="lab-section">
      <div className="section-head compact"><div><span className="eyebrow">1 · BYOK</span><h2>{t({fr:"Mes fournisseurs IA",ar:"مزودو الذكاء الاصطناعي",en:"My AI providers"})}</h2></div><p>{t({fr:"Votre clé est testée côté serveur puis chiffrée dans Supabase Vault. Vydys n’affiche jamais la clé complète après l’enregistrement.",ar:"يتم اختبار مفتاحك على الخادم ثم تشفيره في Supabase Vault ولا تعرض Vydys المفتاح كاملاً بعد الحفظ.",en:"Your key is tested server-side and encrypted in Supabase Vault. Vydys never displays the full key after saving."})}</p></div>
      <div className="provider-grid">
        {["openai","anthropic","google"].map(p=>{
          const c=credentials.find(x=>x.provider===p);
          return <article className={c?"panel provider-card connected":"panel provider-card"} key={p}><div className="provider-logo">{p==="openai"?"O":p==="anthropic"?"C":"G"}</div><div><strong>{providerLabels[p]}</strong><p>{c?t({fr:"Connecté",ar:"متصل",en:"Connected"}):t({fr:"Non connecté",ar:"غير متصل",en:"Not connected"})}</p>{c&&<small>{c.key_hint} · {c.last_tested_at?new Date(c.last_tested_at).toLocaleDateString():""}</small>}</div>{c?<button className="text-danger" onClick={()=>disconnect(p)}>{t({fr:"Déconnecter",ar:"فصل",en:"Disconnect"})}</button>:<button className="text-link" onClick={()=>setProvider(p)}>{t({fr:"Connecter",ar:"ربط",en:"Connect"})}</button>}</article>
        })}
      </div>
      <form className="panel connect-key-form" onSubmit={connectKey}>
        <div className="form-field"><span>{t({fr:"Fournisseur",ar:"المزود",en:"Provider"})}</span><select value={provider} onChange={e=>setProvider(e.target.value)}><option value="openai">OpenAI</option><option value="anthropic">Claude / Anthropic</option><option value="google">Gemini / Google AI</option></select></div>
        <div className="form-field key-field"><span>{t({fr:"Clé API",ar:"مفتاح API",en:"API key"})}</span><input type="password" autoComplete="off" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={t({fr:"Coller la clé ici — elle ne sera plus affichée",ar:"الصق المفتاح هنا ولن يتم عرضه لاحقاً",en:"Paste key here — it will not be shown again"})} required/></div>
        <button className="btn" disabled={savingKey}>{savingKey?"...":t({fr:"Tester & connecter",ar:"اختبار وربط",en:"Test & connect"})}</button>
      </form>
      <p className="lab-security-note">🔐 {t({fr:"La facturation et les quotas de ce mode dépendent directement de votre compte fournisseur. N’utilisez jamais une clé partagée ou appartenant à quelqu’un d’autre.",ar:"الفوترة والحصص في هذا الوضع تعتمد على حساب المزود الخاص بك. لا تستخدم مفتاحاً مشتركاً أو يخص شخصاً آخر.",en:"Billing and quotas in this mode come directly from your provider account. Never use a shared key or someone else’s key."})}</p>
    </section>

    <section className="lab-section">
      <div className="section-head compact"><div><span className="eyebrow">2 · Agent Builder</span><h2>{t({fr:"Mes agents",ar:"وكلائي",en:"My agents"})}</h2></div></div>
      <div className="agent-builder-layout">
        <form className="panel trainer-form agent-builder" onSubmit={createAgent}>
          <h3>{t({fr:"Créer un agent",ar:"إنشاء وكيل",en:"Create agent"})}</h3>
          <div className="form-grid"><label className="form-field"><span>{t({fr:"Nom",ar:"الاسم",en:"Name"})}</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Research Copilot" required/></label><label className="form-field"><span>{t({fr:"Fournisseur",ar:"المزود",en:"Provider"})}</span><select value={provider} onChange={e=>setProvider(e.target.value)}><option value="openai">OpenAI</option><option value="anthropic">Claude</option><option value="google">Gemini</option></select></label></div>
          <label className="form-field"><span>{t({fr:"Modèle",ar:"النموذج",en:"Model"})}</span><input value={model} onChange={e=>setModel(e.target.value)} required/><small>{t({fr:"Vous pouvez saisir un autre modèle disponible sur votre compte fournisseur.",ar:"يمكنك إدخال نموذج آخر متاح في حساب مزودك.",en:"You may enter another model available in your provider account."})}</small></label>
          <label className="form-field"><span>{t({fr:"Description",ar:"الوصف",en:"Description"})}</span><input value={description} onChange={e=>setDescription(e.target.value)} placeholder={t({fr:"À quoi sert cet agent ?",ar:"ما وظيفة هذا الوكيل؟",en:"What is this agent for?"})}/></label>
          <label className="form-field"><span>{t({fr:"Instructions de l’agent",ar:"تعليمات الوكيل",en:"Agent instructions"})}</span><textarea rows={7} value={systemPrompt} onChange={e=>setSystemPrompt(e.target.value)} placeholder={t({fr:"Ex. Tu es un mentor spécialisé en RAG. Explique, questionne et propose des exercices...",ar:"مثال: أنت مرشد متخصص في RAG. اشرح واطرح أسئلة واقترح تمارين...",en:"Example: You are a RAG mentor. Explain concepts, ask questions and propose exercises..."})} required/></label>
          <label className="form-field"><span>{t({fr:"Connaissances",ar:"المعرفة",en:"Knowledge"})}</span><select value={knowledgeMode} onChange={e=>setKnowledgeMode(e.target.value)}><option value="none">{t({fr:"Aucun contexte Vydys",ar:"بدون سياق Vydys",en:"No Vydys context"})}</option><option value="course">{t({fr:"Utiliser une de mes formations",ar:"استخدام إحدى دوراتي",en:"Use one of my courses"})}</option></select></label>
          {knowledgeMode==="course"&&<label className="form-field"><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><select value={courseId} onChange={e=>setCourseId(e.target.value)} required><option value="">{t({fr:"Choisir...",ar:"اختر...",en:"Choose..."})}</option>{courses.map(c=><option value={c.id} key={c.id}>{c.title_fr}</option>)}</select></label>}
          <div className="agent-knowledge-picker">
            <div className="agent-knowledge-head"><div><strong>{t({fr:"Knowledge Base personnelle",ar:"قاعدة المعرفة الشخصية",en:"Personal Knowledge Base"})}</strong><small>{t({fr:"RAG : l’agent retrouvera les passages pertinents avant de répondre.",ar:"RAG: سيسترجع الوكيل المقاطع المناسبة قبل الإجابة.",en:"RAG: the agent retrieves relevant passages before answering."})}</small></div><a href="/ai-lab/knowledge">{t({fr:"Gérer mes sources",ar:"إدارة مصادري",en:"Manage sources"})} ↗</a></div>
            {knowledgeDocs.length===0?<p className="knowledge-picker-empty">{t({fr:"Aucune source prête. Ajoutez d’abord un document ou une note.",ar:"لا توجد مصادر جاهزة. أضف مستنداً أو ملاحظة أولاً.",en:"No ready sources. Add a document or note first."})}</p>:<div className="knowledge-picker-list">{knowledgeDocs.map(d=><label key={d.id}><input type="checkbox" checked={selectedDocIds.includes(d.id)} onChange={e=>setSelectedDocIds(v=>e.target.checked?[...v,d.id]:v.filter(x=>x!==d.id))}/><span><strong>{d.title}</strong><small>{d.file_name} · {d.chunk_count} chunks</small></span></label>)}</div>}
          </div>
          <button className="btn">{t({fr:"Créer mon agent",ar:"إنشاء وكيلي",en:"Create my agent"})}</button>
        </form>

        <div className="agent-list">
          {agents.length===0?<article className="panel lab-empty"><div className="ai-orb">AI</div><h3>{t({fr:"Votre premier agent commence ici.",ar:"وكيلك الأول يبدأ هنا.",en:"Your first agent starts here."})}</h3><p>{t({fr:"Connectez une clé, décrivez son rôle puis commencez à expérimenter.",ar:"اربط مفتاحاً وحدد دور الوكيل ثم ابدأ التجربة.",en:"Connect a key, define its role, then start experimenting."})}</p></article>:agents.map(a=><article className={activeAgent?.id===a.id?"panel agent-card active":"panel agent-card"} key={a.id}><div className="agent-card-top"><span className="agent-provider">{providerLabels[a.provider]}</span><small>{a.model}</small></div><h3>{a.name}</h3><p>{a.description||a.system_prompt.slice(0,130)}</p><div className="agent-tags">{a.knowledge_mode==="course"&&<span className="tag">{t({fr:"Contexte formation",ar:"سياق دورة",en:"Course context"})}</span>}{a.knowledge_base_enabled&&<span className="tag">RAG Knowledge Base</span>}</div><div className="agent-card-actions"><button className="btn btn-small" onClick={()=>openAgent(a)}>{t({fr:"Ouvrir",ar:"فتح",en:"Open"})}</button><button className="btn-ghost btn-small" onClick={()=>deleteAgent(a.id)}>{t({fr:"Supprimer",ar:"حذف",en:"Delete"})}</button></div></article>)}
        </div>
      </div>
    </section>

    {activeAgent&&<section className="lab-section agent-chat-section">
      <div className="section-head compact"><div><span className="eyebrow">3 · Agent Playground</span><h2>{activeAgent.name}</h2><p>{providerLabels[activeAgent.provider]} · {activeAgent.model}</p></div><button className="btn btn-ghost" onClick={newThread}>{t({fr:"+ Nouvelle conversation",ar:"+ محادثة جديدة",en:"+ New chat"})}</button></div>
      <div className="ai-layout agent-chat-layout">
        <aside className="ai-history panel"><h3>{t({fr:"Conversations",ar:"المحادثات",en:"Conversations"})}</h3>{threads.length===0?<p>{t({fr:"Aucune conversation.",ar:"لا توجد محادثات.",en:"No conversations."})}</p>:threads.map(th=><button className={threadId===th.id?"active":""} key={th.id} onClick={()=>openThread(th.id)}><strong>{th.title}</strong><small>{new Date(th.updated_at).toLocaleDateString()}</small></button>)}</aside>
        <main className="ai-chat panel">
          {messages.length===0?<div className="ai-empty"><div className="ai-orb">{activeAgent.provider==="openai"?"O":activeAgent.provider==="anthropic"?"C":"G"}</div><h2>{t({fr:"Testez votre agent.",ar:"اختبر وكيلك.",en:"Test your agent."})}</h2><p>{t({fr:"Ce chat utilise votre propre clé API et votre propre quota fournisseur.",ar:"هذه المحادثة تستخدم مفتاح API وحصة مزودك.",en:"This chat uses your own API key and provider quota."})}</p></div>:<div className="ai-messages">{messages.map(m=><div className={m.role==="user"?"ai-message user":"ai-message assistant"} key={m.id}><div className="ai-role">{m.role==="user"?t({fr:"Vous",ar:"أنت",en:"You"}):activeAgent.name}</div><div className="ai-message-content">{m.content}</div></div>)}{busy&&<div className="ai-message assistant"><div className="ai-role">{activeAgent.name}</div><div className="ai-thinking">•••</div></div>}</div>}
          <form className="ai-composer" onSubmit={send}><textarea rows={3} value={chat} onChange={e=>setChat(e.target.value)} placeholder={t({fr:"Parlez à votre agent...",ar:"تحدث مع وكيلك...",en:"Talk to your agent..."})}/><button className="btn" disabled={busy||!chat.trim()}>{busy?"...":t({fr:"Envoyer",ar:"إرسال",en:"Send"})}</button></form>
        </main>
      </div>
    </section>}
  </div></section>
}
