"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

const datasets:any={
  ecommerce:{
    label:"E-commerce",
    schema:`CREATE TABLE customers(id INTEGER PRIMARY KEY,name TEXT,city TEXT);
CREATE TABLE orders(id INTEGER PRIMARY KEY,customer_id INTEGER,amount REAL,status TEXT);
INSERT INTO customers VALUES (1,'Awa','Nouakchott'),(2,'Moussa','Nouadhibou'),(3,'Sara','Atar');
INSERT INTO orders VALUES (1,1,120,'paid'),(2,1,45,'paid'),(3,2,210,'pending'),(4,2,85,'paid'),(5,3,60,'paid');`,
    starter:"SELECT * FROM customers;"
  },
  learning:{
    label:"Learning",
    schema:`CREATE TABLE students(id INTEGER PRIMARY KEY,name TEXT,track TEXT);
CREATE TABLE progress(id INTEGER PRIMARY KEY,student_id INTEGER,lesson TEXT,score INTEGER);
INSERT INTO students VALUES (1,'Aminata','AI'),(2,'Ahmed','Data'),(3,'Fatimetou','AI');
INSERT INTO progress VALUES (1,1,'Prompting',88),(2,1,'RAG',72),(3,2,'SQL',91),(4,3,'Agents',79),(5,3,'RAG',84);`,
    starter:"SELECT s.name, p.lesson, p.score\nFROM students s\nJOIN progress p ON p.student_id = s.id\nORDER BY p.score DESC;"
  }
};

export default function SQLLab(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [dataset,setDataset]=useState("ecommerce");
  const [sql,setSql]=useState(datasets.ecommerce.starter);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const iframeRef=useRef<HTMLIFrameElement|null>(null);

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();setAllowed(p?.role==="student");
  })()},[]);

  useEffect(()=>{
    const onMessage=(e:MessageEvent)=>{
      if(e.source!==iframeRef.current?.contentWindow)return;
      if(e.data?.type==="sql-result"){setResult(e.data);setError("");setBusy(false)}
      if(e.data?.type==="sql-error"){setError(String(e.data.error||"SQL error"));setBusy(false)}
    };
    window.addEventListener("message",onMessage);return()=>window.removeEventListener("message",onMessage)
  },[]);

  function switchDataset(next:string){setDataset(next);setSql(datasets[next].starter);setResult(null);setError("")}
  function run(){
    setBusy(true);setResult(null);setError("");
    const src=`<!doctype html><html><body><script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js"><\/script><script>
      async function boot(){
        try{
          const SQL=await initSqlJs({locateFile:f=>"https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/"+f});
          const db=new SQL.Database();db.run(${JSON.stringify(datasets[dataset].schema)});
          window.addEventListener("message",e=>{
            if(e.data?.type!=="run-sql")return;
            try{
              const started=performance.now();const sets=db.exec(e.data.sql);const elapsed=Math.round(performance.now()-started);
              const out=(sets||[]).map(s=>({columns:s.columns,values:s.values}));
              parent.postMessage({type:"sql-result",sets:out,elapsed},"*");
            }catch(err){parent.postMessage({type:"sql-error",error:String(err)},"*")}
          });
          parent.postMessage({type:"sql-ready"},"*");
        }catch(err){parent.postMessage({type:"sql-error",error:String(err)},"*")}
      }boot();
    <\/script></body></html>`;
    if(iframeRef.current)iframeRef.current.srcdoc=src;
    setTimeout(()=>iframeRef.current?.contentWindow?.postMessage({type:"run-sql",sql},"*"),1400);
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">SQL Lab...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys SQL Lab</span><h1>{t({fr:"Interrogez des données pour de vrai.",ar:"استعلم عن البيانات فعلياً.",en:"Query real training data."})}</h1><p>{t({fr:"Écrivez du SQL, exécutez-le dans SQLite/WebAssembly et inspectez immédiatement le résultat.",ar:"اكتب SQL وشغله عبر SQLite/WebAssembly وشاهد النتائج فوراً.",en:"Write SQL, run it in SQLite/WebAssembly and inspect results instantly."})}</p></div><Link className="btn" href="/skill-engine">Skill Engine →</Link></div>
    <div className="lab-dataset-tabs">{Object.entries(datasets).map(([k,v]:any)=><button className={dataset===k?"active":""} onClick={()=>switchDataset(k)} key={k}>{v.label}</button>)}</div>
    <div className="sql-lab-grid">
      <section className="panel sql-editor-card"><div className="practice-editor-head"><strong>query.sql</strong><span>SQLite</span></div><textarea spellCheck={false} value={sql} onChange={e=>setSql(e.target.value)}/><div className="practice-editor-actions"><button className="btn" onClick={run} disabled={busy}>{busy?"...":"▶ "+t({fr:"Exécuter",ar:"تشغيل",en:"Run query"})}</button><button className="btn btn-ghost" onClick={()=>setSql(datasets[dataset].starter)}>{t({fr:"Réinitialiser",ar:"إعادة تعيين",en:"Reset"})}</button></div></section>
      <section className="panel sql-result-card"><div className="practice-editor-head"><strong>{t({fr:"Résultat",ar:"النتيجة",en:"Result"})}</strong>{result&&<span>{result.elapsed} ms</span>}</div>
        {error?<pre className="lab-error">{error}</pre>:!result?<div className="practice-tests-empty"><span>SQL</span><p>{t({fr:"Exécutez une requête pour voir les lignes retournées.",ar:"شغّل استعلاماً لرؤية النتائج.",en:"Run a query to see returned rows."})}</p></div>:result.sets.length===0?<p>{t({fr:"Requête exécutée sans jeu de résultats.",ar:"تم تنفيذ الاستعلام بدون نتائج.",en:"Query executed with no result set."})}</p>:result.sets.map((set:any,idx:number)=><div className="sql-table-wrap" key={idx}><table><thead><tr>{set.columns.map((c:string)=><th key={c}>{c}</th>)}</tr></thead><tbody>{set.values.map((row:any[],i:number)=><tr key={i}>{row.map((v:any,j:number)=><td key={j}>{String(v)}</td>)}</tr>)}</tbody></table></div>)}
      </section>
    </div>
    <article className="panel practice-tip"><strong>{t({fr:"Idées à pratiquer",ar:"أفكار للتدريب",en:"Try these"})}</strong><p>SELECT · WHERE · JOIN · GROUP BY · HAVING · ORDER BY · COUNT · SUM · AVG · subqueries</p></article>
    <iframe ref={iframeRef} title="SQL Sandbox" sandbox="allow-scripts" className="code-sandbox-frame"/>
  </div></section>
}
