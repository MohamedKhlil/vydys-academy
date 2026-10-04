"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../../components/language-provider";
import { supabase } from "../../../../lib/supabase";

export default function PracticeChallenge(){
  const params=useParams<{slug:string}>();
  const {t,lang}=useLanguage();
  const [loading,setLoading]=useState(true);
  const [data,setData]=useState<any>(null);
  const [code,setCode]=useState("");
  const [running,setRunning]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [submitted,setSubmitted]=useState<any>(null);
  const [error,setError]=useState("");
  const iframeRef=useRef<HTMLIFrameElement|null>(null);

  function txt(x:any,k:string){
    if(lang==="ar")return x?.[k+"_ar"]||x?.[k+"_fr"]||"";
    if(lang==="en")return x?.[k+"_en"]||x?.[k+"_fr"]||"";
    return x?.[k+"_fr"]||"";
  }

  async function start(){
    setLoading(true);setError("");setResult(null);setSubmitted(null);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    if(p?.role!=="student"){setError(t({fr:"Challenge réservé aux étudiants.",ar:"التحدي مخصص للطلاب.",en:"Challenge is for students."}));setLoading(false);return}
    const {data:r,error:e}=await supabase.rpc("start_practice_challenge",{p_slug:String(params.slug||"")});
    if(e){setError(e.message);setLoading(false);return}
    setData(r);setCode(r.challenge.starter_code||"");setLoading(false);
  }
  useEffect(()=>{start()},[params.slug]);

  useEffect(()=>{
    const onMessage=(event:MessageEvent)=>{
      if(event.source!==iframeRef.current?.contentWindow)return;
      const d=event.data||{};
      if(d.type==="vydys-practice-result"){setResult(d);setRunning(false)}
      if(d.type==="vydys-practice-error"){setError(String(d.error||"Runtime error"));setRunning(false)}
    };
    window.addEventListener("message",onMessage);return()=>window.removeEventListener("message",onMessage);
  },[]);

  function sandboxSrc(kind:string){
    if(kind==="python_function")return `<!doctype html><html><body><script src="https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js"><\/script><script>
      let pyodide;
      const canonical=x=>JSON.stringify(x,Object.keys(x&&typeof x==="object"&&!Array.isArray(x)?x:{}).sort());
      async function boot(){try{pyodide=await loadPyodide();parent.postMessage({type:"vydys-runtime-ready"},"*")}catch(e){parent.postMessage({type:"vydys-practice-error",error:String(e)},"*")}}
      window.addEventListener("message",async e=>{
        if(e.data?.type!=="run-practice"||!pyodide)return;
        try{
          await pyodide.runPythonAsync(e.data.code);
          const fn=e.data.runtime.function_name;const details=[];let passed=0;
          for(const test of e.data.tests){
            try{
              pyodide.globals.set("_vydys_args_json",JSON.stringify(test.input.args||[]));
              pyodide.globals.set("_vydys_fn",fn);
              const raw=await pyodide.runPythonAsync("import json\n_args=json.loads(_vydys_args_json)\n_result=globals()[_vydys_fn](*_args)\njson.dumps(_result, sort_keys=True)");
              const actual=JSON.parse(String(raw));const ok=JSON.stringify(actual)===JSON.stringify(test.expected);
              if(ok)passed++;details.push({name:test.name,ok,actual,expected:test.expected});
            }catch(err){details.push({name:test.name,ok:false,error:String(err),expected:test.expected})}
          }
          parent.postMessage({type:"vydys-practice-result",passed,total:e.data.tests.length,details},"*");
        }catch(err){parent.postMessage({type:"vydys-practice-error",error:String(err?.stack||err)},"*")}
      });boot();
    <\/script></body></html>`;
    if(kind==="javascript_function")return `<!doctype html><html><body><script>
      function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==="object"){const o={};Object.keys(x).sort().forEach(k=>o[k]=stable(x[k]));return o}return x}
      window.addEventListener("message",async e=>{
        if(e.data?.type!=="run-practice")return;
        try{
          const fnName=e.data.runtime.function_name;
          const fn=new Function(e.data.code+"\nreturn typeof "+fnName+" === 'function' ? "+fnName+" : null;")();
          if(!fn)throw new Error("Function "+fnName+" not found");
          let passed=0;const details=[];
          for(const test of e.data.tests){
            try{
              const actual=await fn(...(test.input.args||[]));
              const ok=JSON.stringify(stable(actual))===JSON.stringify(stable(test.expected));
              if(ok)passed++;details.push({name:test.name,ok,actual,expected:test.expected});
            }catch(err){details.push({name:test.name,ok:false,error:String(err),expected:test.expected})}
          }
          parent.postMessage({type:"vydys-practice-result",passed,total:e.data.tests.length,details},"*");
        }catch(err){parent.postMessage({type:"vydys-practice-error",error:String(err?.stack||err)},"*")}
      });
      parent.postMessage({type:"vydys-runtime-ready"},"*");
    <\/script></body></html>`;
    return `<!doctype html><html><body><script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js"><\/script><script>
      let SQL;
      function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==="object"){const o={};Object.keys(x).sort().forEach(k=>o[k]=stable(x[k]));return o}return x}
      async function boot(){try{SQL=await initSqlJs({locateFile:f=>"https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/"+f});parent.postMessage({type:"vydys-runtime-ready"},"*")}catch(e){parent.postMessage({type:"vydys-practice-error",error:String(e)},"*")}}
      window.addEventListener("message",async e=>{
        if(e.data?.type!=="run-practice"||!SQL)return;
        try{
          let passed=0;const details=[];
          for(const test of e.data.tests){
            const db=new SQL.Database();
            try{
              db.run(e.data.runtime.schema_sql||"");db.run(test.input.setup||"");
              const sets=db.exec(e.data.code);let actual=[];
              if(sets[0])actual=sets[0].values.map(row=>Object.fromEntries(sets[0].columns.map((c,i)=>[c,row[i]])));
              const ok=JSON.stringify(stable(actual))===JSON.stringify(stable(test.expected));
              if(ok)passed++;details.push({name:test.name,ok,actual,expected:test.expected});
            }catch(err){details.push({name:test.name,ok:false,error:String(err),expected:test.expected})}
            finally{db.close()}
          }
          parent.postMessage({type:"vydys-practice-result",passed,total:e.data.tests.length,details},"*");
        }catch(err){parent.postMessage({type:"vydys-practice-error",error:String(err?.stack||err)},"*")}
      });boot();
    <\/script></body></html>`;
  }

  async function runTests(){
    if(!data||running)return;setError("");setRunning(true);setResult(null);
    const {data:r,error:e}=await supabase.rpc("get_practice_runtime",{p_attempt_id:data.attempt_id});
    if(e){setError(e.message);setRunning(false);return}
    if(!iframeRef.current){setRunning(false);return}
    iframeRef.current.srcdoc=sandboxSrc(data.challenge.challenge_type);
    const send=()=>iframeRef.current?.contentWindow?.postMessage({type:"run-practice",code,tests:r.tests,runtime:r.runtime_config},"*");
    setTimeout(send,data.challenge.challenge_type==="python_function"?3500:data.challenge.challenge_type==="sql_query"?1500:250);
  }

  async function submit(){
    if(!result||submitted)return;setRunning(true);setError("");
    const summary=(result.details||[]).map((x:any)=>`${x.ok?"PASS":"FAIL"}: ${x.name}${x.error?" — "+x.error:""}`).join("\n");
    const {data:r,error:e}=await supabase.rpc("submit_practice_challenge",{
      p_attempt_id:data.attempt_id,p_code:code,p_passed_tests:result.passed,p_total_tests:result.total,p_output_summary:summary
    });
    setRunning(false);if(e){setError(e.message);return}setSubmitted(r);
  }

  if(loading)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Vydys Challenge...</div></div></section>;
  if(error&&!data)return <section className="practice-page"><div className="container"><article className="panel"><h1>{error}</h1></article></div></section>;

  const ch=data.challenge;
  return <section className="practice-page"><div className="container">
    <div className="practice-challenge-header">
      <div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">{txt(ch,"skill")} · {ch.challenge_type.replace("_"," ")}</span><h1>{txt(ch,"title")}</h1><p>{txt(ch,"description")}</p></div>
      <div className="challenge-badges"><span>◷ {ch.duration_minutes} min</span><span>+{ch.xp} XP</span><span>{"●".repeat(ch.difficulty)}{"○".repeat(4-ch.difficulty)}</span>{data.best_score!=null&&<span>★ {Math.round(Number(data.best_score))}%</span>}</div>
    </div>

    {submitted?<div className="practice-submit-result">
      <div className="practice-result-score"><strong>{Math.round(Number(submitted.score))}%</strong><span>{t({fr:"Measured",ar:"مقاس",en:"Measured"})} · {submitted.measured_level}</span></div>
      <div><h2>{submitted.score>=65?t({fr:"Challenge réussi.",ar:"تم اجتياز التحدي.",en:"Challenge completed."}):t({fr:"Continuez à pratiquer.",ar:"واصل التدريب.",en:"Keep practicing."})}</h2><p>+{submitted.xp_awarded} XP · {submitted.is_new_best?t({fr:"nouveau meilleur score",ar:"أفضل نتيجة جديدة",en:"new best score"}):t({fr:"meilleur score conservé",ar:"تم الاحتفاظ بأفضل نتيجة",en:"best score kept"})}</p><div><Link className="btn" href="/skill-engine">{t({fr:"Voir Skill Engine",ar:"عرض Skill Engine",en:"View Skill Engine"})}</Link><button className="btn btn-ghost" onClick={start}>{t({fr:"Recommencer",ar:"إعادة",en:"Retry"})}</button></div></div>
    </div>:<>
      <article className="panel challenge-instructions"><span>01</span><div><strong>{t({fr:"Mission",ar:"المهمة",en:"Mission"})}</strong><p>{txt(ch,"instructions")}</p></div></article>
      {error&&<p className="manual-note">{error}</p>}
      <div className="practice-editor-layout">
        <section className="practice-code-editor panel">
          <div className="practice-editor-head"><strong>{ch.challenge_type==="python_function"?"solution.py":ch.challenge_type==="javascript_function"?"solution.js":"query.sql"}</strong><span>{ch.challenge_type==="sql_query"?"SQLite":ch.challenge_type==="python_function"?"Python / Pyodide":"JavaScript Sandbox"}</span></div>
          <textarea spellCheck={false} value={code} onChange={e=>setCode(e.target.value)}/>
          <div className="practice-editor-actions"><button className="btn" onClick={runTests} disabled={running}>{running?"...":"▶ "+t({fr:"Exécuter les tests",ar:"تشغيل الاختبارات",en:"Run tests"})}</button>{result&&<button className="btn btn-ghost" onClick={submit} disabled={running}>{t({fr:"Soumettre le résultat",ar:"إرسال النتيجة",en:"Submit result"})}</button>}</div>
        </section>
        <aside className="practice-tests panel">
          <div className="practice-editor-head"><strong>{t({fr:"Tests",ar:"الاختبارات",en:"Tests"})}</strong>{result&&<span>{result.passed}/{result.total}</span>}</div>
          {!result?<div className="practice-tests-empty"><span>⚙</span><p>{t({fr:"Exécutez votre solution pour lancer les tests de pratique.",ar:"شغّل الحل لبدء اختبارات التدريب.",en:"Run your solution to execute practice tests."})}</p></div>:<div className="practice-test-list">{result.details.map((x:any,i:number)=><article className={x.ok?"pass":"fail"} key={i}><span>{x.ok?"✓":"×"}</span><div><strong>{x.name}</strong>{x.error&&<small>{x.error}</small>}{!x.ok&&!x.error&&<small>{t({fr:"Résultat différent de l’attendu.",ar:"النتيجة مختلفة عن المتوقع.",en:"Result differs from expected."})}</small>}</div></article>)}</div>}
          <p className="practice-integrity-note">{t({fr:"Ces tests servent à la pratique et au score Measured. Ils ne constituent pas une certification sécurisée et n’accordent jamais Verified automatiquement.",ar:"هذه الاختبارات للتدريب ودرجة Measured ولا تعتبر شهادة آمنة ولا تمنح Verified تلقائياً.",en:"These tests are for practice and Measured scoring. They are not secure certification and never grant Verified automatically."})}</p>
        </aside>
      </div>
    </>}

    <iframe ref={iframeRef} title="Vydys Practice Sandbox" sandbox="allow-scripts" className="code-sandbox-frame"/>
  </div></section>
}
