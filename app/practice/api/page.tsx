"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

function blockedHost(host:string){
  const h=host.toLowerCase();
  if(h==="localhost"||h.endsWith(".local")||h==="127.0.0.1"||h==="::1")return true;
  if(/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return true;
  const m=h.match(/^172\.(\d+)\./);if(m&&Number(m[1])>=16&&Number(m[1])<=31)return true;
  return false;
}

export default function APILab(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [method,setMethod]=useState("GET");
  const [url,setUrl]=useState("https://jsonplaceholder.typicode.com/todos/1");
  const [headers,setHeaders]=useState('{"Accept":"application/json"}');
  const [body,setBody]=useState('{"title":"Vydys practice","completed":false}');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState("");

  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();setAllowed(p?.role==="student")})()},[]);
  const hasBody=useMemo(()=>["POST","PUT","PATCH"].includes(method),[method]);

  async function send(){
    setError("");setResult(null);setBusy(true);
    try{
      const u=new URL(url);
      if(u.protocol!=="https:")throw new Error(t({fr:"Seules les URL HTTPS sont autorisées.",ar:"يُسمح فقط بروابط HTTPS.",en:"Only HTTPS URLs are allowed."}));
      if(blockedHost(u.hostname))throw new Error(t({fr:"Les adresses locales/privées sont bloquées.",ar:"العناوين المحلية والخاصة محظورة.",en:"Local/private addresses are blocked."}));
      const raw=JSON.parse(headers||"{}");const clean:any={};
      for(const [k,v] of Object.entries(raw)){
        const key=k.toLowerCase();
        if(["authorization","cookie","proxy-authorization"].includes(key))throw new Error(t({fr:"N’entrez pas de secrets ou tokens dans API Lab.",ar:"لا تدخل أسراراً أو رموز وصول في API Lab.",en:"Do not enter secrets or tokens in API Lab."}));
        clean[k]=String(v);
      }
      let payload:any=undefined;
      if(hasBody){JSON.parse(body||"{}");payload=body;clean["Content-Type"]=clean["Content-Type"]||"application/json"}
      const started=performance.now();
      const res=await fetch(u.toString(),{method,headers:clean,body:payload,credentials:"omit",redirect:"follow"});
      const elapsed=Math.round(performance.now()-started);
      const text=await res.text();
      let parsed:any=text;try{parsed=JSON.parse(text)}catch{}
      const responseHeaders:any={};res.headers.forEach((v,k)=>responseHeaders[k]=v);
      setResult({status:res.status,statusText:res.statusText,elapsed,headers:responseHeaders,body:parsed});
    }catch(e:any){setError(String(e?.message||e))}
    finally{setBusy(false)}
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">API Lab...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys API Lab</span><h1>{t({fr:"Comprenez les API en les utilisant.",ar:"افهم API باستخدامها فعلياً.",en:"Learn APIs by using them."})}</h1><p>{t({fr:"Construisez une requête HTTP, observez le status, les headers, le temps de réponse et le JSON retourné.",ar:"أنشئ طلب HTTP وافحص الحالة والرؤوس وزمن الاستجابة وJSON.",en:"Build an HTTP request and inspect status, headers, latency, and returned JSON."})}</p></div><Link className="btn" href="/skill-engine/assessment/api-diagnostic">{t({fr:"Test API",ar:"اختبار API",en:"API assessment"})} →</Link></div>
    <article className="api-security-banner">🔐 {t({fr:"Mode d’apprentissage sécurisé : HTTPS uniquement, adresses privées bloquées, Authorization/Cookie interdits. N’utilisez jamais une clé API secrète ici.",ar:"وضع تدريب آمن: HTTPS فقط، العناوين الخاصة محظورة، وAuthorization/Cookie غير مسموح. لا تستخدم مفتاح API سرياً هنا.",en:"Safe learning mode: HTTPS only, private addresses blocked, Authorization/Cookie forbidden. Never paste a secret API key here."})}</article>
    <div className="api-lab-grid">
      <section className="panel api-request-card">
        <div className="api-url-row"><select value={method} onChange={e=>setMethod(e.target.value)}><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select><input value={url} onChange={e=>setUrl(e.target.value)} spellCheck={false}/><button className="btn" onClick={send} disabled={busy}>{busy?"...":t({fr:"Envoyer",ar:"إرسال",en:"Send"})}</button></div>
        <label className="form-field"><span>Headers JSON</span><textarea rows={5} value={headers} onChange={e=>setHeaders(e.target.value)} spellCheck={false}/></label>
        {hasBody&&<label className="form-field"><span>Body JSON</span><textarea rows={8} value={body} onChange={e=>setBody(e.target.value)} spellCheck={false}/></label>}
        <div className="api-presets"><button onClick={()=>{setMethod("GET");setUrl("https://jsonplaceholder.typicode.com/users/1");setHeaders('{"Accept":"application/json"}')}}>GET /users/1</button><button onClick={()=>{setMethod("POST");setUrl("https://jsonplaceholder.typicode.com/posts");setBody('{"title":"Vydys","body":"Practice API","userId":1}')}}>POST /posts</button></div>
      </section>
      <section className="panel api-response-card">
        <div className="practice-editor-head"><strong>{t({fr:"Réponse",ar:"الاستجابة",en:"Response"})}</strong>{result&&<span>{result.status} · {result.elapsed} ms</span>}</div>
        {error?<pre className="lab-error">{error}</pre>:!result?<div className="practice-tests-empty"><span>API</span><p>{t({fr:"Envoyez une requête pour inspecter la réponse.",ar:"أرسل طلباً لفحص الاستجابة.",en:"Send a request to inspect the response."})}</p></div>:<>
          <div className="api-response-stats"><span className={result.status<400?"ok":"bad"}>{result.status} {result.statusText}</span><span>{result.elapsed} ms</span><span>{typeof result.body==="object"?"JSON":"Text"}</span></div>
          <details><summary>Response headers</summary><pre>{JSON.stringify(result.headers,null,2)}</pre></details>
          <pre className="api-body">{typeof result.body==="string"?result.body:JSON.stringify(result.body,null,2)}</pre>
        </>}
      </section>
    </div>
    <article className="panel practice-tip"><strong>{t({fr:"À maîtriser",ar:"ما يجب إتقانه",en:"Skills to master"})}</strong><p>GET · POST · PUT · PATCH · DELETE · status codes · JSON · headers · CORS · idempotency · pagination</p></article>
  </div></section>
}
