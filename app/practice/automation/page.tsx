"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

type Node={id:string,type:string,label:string,config:string};
const palette=[
  ["input","Trigger","Manual input"],
  ["filter","Filter","Keep matching records"],
  ["transform","Transform","Map / rename fields"],
  ["ai","AI Step","Summarize / classify"],
  ["notify","Notify","Create notification"]
];

export default function AutomationLab(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null),[userId,setUserId]=useState("");
  const [title,setTitle]=useState("My automation"),[nodes,setNodes]=useState<Node[]>([{id:"n1",type:"input",label:"Manual Trigger",config:""}]);
  const [payload,setPayload]=useState('{"customer":"Awa","amount":1200,"status":"pending"}');
  const [result,setResult]=useState<any>(null),[notice,setNotice]=useState("");

  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}setUserId(user.id);const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();setAllowed(p?.role==="student")})()},[]);
  function add(type:string,label:string){setNodes(v=>[...v,{id:crypto.randomUUID(),type,label,config:type==="filter"?"status=pending":type==="transform"?"amount_cents=amount*100":type==="ai"?"Classify urgency":type==="notify"?"Back Office alert":""}])}
  function update(id:string,key:keyof Node,value:string){setNodes(v=>v.map(n=>n.id===id?{...n,[key]:value}:n))}
  function remove(id:string){setNodes(v=>v.filter(n=>n.id!==id))}
  function simulate(){
    try{
      const input=JSON.parse(payload);let data:any={...input};const trace:any[]=[];
      for(const n of nodes){
        if(n.type==="input"){trace.push({node:n.label,status:"ok",data});continue}
        if(n.type==="filter"){
          const [k,val]=n.config.split("=");const ok=String(data[k?.trim()]??"")===String(val??"").trim();trace.push({node:n.label,status:ok?"passed":"stopped",data});if(!ok){setResult({trace,output:null});return}
        }else if(n.type==="transform"){
          if(n.config.includes("amount_cents=amount*100"))data={...data,amount_cents:Number(data.amount||0)*100};
          trace.push({node:n.label,status:"ok",data});
        }else if(n.type==="ai"){
          data={...data,ai_simulation:"Would call personal AI provider here"};trace.push({node:n.label,status:"simulated",data});
        }else if(n.type==="notify"){
          data={...data,notification:n.config||"Notification"};trace.push({node:n.label,status:"simulated",data});
        }
      }
      setResult({trace,output:data});
    }catch(e:any){setNotice(String(e.message||e))}
  }
  async function save(){
    if(!userId)return;const {error}=await supabase.from("automation_lab_flows").insert({user_id:userId,title,description:"Built in Vydys Automation Lab",trigger_type:"manual",nodes,status:result?"tested":"draft",last_test_result:result});setNotice(error?error.message:t({fr:"Workflow sauvegardé.",ar:"تم حفظ سير العمل.",en:"Workflow saved."}))
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Automation Lab...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Automation Lab</span><h1>{t({fr:"Construisez des workflows, pas seulement des prompts.",ar:"ابنِ workflows لا مجرد prompts.",en:"Build workflows, not just prompts."})}</h1><p>{t({fr:"Assemblez triggers, filtres, transformations, étapes IA et notifications puis simulez le flux de données.",ar:"اربط triggers وfilters وtransformations وخطوات AI والإشعارات ثم حاكي تدفق البيانات.",en:"Combine triggers, filters, transforms, AI steps and notifications, then simulate data flow."})}</p></div><Link className="btn" href="/ai-lab">Agent Lab →</Link></div>
    {notice&&<p className="manual-note">{notice}</p>}
    <div className="automation-layout">
      <aside className="panel automation-palette"><strong>{t({fr:"Blocs",ar:"الكتل",en:"Blocks"})}</strong>{palette.map(p=><button onClick={()=>add(p[0],p[1])} key={p[0]}><span>{p[1]}</span><small>{p[2]}</small></button>)}</aside>
      <main className="panel automation-canvas"><div className="practice-editor-head"><input value={title} onChange={e=>setTitle(e.target.value)}/><span>{nodes.length} nodes</span></div><div className="automation-flow">{nodes.map((n,i)=><div className="automation-node-wrap" key={n.id}>{i>0&&<i/>}<article className={"automation-node "+n.type}><div><span>{i+1}</span><strong>{n.label}</strong><button onClick={()=>remove(n.id)}>×</button></div><small>{n.type}</small>{n.type!=="input"&&<input value={n.config} onChange={e=>update(n.id,"config",e.target.value)}/>}</article></div>)}</div></main>
      <aside className="panel automation-test"><strong>{t({fr:"Test payload",ar:"بيانات الاختبار",en:"Test payload"})}</strong><textarea rows={8} value={payload} onChange={e=>setPayload(e.target.value)}/><button className="btn" onClick={simulate}>▶ {t({fr:"Simuler",ar:"محاكاة",en:"Simulate"})}</button><button className="btn btn-ghost" onClick={save}>{t({fr:"Sauvegarder",ar:"حفظ",en:"Save"})}</button>{result&&<div className="automation-trace">{result.trace.map((x:any,i:number)=><div key={i}><span>{x.status}</span><strong>{x.node}</strong></div>)}<pre>{JSON.stringify(result.output,null,2)}</pre></div>}</aside>
    </div>
  </div></section>
}
