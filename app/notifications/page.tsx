"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type NotificationRow={
  id:string;
  user_id:string;
  notification_type:string;
  title:string;
  body:string|null;
  link:string|null;
  read_at:string|null;
  created_at:string;
};

const PAGE_SIZE=30;

export default function NotificationsPage(){
  const {t,lang}=useLanguage();
  const [rows,setRows]=useState<NotificationRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [showUnread,setShowUnread]=useState(false);
  const [typeFilter,setTypeFilter]=useState("all");
  const [limit,setLimit]=useState(PAGE_SIZE);
  const [userId,setUserId]=useState<string|null>(null);

  async function load(id?:string){
    const resolvedId=id||userId;
    if(!resolvedId)return;

    let query=supabase
      .from("notifications")
      .select("id,user_id,notification_type,title,body,link,read_at,created_at")
      .eq("user_id",resolvedId)
      .order("created_at",{ascending:false})
      .limit(limit);

    if(showUnread)query=query.is("read_at",null);
    if(typeFilter!=="all")query=query.eq("notification_type",typeFilter);

    const {data}=await query;
    setRows((data||[]) as NotificationRow[]);
    setLoading(false);
  }

  useEffect(()=>{
    let channel:ReturnType<typeof supabase.channel>|null=null;
    let active=true;

    (async()=>{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){window.location.href="/connexion";return}
      if(!active)return;
      setUserId(user.id);

      await load(user.id);

      channel=supabase
        .channel("my-notifications")
        .on(
          "postgres_changes",
          {event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${user.id}`},
          ()=>{void load(user.id)}
        )
        .subscribe();
    })();

    return()=>{
      active=false;
      if(channel)void supabase.removeChannel(channel);
    };
  // load is intentionally refreshed when filters/page size change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showUnread,typeFilter,limit]);

  const unreadCount=useMemo(()=>rows.filter(n=>!n.read_at).length,[rows]);
  const types=useMemo(
    ()=>Array.from(new Set(rows.map(n=>n.notification_type).filter(Boolean))).sort(),
    [rows]
  );

  async function markAll(){
    if(!userId)return;
    await supabase
      .from("notifications")
      .update({read_at:new Date().toISOString()})
      .eq("user_id",userId)
      .is("read_at",null);
    await load();
  }

  async function openNotification(n:NotificationRow){
    if(!n.read_at){
      await supabase
        .from("notifications")
        .update({read_at:new Date().toISOString()})
        .eq("id",n.id)
        .eq("user_id",n.user_id);
    }

    if(n.link && n.link.startsWith("/") && !n.link.startsWith("//")){
      window.location.href=n.link;
      return;
    }
    await load();
  }

  function formatDate(value:string){
    return new Intl.DateTimeFormat(
      lang==="ar"?"ar":lang==="fr"?"fr-FR":"en-US",
      {dateStyle:"medium",timeStyle:"short"}
    ).format(new Date(value));
  }

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header">
      <div>
        <span className="eyebrow">{t({fr:"Centre de notifications",ar:"مركز الإشعارات",en:"Notification center"})}</span>
        <h1>{t({fr:"Notifications",ar:"الإشعارات",en:"Notifications"})}</h1>
        <p>{t({
          fr:`${unreadCount} notification(s) non lue(s) affichée(s).`,
          ar:`${unreadCount} إشعار غير مقروء معروض.`,
          en:`${unreadCount} unread notification(s) shown.`
        })}</p>
      </div>
      <button className="btn btn-ghost" onClick={markAll} disabled={unreadCount===0}>
        {t({fr:"Tout marquer comme lu",ar:"تحديد الكل كمقروء",en:"Mark all read"})}
      </button>
    </div>

    <div className="filter-bar" style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:18}}>
      <button
        className={`btn ${!showUnread?"":"btn-ghost"}`}
        onClick={()=>{setShowUnread(false);setLimit(PAGE_SIZE)}}
        aria-pressed={!showUnread}
      >
        {t({fr:"Toutes",ar:"الكل",en:"All"})}
      </button>
      <button
        className={`btn ${showUnread?"":"btn-ghost"}`}
        onClick={()=>{setShowUnread(true);setLimit(PAGE_SIZE)}}
        aria-pressed={showUnread}
      >
        {t({fr:"Non lues",ar:"غير مقروءة",en:"Unread"})}
      </button>
      <label>
        <span className="sr-only">{t({fr:"Type",ar:"النوع",en:"Type"})}</span>
        <select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setLimit(PAGE_SIZE)}}>
          <option value="all">{t({fr:"Tous les types",ar:"كل الأنواع",en:"All types"})}</option>
          {types.map(type=><option key={type} value={type}>{type}</option>)}
        </select>
      </label>
    </div>

    {loading&&<article className="panel"><p>{t({fr:"Chargement…",ar:"جارٍ التحميل…",en:"Loading…"})}</p></article>}

    {!loading&&<div className="notification-list">
      {rows.map(n=><button
        className={n.read_at?"notification-item":"notification-item unread"}
        key={n.id}
        onClick={()=>openNotification(n)}
        aria-label={n.title}
      >
        <span className="notification-dot"></span>
        <div>
          <strong>{n.title}</strong>
          {n.body&&<p>{n.body}</p>}
          <small>{formatDate(n.created_at)} · {n.notification_type}</small>
        </div>
      </button>)}
    </div>}

    {!loading&&rows.length===0&&<article className="panel"><p>
      {showUnread
        ?t({fr:"Aucune notification non lue.",ar:"لا توجد إشعارات غير مقروءة.",en:"No unread notifications."})
        :t({fr:"Aucune notification.",ar:"لا توجد إشعارات.",en:"No notifications."})}
    </p></article>}

    {!loading&&rows.length>=limit&&<div style={{display:"flex",justifyContent:"center",marginTop:18}}>
      <button className="btn btn-ghost" onClick={()=>setLimit(v=>v+PAGE_SIZE)}>
        {t({fr:"Afficher plus",ar:"عرض المزيد",en:"Load more"})}
      </button>
    </div>}
  </div></section>
}
