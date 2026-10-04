"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function ClassroomPage(){
  const {lang,t}=useLanguage();
  const [rooms,setRooms]=useState<any[]>([]);
  const [enrollments,setEnrollments]=useState<any[]>([]);
  const [sessions,setSessions]=useState<any[]>([]);
  const [instructors,setInstructors]=useState<Record<string,any>>({});
  const [search,setSearch]=useState("");
  const [language,setLanguage]=useState("all");
  const [userId,setUserId]=useState<string|null>(null);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();setUserId(user?.id||null);
    const {data:r}=await supabase.from("classrooms").select("*").order("start_date",{ascending:true});
    const list=r||[];setRooms(list);

    if(user){
      const {data:e}=await supabase.from("classroom_enrollments").select("*").eq("user_id",user.id).eq("status","active");
      setEnrollments(e||[]);
    }else setEnrollments([]);

    const ids=list.map((x:any)=>x.id);
    if(ids.length){
      const [{data:s},{data:i}]=await Promise.all([
        supabase.from("classroom_sessions").select("id,classroom_id,position,title,starts_at,ends_at,status").in("classroom_id",ids).order("starts_at"),
        supabase.from("instructor_profiles").select("user_id,public_slug,display_name,headline").in("user_id",[...new Set(list.map((x:any)=>x.instructor_id))]).eq("is_public",true)
      ]);
      setSessions(s||[]);
      const map:Record<string,any>={};(i||[]).forEach((x:any)=>map[x.user_id]=x);setInstructors(map);
    }
  }
  useEffect(()=>{load()},[]);

  const enrolledIds=useMemo(()=>new Set(enrollments.map(e=>e.classroom_id)),[enrollments]);
  const now=Date.now();
  const nextFor=(roomId:string)=>sessions.find(s=>s.classroom_id===roomId&&new Date(s.ends_at).getTime()>now);

  const shown=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return rooms.filter(r=>{
      if(r.status!=="published"&&!enrolledIds.has(r.id))return false;
      const title=lang==="ar"?r.title_ar:lang==="en"?r.title_en:r.title_fr;
      const desc=lang==="ar"?r.description_ar:lang==="en"?r.description_en:r.description_fr;
      return (language==="all"||r.language===language)&&(!q||String(title||"").toLowerCase().includes(q)||String(desc||"").toLowerCase().includes(q));
    });
  },[rooms,enrolledIds,search,language,lang]);

  const myRooms=shown.filter(r=>enrolledIds.has(r.id));
  const discover=shown.filter(r=>r.visibility==="public"&&!enrolledIds.has(r.id));
  const fmtMoney=(amount:number,currency:string)=>new Intl.NumberFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{style:"currency",currency,maximumFractionDigits:2}).format(amount);
  const fmtDate=(iso:string,zone:string)=>new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:zone}).format(new Date(iso));

  function card(room:any,my=false){
    const title=lang==="ar"?room.title_ar:lang==="en"?room.title_en:room.title_fr;
    const desc=lang==="ar"?room.description_ar:lang==="en"?room.description_en:room.description_fr;
    const next=nextFor(room.id);const instructor=instructors[room.instructor_id];
    return <article className={"classroom-market-card "+(my?"mine":"")} key={room.id}>
      <div className="classroom-market-cover"><span className="live-orb">LIVE</span><div><small>{room.language.toUpperCase()} · {room.level}</small><strong>{room.session_count} {t({fr:"sessions live",ar:"حصص مباشرة",en:"live sessions"})}</strong></div>{my&&<b>{t({fr:"INSCRIT",ar:"مسجل",en:"ENROLLED"})}</b>}</div>
      <div className="classroom-market-body"><div className="classroom-market-meta"><span>{new Date(room.start_date).toLocaleDateString(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR")}</span><span>{room.capacity} {t({fr:"places",ar:"مقعد",en:"seats"})}</span></div><h2>{title}</h2><p>{desc}</p>{instructor&&<Link className="trainer-link" href={"/formateur/"+instructor.public_slug}>{instructor.display_name}{instructor.headline?" · "+instructor.headline:""}</Link>}
        {next&&<div className="next-live-chip"><span>●</span><div><small>{t({fr:"Prochaine séance",ar:"الحصة القادمة",en:"Next session"})}</small><strong>{fmtDate(next.starts_at,room.timezone)}</strong></div></div>}
        <div className="classroom-market-footer"><strong>{fmtMoney(Number(room.base_price_amount),room.base_currency)}</strong><Link className="btn btn-small" href={"/classroom/"+room.slug}>{my?t({fr:"Ouvrir",ar:"فتح",en:"Open"}):t({fr:"Voir & s’inscrire",ar:"عرض والتسجيل",en:"View & enroll"})}</Link></div>
      </div>
    </article>
  }

  return <section className="section page-top classroom-marketplace"><div className="container">
    <div className="page-hero classroom-hero"><span className="eyebrow">Vydys Classroom</span><h1>{t({fr:"Le live learning, relié à tout votre parcours.",ar:"تعلم مباشر مرتبط بكل مسارك.",en:"Live learning connected to your entire journey."})}</h1><p>{t({fr:"Cours vidéo, calendrier, présence, chat, ressources, devoirs, replays et compétences — sans quitter Vydys.",ar:"فيديو وجدول وحضور ودردشة وموارد وواجبات وإعادات ومهارات دون مغادرة Vydys.",en:"Video, schedule, attendance, chat, resources, assignments, replays and skills — without leaving Vydys."})}</p><div className="classroom-feature-strip"><span>◉ Video Live</span><span>▣ Screen Share</span><span>✋ Presence</span><span>✦ Vydys AI Ready</span></div></div>

    <div className="classroom-market-filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t({fr:"Rechercher une Classroom...",ar:"ابحث عن فصل...",en:"Search a Classroom..."})}/><select value={language} onChange={e=>setLanguage(e.target.value)}><option value="all">{t({fr:"Toutes les langues",ar:"كل اللغات",en:"All languages"})}</option><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></div>

    {userId&&myRooms.length>0&&<section className="classroom-market-section"><div className="section-head"><div><span className="eyebrow">{t({fr:"Mon apprentissage live",ar:"تعلمي المباشر",en:"My live learning"})}</span><h2>{t({fr:"Mes Classrooms",ar:"فصولي",en:"My Classrooms"})}</h2></div></div><div className="classroom-market-grid">{myRooms.map(r=>card(r,true))}</div></section>}

    <section className="classroom-market-section"><div className="section-head"><div><span className="eyebrow">{t({fr:"Cohortes ouvertes",ar:"دفعات مفتوحة",en:"Open cohorts"})}</span><h2>{t({fr:"Découvrir les Classrooms",ar:"اكتشف الفصول",en:"Discover Classrooms"})}</h2></div></div>{discover.length?<div className="classroom-market-grid">{discover.map(r=>card(r,false))}</div>:<article className="panel classroom-empty-market"><span>LIVE</span><h3>{t({fr:"Aucune Classroom publique disponible pour le moment.",ar:"لا يوجد فصل عام متاح حالياً.",en:"No public Classroom is available right now."})}</h3></article>}</section>
  </div></section>
}
