"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

type Commit={id:string,message:string,branch:string};

export default function GitLab(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [branch,setBranch]=useState("main");
  const [branches,setBranches]=useState(["main"]);
  const [files,setFiles]=useState<Record<string,"modified"|"staged">>({"README.md":"modified","app.js":"modified"});
  const [commits,setCommits]=useState<Commit[]>([]);
  const [command,setCommand]=useState("git status");
  const [terminal,setTerminal]=useState<string[]>(["Vydys Git Lab — repository initialized"]);
  const [commitMessage,setCommitMessage]=useState("feat: first Vydys commit");

  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();setAllowed(p?.role==="student")})()},[]);
  const staged=useMemo(()=>Object.entries(files).filter(([,s])=>s==="staged").map(([f])=>f),[files]);

  function out(...lines:string[]){setTerminal(v=>[...v,...lines].slice(-60))}
  function run(raw=command){
    const c=raw.trim();if(!c)return;out("$ "+c);
    if(c==="git status"){
      out("On branch "+branch,...Object.entries(files).map(([f,s])=>(s==="staged"?"Changes to be committed: ":"Changes not staged: ")+f),files&&Object.keys(files).length===0?"working tree clean":"");
    }else if(c==="git add ."||c==="git add -A"){
      setFiles(v=>Object.fromEntries(Object.keys(v).map(k=>[k,"staged"])) as any);out("Staged all changes.");
    }else if(c.startsWith("git add ")){
      const f=c.slice(8).trim();if(files[f]){setFiles(v=>({...v,[f]:"staged"}));out("Staged "+f)}else out("pathspec not found: "+f);
    }else if(c.startsWith("git commit")){
      if(!staged.length){out("nothing to commit");return}
      const msg=(c.match(/-m\s+["'](.+?)["']/)?.[1]||commitMessage||"commit").slice(0,120);
      const id=Math.random().toString(16).slice(2,9);setCommits(v=>[{id,message:msg,branch},...v]);setFiles({});out("["+branch+" "+id+"] "+msg);
    }else if(c.startsWith("git branch ")){
      const b=c.slice(11).trim();if(!b){out("branch name required");return}if(branches.includes(b)){out("fatal: branch already exists");return}setBranches(v=>[...v,b]);out("Created branch "+b);
    }else if(c.startsWith("git switch ")){
      const b=c.slice(11).trim();if(branches.includes(b)){setBranch(b);out("Switched to branch '"+b+"'")}else out("fatal: invalid reference: "+b);
    }else if(c==="git log"||c==="git log --oneline"){
      out(...(commits.length?commits.map(x=>x.id+" "+x.message):["No commits yet."]));
    }else if(c==="git diff"){
      out(...Object.entries(files).filter(([,s])=>s==="modified").map(([f])=>"diff --git a/"+f+" b/"+f+"\n+ simulated change in "+f),...(Object.keys(files).length?[]:["No diff."]));
    }else if(c==="git restore ."){
      setFiles({});out("Restored working tree.");
    }else out("Supported commands: git status · git add . · git add <file> · git commit -m "..." · git branch <name> · git switch <name> · git log --oneline · git diff · git restore .");
  }

  if(allowed===null)return <section className="practice-page"><div className="container"><div className="skill-engine-loading">Git Lab...</div></div></section>;
  return <section className="practice-page"><div className="container">
    <div className="practice-lab-header"><div><Link href="/practice">← Practice Hub</Link><span className="eyebrow">Vydys Git Lab</span><h1>{t({fr:"Apprenez Git sans casser un vrai repo.",ar:"تعلم Git دون المخاطرة بمستودع حقيقي.",en:"Learn Git without breaking a real repo."})}</h1><p>{t({fr:"Travaillez branches, staging, commits, diff et historique dans un simulateur pédagogique.",ar:"تدرّب على الفروع وstaging وcommits وdiff والسجل في محاكي تعليمي.",en:"Practice branches, staging, commits, diff and history in a learning simulator."})}</p></div><Link className="btn" href="/projects">Projects →</Link></div>
    <div className="git-lab-grid">
      <section className="panel git-repo-card"><div className="practice-editor-head"><strong>repository</strong><span>{branch}</span></div><div className="git-branch-row"><strong>{t({fr:"Branches",ar:"الفروع",en:"Branches"})}</strong>{branches.map(b=><button className={b===branch?"active":""} onClick={()=>{setBranch(b);out("Switched to branch '"+b+"'")}} key={b}>{b}</button>)}</div><div className="git-file-list">{Object.entries(files).length===0?<p>✓ working tree clean</p>:Object.entries(files).map(([f,s])=><div key={f}><span>{s==="staged"?"S":"M"}</span><strong>{f}</strong><small>{s}</small></div>)}</div><label className="form-field"><span>Commit message</span><input value={commitMessage} onChange={e=>setCommitMessage(e.target.value)}/></label><div className="git-quick-actions"><button onClick={()=>run("git add .")}>git add .</button><button onClick={()=>run('git commit -m "'+commitMessage+'"')}>git commit</button><button onClick={()=>run("git diff")}>git diff</button><button onClick={()=>run("git log --oneline")}>git log</button></div></section>
      <section className="panel git-terminal-card"><div className="practice-editor-head"><strong>terminal</strong><span>Git simulator</span></div><pre>{terminal.join("\n")}</pre><div className="git-command-row"><span>$</span><input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")run()}}/><button className="btn" onClick={()=>run()}>{t({fr:"Exécuter",ar:"تشغيل",en:"Run"})}</button></div></section>
    </div>
    <article className="panel practice-tip"><strong>{t({fr:"À maîtriser",ar:"ما يجب إتقانه",en:"Skills to master"})}</strong><p>status · add · commit · branch · switch · diff · log · restore · merge concepts · pull request workflow</p></article>
  </div></section>
}
