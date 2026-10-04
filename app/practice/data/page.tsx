"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

function parseCSV(text:string){
  const rows:string[][]=[];let row:string[]=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],n=text[i+1];
    if(ch==='"'&&q&&n==='"'){cell+='"';i++;continue}
    if(ch==='"'){q=!q;continue}
    if(ch===','&&!q){row.push(cell);cell="";continue}
    if((ch==='\n'||ch==='\r')&&!q){
      if(ch==='\r'&&n==='\n')i++;
      row.push(cell);if(row.some(x=>x!==""))rows.push(row);row=[];cell="";continue
    }
    cell+=ch;
  }
  row.push(cell);if(row.some(x=>x!==""))rows.push(row);
  if(rows.length<1)return {headers:[],data:[]};
  const headers=rows[0].map((h,i)=>h.trim()||"column_"+(i+1));
  const data=rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??"").trim()])));
  return {headers,data};
}
function stats(values:string[]){
  const nonEmpty=values.filter(v=>v!=="");
  const nums=nonEmpty.map(Number).filter(n=>Number.isFinite(n));
  const numeric=nonEmpty.length>0&&nums.length/nonEmpty.length>=.8;
  return {count:values.length,missing:values.length-nonEmpty.length,unique:new Set(nonEmpty).size,numeric,min:numeric&&nums.length?Math.min(...nums):null,max:numeric&&nums.length?Math.max(...nums):null,mean:numeric&&nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null};
}

