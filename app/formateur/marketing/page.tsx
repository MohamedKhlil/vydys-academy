"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function InstructorMarketingPage(){
  const {t}=useLanguage();
  const [courses,setCourses]=useState<any[]>([]);
  const [selectedCourse,setSelectedCourse]=useState("");
  const [coupons,setCoupons]=useState<any[]>([]);
  const [announcements,setAnnouncements]=useState<any[]>([]);
  const [code,setCode]=useState("");
  const [discount,setDiscount]=useState("10");
  const [maxUses,setMaxUses]=useState("");
  const [endsAt,setEndsAt]=useState("");
  const [annTitle,setAnnTitle]=useState("");
  const [annBody,setAnnBody]=useState("");
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:c}=await supabase.from("courses").select("id,title_fr,status").eq("instructor_id",user.id).order("created_at",{ascending:false});
    setCourses(c||[]);
    const courseId=selectedCourse||(c?.[0]?.id||"");
    if(courseId&&!selectedCourse)setSelectedCourse(courseId);
    if(courseId){
      const [{data:cp},{data:a}]=await Promise.all([
        supabase.from("course_coupons").select("*").eq("course_id",courseId).order("created_at",{ascending:false}),
        supabase.from("course_announcements").select("*").eq("course_id",courseId).order("created_at",{ascending:false})
      ]);
      setCoupons(cp||[]);setAnnouncements(a||[]);
    }
  }
  useEffect(()=>{load()},[]);
  useEffect(()=>{if(selectedCourse)load()},[selectedCourse]);

  async function addCoupon(e:FormEvent){
    e.preventDefault();setMessage("");
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {error}=await supabase.from("course_coupons").insert({
      course_id:selectedCourse,instructor_id:user.id,code:code.trim().toUpperCase(),
      discount_percent:Number(discount),max_uses:maxUses?Number(maxUses):null,
      ends_at:endsAt?new Date(endsAt).toISOString():null,is_active:true
    });
    if(error){setMessage(error.message);return}
    setCode("");setDiscount("10");setMaxUses("");setEndsAt("");setMessage(t({fr:"Coupon créé.",ar:"تم إنشاء القسيمة.",en:"Coupon created."}));await load();
  }

  async function toggleCoupon(c:any){await supabase.from("course_coupons").update({is_active:!c.is_active}).eq("id",c.id);await load()}

  async function announce(e:FormEvent){
    e.preventDefault();setMessage("");
    const {error}=await supabase.rpc("publish_course_announcement",{p_course_id:selectedCourse,p_title:annTitle,p_body:annBody});
    if(error){setMessage(error.message);return}
    setAnnTitle("");setAnnBody("");setMessage(t({fr:"Annonce publiée et notification envoyée aux étudiants.",ar:"تم نشر الإعلان وإرسال إشعار للطلاب.",en:"Announcement published and students notified."}));await load();
  }

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Croissance",ar:"النمو",en:"Growth"})}</span><h1>{t({fr:"Marketing de mes formations",ar:"تسويق دوراتي",en:"Course marketing"})}</h1><p>{t({fr:"Créez des coupons et communiquez avec tous les étudiants d'une formation.",ar:"أنشئ قسائم وتواصل مع جميع طلاب الدورة.",en:"Create coupons and communicate with all students in a course."})}</p></div></div>
    <label className="course-selector"><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><select value={selectedCourse} onChange={e=>setSelectedCourse(e.target.value)}>{courses.map(c=><option key={c.id} value={c.id}>{c.title_fr} · {c.status}</option>)}</select></label>
    {message&&<p className="manual-note">{message}</p>}
    <div className="dash-grid">
      <article className="panel"><h2>{t({fr:"Coupons & promotions",ar:"القسائم والعروض",en:"Coupons & promotions"})}</h2>
        <form className="builder-form" onSubmit={addCoupon}><input value={code} onChange={e=>setCode(e.target.value)} placeholder="PROMO20" required/><input type="number" min="1" max="100" step="0.1" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="%"/><input type="number" min="1" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder={t({fr:"Nombre max d'utilisations",ar:"أقصى عدد للاستخدام",en:"Max uses"})}/><input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)}/><button className="btn">{t({fr:"Créer le coupon",ar:"إنشاء القسيمة",en:"Create coupon"})}</button></form>
        <div className="coupon-list">{coupons.map(c=><div className="coupon-row" key={c.id}><div><strong>{c.code}</strong><span>-{c.discount_percent}% · {c.used_count}/{c.max_uses||"∞"}</span></div><button className={c.is_active?"approve":"reject"} onClick={()=>toggleCoupon(c)}>{c.is_active?t({fr:"Actif",ar:"نشط",en:"Active"}):t({fr:"Inactif",ar:"غير نشط",en:"Inactive"})}</button></div>)}</div>
      </article>
      <article className="panel"><h2>{t({fr:"Annonce aux étudiants",ar:"إعلان للطلاب",en:"Student announcement"})}</h2>
        <form className="builder-form" onSubmit={announce}><input value={annTitle} onChange={e=>setAnnTitle(e.target.value)} placeholder={t({fr:"Titre",ar:"العنوان",en:"Title"})} required/><textarea rows={6} value={annBody} onChange={e=>setAnnBody(e.target.value)} placeholder={t({fr:"Votre annonce...",ar:"إعلانك...",en:"Your announcement..."})} required/><button className="btn">{t({fr:"Publier et notifier",ar:"نشر وإشعار",en:"Publish & notify"})}</button></form>
        <div className="announcement-list">{announcements.map(a=><div className="announcement-row" key={a.id}><strong>{a.title}</strong><p>{a.body}</p><small>{new Date(a.created_at).toLocaleString()}</small></div>)}</div>
      </article>
    </div>
  </div></section>
}
