"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useLanguage } from "../../../components/language-provider";

type Request={id:string;recruiter_id:string;talent_id:string;message:string;status:string;created_at:string};
type ChatMessage={id:string;request_id:string;sender_id:string;body:string;created_at:string};

export default function CareerContactsPage(){
 const {t,lang}=useLanguage();
 const [uid,setUid]=useState("");
 const [requests,setRequests]=useState<Request[]>([]);
 const [active,setActive]=useState<string>("");
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [text,setText]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");

 async function fetchRequests(userId:string){
   const {data,error}=await supabase.from("career_contact_requests")
     .select("id,recruiter_id,talent_id,message,status,created_at")
     .order("created_at",{ascending:false}).limit(80);
   if(error)setNotice(error.message);
   setRequests((data||[]) as Request[]);
   setLoading(false);
 }
 async function fetchMessages(requestId:string){
   if(!requestId){setMessages([]);return}
   const {data}=await supabase.from("career_contact_messages")
     .select("id,request_id,sender_id,body,created_at")
     .eq("request_id",requestId).order("created_at",{ascending:true}).limit(150);
   setMessages((data||[]) as ChatMessage[]);
 }
 useEffect(()=>{let mounted=true;(async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!mounted)return;
   if(!user){setLoading(false);return}
   setUid(user.id);await fetchRequests(user.id);
 })();return()=>{mounted=false}},[]);
 useEffect(()=>{if(active)void fetchMessages(active)},[active]);

 async function respond(id:string,status:"accepted"|"declined"|"closed"){
   if(busy)return;setBusy(true);setNotice("");
   const {error}=await supabase.rpc("career_respond_contact",{p_request_id:id,p_decision:status});
   setBusy(false);
   if(error){setNotice(error.message);return}
   await fetchRequests(uid);
   if(status==="closed"){setActive("");setMessages([])}
   else if(status==="accepted")setActive(id);
 }
 async function send(e:FormEvent){
   e.preventDefault();if(!active||!uid||busy)return;
   const body=text.trim();
   if(body.length<2||body.length>2000)return;
   setBusy(true);setNotice("");
   const {error}=await supabase.from("career_contact_messages").insert({request_id:active,sender_id:uid,body});
   setBusy(false);if(error){setNotice(error.message);return}
   setText("");await fetchMessages(active);
 }
 const selected=requests.find(r=>r.id===active);
 return <section className="dashboard-shell career-contacts"><div className="container">
  <div className="dash-header"><div><span className="eyebrow">VYDYS CAREER CONNECT</span>
   <h1>{t({fr:"Mes contacts professionnels",ar:"تواصلي المهني",en:"My career contacts"})}</h1>
   <p>{t({fr:"Acceptez, refusez ou suivez vos demandes. Les conversations ne s'ouvrent qu'après acceptation du candidat.",ar:"وافق على طلبات التواصل أو ارفضها. تبدأ المحادثة بعد موافقة المرشح.",en:"Accept, decline or follow up. Messaging only opens after the candidate accepts."})}</p>
  </div><Link className="btn btn-ghost" href="/talents">Vydys Talents ↗</Link></div>
  {!loading&&!uid&&<div className="panel career-empty"><p>{t({fr:"Connectez-vous pour consulter vos contacts.",ar:"سجل الدخول لعرض جهات الاتصال.",en:"Sign in to see contact requests."})}</p><Link className="btn" href="/connexion?next=%2Fcarriere%2Fcontacts">Connexion</Link></div>}
  {loading&&<p role="status">{t({fr:"Chargement…",ar:"جار التحميل...",en:"Loading…" })}</p>}
  {!!uid&&<div className="career-contact-layout">
   <div className="panel career-contact-list">
    {!requests.length&&<p>{t({fr:"Aucune demande pour le moment.",ar:"لا توجد طلبات.",en:"No contact requests yet."})}</p>}
    {requests.map(r=>{
      const incoming=r.talent_id===uid;
      return <article key={r.id} className={active===r.id?"selected":""}>
        <div className="career-contact-title">
         <strong>{incoming?t({fr:"Demande reçue",ar:"طلب وارد",en:"Incoming request"}):t({fr:"Demande envoyée",ar:"طلب مرسل",en:"Sent request"})}</strong>
         <span>{r.status}</span>
        </div>
        <small>{new Date(r.created_at).toLocaleDateString(lang==="ar"?"ar-MR":lang==="en"?"en-GB":"fr-FR")}</small>
        <p>{r.message}</p>
        <div className="career-contact-actions">
         {incoming&&r.status==="pending"&&<><button disabled={busy} onClick={()=>void respond(r.id,"accepted")} type="button">{t({fr:"Accepter",ar:"قبول",en:"Accept"})}</button>
          <button disabled={busy} onClick={()=>void respond(r.id,"declined")} type="button">{t({fr:"Refuser",ar:"رفض",en:"Decline"})}</button></>}
         {r.status==="accepted"&&<button type="button" onClick={()=>setActive(r.id)}>{t({fr:"Ouvrir la discussion",ar:"فتح المحادثة",en:"Open conversation"})} →</button>}
         {incoming&&r.status==="accepted"&&<button disabled={busy} type="button" onClick={()=>void respond(r.id,"closed")}>{t({fr:"Clore",ar:"إغلاق",en:"Close"})}</button>}
        </div>
       </article>})}
   </div>
   <div className="panel career-chat-panel">
    <h2>{t({fr:"Conversation privée",ar:"محادثة خاصة",en:"Private conversation"})}</h2>
    {!selected||selected.status!=="accepted"?<p>{t({fr:"Sélectionnez une demande acceptée pour échanger en privé.",ar:"اختر طلباً مقبولاً للتواصل.",en:"Select an accepted request to chat privately."})}</p>:
     <><div className="career-chat-history" role="log" aria-live="polite">
       {!messages.length&&<p>{t({fr:"La conversation peut commencer.",ar:"يمكن بدء المحادثة.",en:"You can start chatting."})}</p>}
       {messages.map(m=><div className={m.sender_id===uid?"career-chat-self":"career-chat-other"} key={m.id}>
         <p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small>
       </div>)}
      </div><form onSubmit={e=>void send(e)}>
        <label><span>{t({fr:"Votre message",ar:"رسالتك",en:"Your message"})}</span><textarea required minLength={2} maxLength={2000} rows={4} value={text} onChange={e=>setText(e.target.value)}/></label>
        <button disabled={busy} className="btn" type="submit">{t({fr:"Envoyer",ar:"إرسال",en:"Send"})}</button>
       </form></>}
   </div>
  </div>}
  {notice&&<p role="alert" className="career-form-error">{notice}</p>}
 </div></section>;
}
