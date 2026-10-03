"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function MessagesPage(){
  const {t}=useLanguage();
  const [rows,setRows]=useState<any[]>([]);
  const [me,setMe]=useState<string>("");
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}setMe(user.id);
    const {data:c}=await supabase.from("conversations").select("id,course_id,student_id,instructor_id,created_at,courses:course_id(title_fr,slug),student:student_id(full_name),instructor:instructor_id(full_name)").order("created_at",{ascending:false});
    const enriched=await Promise.all((c||[]).map(async (x:any)=>{
      const {data:m}=await supabase.from("messages").select("body,created_at,sender_id,read_at").eq("conversation_id",x.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
      return {...x,last:m};
    }));
    setRows(enriched);
  })()},[]);

  return <section className="dashboard-shell"><div className="container"><div className="dash-header"><div><span className="eyebrow">{t({fr:"Communication",ar:"التواصل",en:"Communication"})}</span><h1>{t({fr:"Messages",ar:"الرسائل",en:"Messages"})}</h1></div></div>
    <div className="conversation-list">{rows.map((c:any)=>{const other=me===c.student_id?(c.instructor?.full_name||t({fr:"Formateur",ar:"مدرب",en:"Instructor"})):(c.student?.full_name||t({fr:"Étudiant",ar:"طالب",en:"Student"}));const unread=c.last&&c.last.sender_id!==me&&!c.last.read_at;return <Link className={unread?"conversation-card unread":"conversation-card"} href={"/messages/"+c.id} key={c.id}><div className="avatar">{other.slice(0,2).toUpperCase()}</div><div><strong>{other}</strong><span>{c.courses?.title_fr||""}</span><p>{c.last?.body||t({fr:"Nouvelle conversation",ar:"محادثة جديدة",en:"New conversation"})}</p></div><small>{c.last?.created_at?new Date(c.last.created_at).toLocaleDateString():""}</small></Link>})}</div>
    {rows.length===0&&<article className="panel"><p>{t({fr:"Aucune conversation.",ar:"لا توجد محادثات.",en:"No conversations."})}</p></article>}
  </div></section>
}
