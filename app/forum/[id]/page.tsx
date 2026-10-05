"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function ForumThreadPage(){
  const {t}=useLanguage();const params=useParams<{id:string}>();
  const [thread,setThread]=useState<any>(null);const [posts,setPosts]=useState<any[]>([]);const [profiles,setProfiles]=useState<Record<string,any>>({});
  const [userId,setUserId]=useState("");const [body,setBody]=useState("");const [likes,setLikes]=useState<any[]>([]);

  async function load(){
    const [{data:th},{data:ps},{data:{user}},{data:lk}]=await Promise.all([
      supabase.from("forum_threads").select("*").eq("id",params.id).maybeSingle(),
      supabase.from("forum_posts").select("*").eq("thread_id",params.id).order("created_at"),
      supabase.auth.getUser(),
      supabase.from("forum_thread_likes").select("user_id").eq("thread_id",params.id)
    ]);
    setThread(th);setPosts(ps||[]);setUserId(user?.id||"");setLikes(lk||[]);
    const ids=[th?.author_id,...(ps||[]).map((p:any)=>p.author_id)].filter(Boolean);
    if(ids.length){
      const {data:p}=await supabase.from("public_profiles").select("user_id,full_name,username,avatar_url,role,reputation_score,seller_verified").in("user_id",[...new Set(ids)]);
      const m:Record<string,any>={};(p||[]).forEach((x:any)=>m[x.user_id]=x);setProfiles(m);
    }
  }
  useEffect(()=>{load()},[params.id]);

  async function reply(e:FormEvent){
    e.preventDefault();if(!userId){window.location.href="/connexion";return}
    const {error}=await supabase.from("forum_posts").insert({thread_id:params.id,author_id:userId,body});
    if(!error){setBody("");await load()}
  }

  async function toggleLike(){
    if(!userId){window.location.href="/connexion";return}
    const liked=likes.some(x=>x.user_id===userId);
    if(liked)await supabase.from("forum_thread_likes").delete().eq("thread_id",params.id).eq("user_id",userId);
    else await supabase.from("forum_thread_likes").insert({thread_id:params.id,user_id:userId});
    await load();
  }

  function authorBlock(a:any,date:string){
    const inner=<><div className="forum-author">{a?.avatar_url?<img src={a.avatar_url} alt=""/>:<span>{(a?.full_name||"V").slice(0,2)}</span>}<div><strong>{a?.full_name||a?.username||"Vydys user"} {a?.seller_verified?"✓":""}</strong><small>{a?.role||"member"} · {a?.reputation_score||0} XP · {new Date(date).toLocaleString()}</small></div></div></>;
    return a?.username?<Link className="forum-author-link" href={"/u/"+a.username}>{inner}</Link>:inner;
  }

  if(!thread)return <section className="section page-top"><div className="container">...</div></section>;
  const author=profiles[thread.author_id];
  const liked=likes.some(x=>x.user_id===userId);

  return <section className="section page-top forum-thread-page"><div className="container">
    <Link className="text-link" href="/forum">← {t({fr:"Forum",ar:"المنتدى",en:"Forum"})}</Link>
    <article className="forum-main-post">
      {authorBlock(author,thread.created_at)}
      <h1>{thread.title}</h1><p>{thread.body}</p>
      <button className={liked?"forum-like active":"forum-like"} onClick={toggleLike}>♥ {likes.length} · {liked?t({fr:"Aimé",ar:"أعجبني",en:"Liked"}):t({fr:"J’aime",ar:"إعجاب",en:"Like"})}</button>
    </article>
    <div className="forum-replies">{posts.map(p=>{const a=profiles[p.author_id];return <article key={p.id}>{authorBlock(a,p.created_at)}<p>{p.body}</p></article>})}</div>
    {thread.status!=="locked"&&<form className="panel forum-reply-box" onSubmit={reply}><textarea required value={body} onChange={e=>setBody(e.target.value)} placeholder={t({fr:"Votre réponse…",ar:"ردك…",en:"Your reply…"})}/><button className="btn">{t({fr:"Répondre",ar:"رد",en:"Reply"})}</button></form>}
  </div></section>
}
