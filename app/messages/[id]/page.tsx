"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function MessageDetailPage(){
  const {id}=useParams<{id:string}>();
  const {t}=useLanguage();
  const [conv,setConv]=useState<any>(null);
  const [messages,setMessages]=useState<any[]>([]);
  const [me,setMe]=useState("");
  const [body,setBody]=useState("");
  const [error,setError]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}setMe(user.id);
    const {data:c,error}=await supabase.from("conversations").select("id,course_id,student_id,instructor_id,courses:course_id(title_fr),student:student_id(full_name),instructor:instructor_id(full_name)").eq("id",id).single();
    if(error){setError(error.message);return}setConv(c);
    const {data:m}=await supabase.from("messages").select("*").eq("conversation_id",id).order("created_at");
    setMessages(m||[]);
    await supabase.rpc("mark_conversation_read",{p_conversation_id:id});
  }
  useEffect(()=>{load()},[id]);

  async function send(e:FormEvent){e.preventDefault();if(!body.trim())return;const {error}=await supabase.rpc("send_course_message",{p_conversation_id:id,p_body:body});if(error){setError(error.message);return}setBody("");await load()}

  if(!conv)return <section className="dashboard-shell"><div className="container">{error||"..."}</div></section>;
  const other=me===conv.student_id?(conv.instructor?.full_name||t({fr:"Formateur",ar:"مدرب",en:"Instructor"})):(conv.student?.full_name||t({fr:"Étudiant",ar:"طالب",en:"Student"}));
  return <section className="chat-shell"><div className="container chat-container"><div className="chat-header"><div className="avatar">{other.slice(0,2).toUpperCase()}</div><div><strong>{other}</strong><span>{conv.courses?.title_fr}</span></div></div>
    <div className="chat-messages">{messages.map(m=><div className={m.sender_id===me?"chat-bubble mine":"chat-bubble"} key={m.id}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>)}</div>
    <form className="chat-composer" onSubmit={send}><input value={body} onChange={e=>setBody(e.target.value)} placeholder={t({fr:"Écrire un message...",ar:"اكتب رسالة...",en:"Write a message..."})}/><button className="btn">{t({fr:"Envoyer",ar:"إرسال",en:"Send"})}</button></form>
    {error&&<p className="manual-note">{error}</p>}
  </div></section>
}
