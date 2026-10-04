"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

const pythonStarter=`# Vydys Python Lab
def greet(name):
    return f"Hello, {name}!"

print(greet("Vydys"))
print("2 + 2 =", 2 + 2)
`;

const jsStarter=`// Vydys JavaScript Lab
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Vydys"));
console.log("2 + 2 =", 2 + 2);
`;

export default function CodeLabPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [userId,setUserId]=useState("");
  const [language,setLanguage]=useState<"python"|"javascript">("python");
  const [code,setCode]=useState(pythonStarter);
  const [output,setOutput]=useState("");
  const [running,setRunning]=useState(false);
  const [snippets,setSnippets]=useState<any[]>([]);
  const [title,setTitle]=useState("Mon expérience");
  const iframeRef=useRef<HTMLIFrameElement|null>(null);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    setUserId(user.id);
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="student";setAllowed(ok);if(!ok)return;
    const {data:s}=await supabase.from("ai_code_snippets").select("*").eq("user_id",user.id).order("updated_at",{ascending:false});
    setSnippets(s||[]);
  }
  useEffect(()=>{load()},[]);

  useEffect(()=>{
    const onMessage=(event:MessageEvent)=>{
      if(event.source!==iframeRef.current?.contentWindow)return;
      const d=event.data||{};
      if(d.type==="vydys-code-output"){setOutput(String(d.output||""));setRunning(false)}
      if(d.type==="vydys-code-error"){setOutput(String(d.error||"Unknown error"));setRunning(false)}
      if(d.type==="vydys-python-ready"&&running)iframeRef.current?.contentWindow?.postMessage({type:"run-python",code},"*");
    };
    window.addEventListener("message",onMessage);return()=>window.removeEventListener("message",onMessage);
  },[code,running]);

  function switchLang(next:"python"|"javascript"){
    setLanguage(next);setCode(next==="python"?pythonStarter:jsStarter);setOutput("");setRunning(false);
  }

  function run(){
    setRunning(true);setOutput(t({fr:"Exécution...",ar:"جارٍ التنفيذ...",en:"Running..."}));
    if(language==="javascript"){
      const src=`<!doctype html><html><body><script>
      const send=(type,value)=>parent.postMessage({type,[type==="vydys-code-output"?"output":"error"]:value},"*");
      window.addEventListener("message",async(e)=>{
        if(e.data?.type!=="run-js")return;
        const logs=[];
        const oldLog=console.log,oldErr=console.error;
        console.log=(...a)=>logs.push(a.map(x=>typeof x==="object"?JSON.stringify(x,null,2):String(x)).join(" "));
        console.error=(...a)=>logs.push("ERROR: "+a.map(String).join(" "));
        try{
          const fn=new Function("return (async()=>{\\n"+e.data.code+"\\n})()");
          const result=await fn();
          if(result!==undefined)logs.push("=> "+String(result));
          send("vydys-code-output",logs.join("\\n")||"(no output)");
        }catch(err){send("vydys-code-error",String(err?.stack||err))}
        finally{console.log=oldLog;console.error=oldErr}
      });
      parent.postMessage({type:"vydys-js-ready"},"*");
      <\/script></body></html>`;
      if(iframeRef.current){iframeRef.current.srcdoc=src;setTimeout(()=>iframeRef.current?.contentWindow?.postMessage({type:"run-js",code},"*"),120)}
    }else{
      const src=`<!doctype html><html><body><script src="https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js"><\/script><script>
      let pyodide=null;
      const boot=async()=>{
        try{
          pyodide=await loadPyodide();
          parent.postMessage({type:"vydys-python-ready"},"*");
        }catch(err){parent.postMessage({type:"vydys-code-error",error:"Pyodide: "+String(err)},"*")}
      };
      window.addEventListener("message",async(e)=>{
        if(e.data?.type!=="run-python"||!pyodide)return;
        let out=[];
        try{
          pyodide.setStdout({batched:s=>out.push(s)});
          pyodide.setStderr({batched:s=>out.push("ERROR: "+s)});
          const result=await pyodide.runPythonAsync(e.data.code);
          if(result!==undefined&&result!==null)out.push("=> "+String(result));
          parent.postMessage({type:"vydys-code-output",output:out.join("\\n")||"(no output)"},"*");
        }catch(err){parent.postMessage({type:"vydys-code-error",error:String(err)},"*")}
      });
      boot();
      <\/script></body></html>`;
      if(iframeRef.current)iframeRef.current.srcdoc=src;
    }
  }

  async function saveSnippet(){
    if(!userId||!title.trim())return;
    const {error}=await supabase.from("ai_code_snippets").insert({user_id:userId,title:title.trim(),language,code});
    if(error){setOutput(error.message);return}
    await load();
  }

  function openSnippet(s:any){setLanguage(s.language);setCode(s.code);setTitle(s.title);setOutput("")}
  async function deleteSnippet(id:string){
    await supabase.from("ai_code_snippets").delete().eq("id",id).eq("user_id",userId);await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès étudiant requis",ar:"يلزم دخول الطالب",en:"Student access required"})}</h1></article></div></section>;

  return <section className="code-lab-page"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys AI Lab 2 · Code</span><h1>{t({fr:"Code Lab",ar:"مختبر البرمجة",en:"Code Lab"})}</h1><p>{t({fr:"Expérimentez Python et JavaScript directement dans Vydys. Le code s’exécute dans un bac à sable côté navigateur, jamais sur le serveur Vydys.",ar:"جرّب Python وJavaScript داخل Vydys. يتم تشغيل الكود في بيئة معزولة داخل المتصفح وليس على خادم Vydys.",en:"Experiment with Python and JavaScript directly in Vydys. Code runs in a browser sandbox, never on the Vydys server."})}</p></div><div className="dash-actions"><Link className="btn btn-ghost" href="/ai-lab">{t({fr:"← AI Lab",ar:"← مختبر AI",en:"← AI Lab"})}</Link><Link className="btn" href="/ai-lab/knowledge">Knowledge Base</Link></div></div>

    <div className="code-toolbar panel">
      <div className="code-tabs"><button className={language==="python"?"active":""} onClick={()=>switchLang("python")}>Python</button><button className={language==="javascript"?"active":""} onClick={()=>switchLang("javascript")}>JavaScript</button></div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={t({fr:"Nom de l’expérience",ar:"اسم التجربة",en:"Experiment name"})}/>
      <button className="btn btn-ghost" onClick={saveSnippet}>{t({fr:"Sauvegarder",ar:"حفظ",en:"Save"})}</button>
      <button className="btn" disabled={running} onClick={run}>{running?"...":"▶ "+t({fr:"Exécuter",ar:"تشغيل",en:"Run"})}</button>
    </div>

    <div className="code-lab-grid">
      <section className="code-editor panel"><div className="code-pane-head"><strong>{language==="python"?"main.py":"main.js"}</strong><span>{language==="python"?"Pyodide / WebAssembly":"Sandboxed JavaScript"}</span></div><textarea spellCheck={false} value={code} onChange={e=>setCode(e.target.value)}/></section>
      <section className="code-output panel"><div className="code-pane-head"><strong>{t({fr:"Console",ar:"وحدة التحكم",en:"Console"})}</strong><button onClick={()=>setOutput("")}>{t({fr:"Effacer",ar:"مسح",en:"Clear"})}</button></div><pre>{output||t({fr:"Exécutez votre code pour voir le résultat.",ar:"شغّل الكود لرؤية النتيجة.",en:"Run your code to see the result."})}</pre></section>
    </div>

    <iframe ref={iframeRef} title="Vydys Code Sandbox" sandbox="allow-scripts" className="code-sandbox-frame"/>

    <section className="lab-section">
      <div className="section-head compact"><div><span className="eyebrow">Snippets</span><h2>{t({fr:"Mes expériences sauvegardées",ar:"تجاربي المحفوظة",en:"My saved experiments"})}</h2></div></div>
      <div className="snippet-grid">{snippets.length===0?<article className="panel"><p>{t({fr:"Aucun snippet sauvegardé.",ar:"لا توجد مقتطفات محفوظة.",en:"No saved snippets."})}</p></article>:snippets.map(s=><article className="panel snippet-card" key={s.id}><span className="tag">{s.language}</span><h3>{s.title}</h3><small>{new Date(s.updated_at).toLocaleString()}</small><div><button className="text-link" onClick={()=>openSnippet(s)}>{t({fr:"Ouvrir",ar:"فتح",en:"Open"})}</button><button className="text-danger" onClick={()=>deleteSnippet(s.id)}>{t({fr:"Supprimer",ar:"حذف",en:"Delete"})}</button></div></article>)}</div>
    </section>
    <p className="lab-security-note">⚠️ {t({fr:"N’exécutez pas du code que vous ne comprenez pas. Le bac à sable isole le code de Vydys, mais un programme peut toujours effectuer des calculs lourds ou tenter des requêtes réseau depuis votre navigateur.",ar:"لا تشغّل كوداً لا تفهمه. البيئة المعزولة تفصل الكود عن Vydys لكن البرنامج قد يستهلك موارد كبيرة أو يحاول إجراء طلبات شبكة من متصفحك.",en:"Do not run code you do not understand. The sandbox isolates code from Vydys, but a program can still consume browser resources or attempt network requests."})}</p>
  </div></section>
}
