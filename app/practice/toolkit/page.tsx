"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function DeveloperToolkit(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [jsonText,setJsonText]=useState('{"name":"Vydys","skills":["AI","Python","RAG"],"active":true}');
  const [jsonResult,setJsonResult]=useState("");
  const [regex,setRegex]=useState("\\b[A-Z]{2,}\\b"),[flags,setFlags]=useState("g"),[sample,setSample]=useState("Vydys AI Lab teaches RAG, API and SQL.");
  const [codec,setCodec]=useState("Vydys AI Lab"),[codecResult,setCodecResult]=useState("");
  const [hash,setHash]=useState(""),[uuid,setUuid]=useState("");

  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();setAllowed(p?.role==="student");setUuid(crypto.randomUUID())})()},[]);

  const matches=useMemo(()=>{
    try{
      const re=new RegExp(regex,flags);const found=[];let m;
      if(flags.includes("g")){while((m=re.exec(sample))!==null&&found.length<100){found.push({value:m[0],index:m.index});if(m[0]==="")re.lastIndex++}}
      else{m=re.exec(sample);if(m)found.push({value:m[0],index:m.index})}
      return {ok:true,found};
    }catch(e:any){return {ok:false,error:String(e.message||e),found:[]}}
  },[regex,flags,sample]);

  function formatJSON(minify=false){try{setJsonResult(JSON.stringify(JSON.parse(jsonText),null,minify?0:2))}catch(e:any){setJsonResult("ERROR: "+String(e.message||e))}}
  function codecAction(action:string){
    try{
      if(action==="url-encode")setCodecResult(encodeURIComponent(codec));
      if(action==="url-decode")setCodecResult(decodeURIComponent(codec));
      if(action==="b64-encode")setCodecResult(btoa(unescape(encodeURIComponent(codec))));
      if(action==="b64-decode")setCodecResult(decodeURIComponent(escape(atob(codec))));
    }catch(e:any){setCodecResult("ERROR: "+String(e.message||e))}
  }
  async function sha(){
    const bytes=new TextEncoder().encode(codec);const digest=await crypto.subtle.digest("SHA-256",bytes);setHash(Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join(""))
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Developer Toolkit...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Developer Toolkit</span><h1>{t({fr:"Les petits outils qu’un développeur utilise tous les jours.",ar:"الأدوات الصغيرة التي يستخدمها المطور يومياً.",en:"The small tools developers use every day."})}</h1><p>{t({fr:"Validez du JSON, testez des Regex, encodez des URL/Base64, générez SHA‑256 et UUID — sans envoyer vos données au serveur.",ar:"تحقق من JSON واختبر Regex ورمّز URL/Base64 وأنشئ SHA‑256 وUUID دون إرسال بياناتك للخادم.",en:"Validate JSON, test Regex, encode URL/Base64, generate SHA‑256 and UUID without sending data to the server."})}</p></div><span className="runner-status live">● Local only</span></div>

    <div className="dev-tool-grid">
      <section className="panel dev-tool json-tool"><div className="dev-tool-head"><span>{}</span><div><strong>JSON Lab</strong><small>format · validate · minify</small></div></div><textarea rows={10} value={jsonText} onChange={e=>setJsonText(e.target.value)} spellCheck={false}/><div className="dev-tool-actions"><button onClick={()=>formatJSON(false)}>Format</button><button onClick={()=>formatJSON(true)}>Minify</button><button onClick={()=>{try{JSON.parse(jsonText);setJsonResult("✓ Valid JSON")}catch(e:any){setJsonResult("✕ "+e.message)}}}>Validate</button></div>{jsonResult&&<pre>{jsonResult}</pre>}</section>

      <section className="panel dev-tool regex-tool"><div className="dev-tool-head"><span>.*</span><div><strong>Regex Lab</strong><small>pattern · flags · matches</small></div></div><div className="regex-row"><input value={regex} onChange={e=>setRegex(e.target.value)} spellCheck={false}/><input value={flags} onChange={e=>setFlags(e.target.value)} maxLength={6}/></div><textarea rows={7} value={sample} onChange={e=>setSample(e.target.value)}/><div className="regex-results">{matches.ok?<><strong>{matches.found.length} match(es)</strong>{matches.found.map((m:any,i:number)=><span key={i}>{m.value} <small>@{m.index}</small></span>)}</>:<p>{matches.error}</p>}</div></section>

      <section className="panel dev-tool codec-tool"><div className="dev-tool-head"><span>↔</span><div><strong>Encode / Decode</strong><small>URL · Base64</small></div></div><textarea rows={5} value={codec} onChange={e=>setCodec(e.target.value)}/><div className="dev-tool-actions"><button onClick={()=>codecAction("url-encode")}>URL Encode</button><button onClick={()=>codecAction("url-decode")}>URL Decode</button><button onClick={()=>codecAction("b64-encode")}>Base64 Encode</button><button onClick={()=>codecAction("b64-decode")}>Base64 Decode</button></div>{codecResult&&<pre>{codecResult}</pre>}</section>

      <section className="panel dev-tool crypto-tool"><div className="dev-tool-head"><span>#</span><div><strong>Hash & IDs</strong><small>SHA‑256 · UUID v4</small></div></div><button className="btn btn-small" onClick={sha}>SHA‑256 {t({fr:"du texte",ar:"للنص",en:"of text"})}</button>{hash&&<pre>{hash}</pre>}<div className="uuid-box"><small>UUID v4</small><code>{uuid}</code><button onClick={()=>setUuid(crypto.randomUUID())}>{t({fr:"Nouveau",ar:"جديد",en:"New"})}</button></div></section>
    </div>

    <article className="panel api-security-banner dev-tool-note">🔐 {t({fr:"Ces outils fonctionnent localement dans votre navigateur. Évitez malgré tout d’y coller des mots de passe, clés privées ou secrets de production.",ar:"تعمل هذه الأدوات محلياً في متصفحك. ومع ذلك تجنب لصق كلمات المرور أو المفاتيح الخاصة أو أسرار الإنتاج.",en:"These tools run locally in your browser. Still avoid pasting passwords, private keys or production secrets."})}</article>
  </div></section>
}