export default function DataLab(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [name,setName]=useState("");
  const [headers,setHeaders]=useState<string[]>([]);
  const [rows,setRows]=useState<any[]>([]);
  const [query,setQuery]=useState("");
  const [column,setColumn]=useState("");
  const [numericOnly,setNumericOnly]=useState(false);

  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();setAllowed(p?.role==="student")})()},[]);
  const profiles=useMemo(()=>headers.map(h=>({name:h,...stats(rows.map(r=>String(r[h]??"")))})),[headers,rows]);
  const filtered=useMemo(()=>{
    let out=rows;
    if(query.trim())out=out.filter(r=>headers.some(h=>String(r[h]??"").toLowerCase().includes(query.toLowerCase())));
    if(numericOnly&&column)out=out.filter(r=>Number.isFinite(Number(r[column]))&&r[column]!=="");
    return out;
  },[rows,headers,query,column,numericOnly]);

  async function loadFile(file:File){
    if(file.size>8*1024*1024)return;
    const text=await file.text();const parsed=parseCSV(text);setName(file.name);setHeaders(parsed.headers);setRows(parsed.data);setColumn(parsed.headers[0]||"");setQuery("");
  }
  function loadSample(){
    const sample=`name,track,score,city
Awa,AI,88,Nouakchott
Moussa,Data,73,Nouadhibou
Sara,AI,91,Atar
Ahmed,Web,67,Nouakchott
Fatimetou,AI,,Rosso`;
    const p=parseCSV(sample);setName("vydys-sample.csv");setHeaders(p.headers);setRows(p.data);setColumn(p.headers[0]);
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Data Lab...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Data Lab</span><h1>{t({fr:"Touchez les données, pas seulement les slides.",ar:"تعامل مع البيانات لا مع الشرائح فقط.",en:"Work with data, not just slides."})}</h1><p>{t({fr:"Chargez un CSV localement, profilez les colonnes, détectez les valeurs manquantes et explorez les lignes sans envoyer le fichier au serveur.",ar:"حمّل CSV محلياً وحلل الأعمدة والقيم الناقصة دون إرسال الملف إلى الخادم.",en:"Load a CSV locally, profile columns, detect missing values and explore rows without uploading the file to the server."})}</p></div><Link className="btn" href="/practice/sql">SQL Lab →</Link></div>
    <div className="data-upload-zone panel"><label><input type="file" accept=".csv,text/csv" onChange={e=>e.target.files?.[0]&&loadFile(e.target.files[0])}/><span>CSV</span><div><strong>{name||t({fr:"Déposez ou choisissez un fichier CSV",ar:"اختر ملف CSV",en:"Choose a CSV file"})}</strong><small>{t({fr:"8 MB max · traitement 100% navigateur",ar:"8 MB كحد أقصى · معالجة داخل المتصفح",en:"8 MB max · 100% browser-side processing"})}</small></div></label><button className="btn btn-ghost" onClick={loadSample}>{t({fr:"Charger un exemple",ar:"تحميل مثال",en:"Load sample"})}</button></div>
    {rows.length>0&&<>
      <div className="data-summary-grid"><article><small>{t({fr:"Lignes",ar:"الصفوف",en:"Rows"})}</small><strong>{rows.length}</strong></article><article><small>{t({fr:"Colonnes",ar:"الأعمدة",en:"Columns"})}</small><strong>{headers.length}</strong></article><article><small>{t({fr:"Valeurs manquantes",ar:"القيم الناقصة",en:"Missing values"})}</small><strong>{profiles.reduce((a,p)=>a+p.missing,0)}</strong></article><article><small>{t({fr:"Colonnes numériques",ar:"أعمدة رقمية",en:"Numeric columns"})}</small><strong>{profiles.filter(p=>p.numeric).length}</strong></article></div>
      <section className="lab-section"><div className="section-head compact"><div><span className="eyebrow">Data Profile</span><h2>{t({fr:"Comprendre les colonnes",ar:"فهم الأعمدة",en:"Understand columns"})}</h2></div></div><div className="data-profile-grid">{profiles.map(p=><article className="panel data-profile-card" key={p.name}><strong>{p.name}</strong><div><span>count <b>{p.count}</b></span><span>missing <b>{p.missing}</b></span><span>unique <b>{p.unique}</b></span>{p.numeric&&<><span>min <b>{p.min}</b></span><span>max <b>{p.max}</b></span><span>mean <b>{Number(p.mean).toFixed(2)}</b></span></>}</div><small>{p.numeric?t({fr:"Numérique",ar:"رقمي",en:"Numeric"}):t({fr:"Texte/catégorie",ar:"نص/فئة",en:"Text/category"})}</small></article>)}</div></section>
      <section className="lab-section"><div className="section-head compact"><div><span className="eyebrow">Explorer</span><h2>{t({fr:"Aperçu des données",ar:"معاينة البيانات",en:"Data preview"})}</h2></div></div><div className="data-toolbar panel"><input placeholder={t({fr:"Rechercher dans toutes les colonnes...",ar:"بحث في جميع الأعمدة...",en:"Search all columns..."})} value={query} onChange={e=>setQuery(e.target.value)}/><select value={column} onChange={e=>setColumn(e.target.value)}>{headers.map(h=><option key={h}>{h}</option>)}</select><label><input type="checkbox" checked={numericOnly} onChange={e=>setNumericOnly(e.target.checked)}/>{t({fr:"Numériques seulement",ar:"أرقام فقط",en:"Numeric only"})}</label><span>{filtered.length} rows</span></div><div className="sql-table-wrap data-table"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(0,100).map((r,i)=><tr key={i}>{headers.map(h=><td key={h}>{String(r[h]??"")}</td>)}</tr>)}</tbody></table></div></section>
    </>}
    <article className="panel practice-tip"><strong>{t({fr:"Prochaine étape",ar:"الخطوة التالية",en:"Next step"})}</strong><p>{t({fr:"Utilisez Code Lab avec Python/pandas ou SQL Lab pour aller plus loin sur le même type de données.",ar:"استخدم Code Lab مع Python/pandas أو SQL Lab للتعمق أكثر.",en:"Use Code Lab with Python/pandas or SQL Lab to go deeper on the same data."})}</p></article>
  </div></section>
}
