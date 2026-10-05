"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function ForumPage(){
  const {lang,t}=useLanguage();const [categories,setCategories]=useState<any[]>([]);const [threads,setThreads]=useState<any[]>([]);
  const [userId,setUserId]=useState("");const [categoryId,setCategoryId]=useState("");const [title,setTitle]=useState("");const [body,setBody]=useState("");const [notice,setNotice]=useState("");
  const label=(x:any,key:string)=>lang==="ar"?(x[key+"_ar"]||x[key+"_fr"]):lang==="en"?(x[key+"_en"]||x[key+"_fr"]):x[key+"_fr"];
  async function load(){
    const [{data:c},{data:th},{data:{user}}]=await Promise.all([
      supabase.from("forum_categories").select("*").order("position"),
      supabase.from("forum_threads").select("id,title,body,category_id,author_id,is_pinned,status,created_at").order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(50),
      supabase.auth.getUser()
    ]);
    setCategories(c||[]);setThreads(th||[]);setUserId(user?.id||"");if(!categoryId&&c?.[0])setCategoryId(c[0].id);
  }
  useEffect(()=>{load()},[]);
  async function create(e:FormEvent){
    e.preventDefault();if(!userId){window.location.href="/connexion";return}
    const {error}=await supabase.from("forum_threads").insert({category_id:categoryId,author_id:userId,title,body});
    if(error){setNotice(error.message);return}setTitle("");setBody("");setNotice("");await load();
  }
  return <section className="section page-top forum-page"><div className="container">
    <div className="page-hero"><span className="eyebrow">Vydys Community</span><h1>{t({fr:"Le forum de la communauté Vydys.",ar:"منتدى مجتمع Vydys.",en:"The Vydys community forum."})}</h1><p>{t({fr:"Posez des questions, partagez vos projets, échangez entre étudiants, formateurs et professionnels.",ar:"اطرح الأسئلة وشارك المشاريع وتواصل مع الطلاب والمدربين والمهنيين.",en:"Ask questions, share projects and talk with learners, instructors and professionals."})}</p></div>
    <div className="forum-layout">
      <aside className="forum-categories"><strong>{t({fr:"Catégories",ar:"الفئات",en:"Categories"})}</strong>{categories.map(c=><div key={c.id}><b>{label(c,"name")}</b><small>{label(c,"description")}</small></div>)}</aside>
      <main>
        {userId&&<form className="panel forum-compose" onSubmit={create}><h2>{t({fr:"Créer une discussion",ar:"إنشاء نقاش",en:"Start a discussion"})}</h2><select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>{categories.map(c=><option value={c.id} key={c.id}>{label(c,"name")}</option>)}</select><input required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder={t({fr:"Titre de la discussion",ar:"عنوان النقاش",en:"Discussion title"})}/><textarea required value={body} onChange={e=>setBody(e.target.value)} placeholder={t({fr:"Écrivez votre message…",ar:"اكتب رسالتك…",en:"Write your message…"})}/>{notice&&<p className="manual-note">{notice}</p>}<button className="btn">{t({fr:"Publier",ar:"نشر",en:"Publish"})}</button></form>}
        <div className="forum-thread-list">{threads.map(th=>{const c=categories.find(x=>x.id===th.category_id);return <Link className="forum-thread-card" href={"/forum/"+th.id} key={th.id}><div><span>{th.is_pinned?"PIN":label(c||{},"name")}</span><small>{new Date(th.created_at).toLocaleDateString()}</small></div><h2>{th.title}</h2><p>{th.body.slice(0,220)}{th.body.length>220?"…":""}</p><b>{t({fr:"Ouvrir la discussion",ar:"فتح النقاش",en:"Open discussion"})} →</b></Link>})}</div>
      </main>
    </div>
  </div></section>
}
