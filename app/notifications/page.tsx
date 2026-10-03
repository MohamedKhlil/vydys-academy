"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function NotificationsPage(){
  const {t}=useLanguage();
  const [rows,setRows]=useState<any[]>([]);
  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data}=await supabase.from("notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
    setRows(data||[]);
  }
  useEffect(()=>{load()},[]);
  async function markAll(){const {data:{user}}=await supabase.auth.getUser();if(!user)return;await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",user.id).is("read_at",null);await load()}
  async function openNotification(n:any){if(!n.read_at)await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",n.id);if(n.link)window.location.href=n.link;else await load()}

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Centre de notifications",ar:"مركز الإشعارات",en:"Notification center"})}</span><h1>{t({fr:"Notifications",ar:"الإشعارات",en:"Notifications"})}</h1></div><button className="btn btn-ghost" onClick={markAll}>{t({fr:"Tout marquer comme lu",ar:"تحديد الكل كمقروء",en:"Mark all read"})}</button></div>
    <div className="notification-list">{rows.map(n=><button className={n.read_at?"notification-item":"notification-item unread"} key={n.id} onClick={()=>openNotification(n)}><span className="notification-dot"></span><div><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString()}</small></div></button>)}</div>
    {rows.length===0&&<article className="panel"><p>{t({fr:"Aucune notification.",ar:"لا توجد إشعارات.",en:"No notifications."})}</p></article>}
  </div></section>
}
