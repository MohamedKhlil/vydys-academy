"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function FavorisPage(){
  const {lang,t}=useLanguage();
  const [rows,setRows]=useState<any[]>([]);
  const [ratings,setRatings]=useState<Record<string,any>>({});
  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const [{data:f},{data:r}]=await Promise.all([
      supabase.from("course_favorites").select("course_id,courses:course_id(id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,category)").eq("user_id",user.id).order("created_at",{ascending:false}),
      supabase.from("course_rating_summary").select("*")
    ]);
    setRows(f||[]);const map:Record<string,any>={};(r||[]).forEach((x:any)=>map[x.course_id]=x);setRatings(map);
  }
  useEffect(()=>{load()},[]);
  function local(c:any,key:string){return lang==="ar"?(c[key+"_ar"]||c[key+"_fr"]):lang==="en"?(c[key+"_en"]||c[key+"_fr"]):c[key+"_fr"]}
  async function remove(courseId:string){const {data:{user}}=await supabase.auth.getUser();if(!user)return;await supabase.from("course_favorites").delete().eq("user_id",user.id).eq("course_id",courseId);await load()}

  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">Wishlist</span><h1>{t({fr:"Mes formations favorites",ar:"دوراتي المفضلة",en:"My favorite courses"})}</h1></div>
    <div className="market-grid">{rows.map((x:any)=>{const c=x.courses;const rs=ratings[c.id];return <article className="market-card" key={c.id}><div className="course-cover"><span>♥</span></div><div className="market-card-body"><div className="rating-line"><span className="stars">★★★★★</span><strong>{Number(rs?.average_rating||0).toFixed(1)}</strong><small>({rs?.review_count||0})</small></div><h2>{local(c,"title")}</h2><p>{local(c,"description")}</p><div className="course-card-footer"><strong>{c.base_price_mru.toLocaleString("fr-FR")} MRU</strong><div className="card-actions"><button className="icon-btn danger" onClick={()=>remove(c.id)}>×</button><Link className="btn btn-small" href={"/formation/"+c.slug}>{t({fr:"Voir",ar:"عرض",en:"View"})}</Link></div></div></div></article>})}</div>
    {rows.length===0&&<article className="panel empty-state"><h2>{t({fr:"Aucun favori",ar:"لا توجد مفضلات",en:"No favorites yet"})}</h2><Link className="btn" href="/formations">{t({fr:"Explorer les formations",ar:"استكشف الدورات",en:"Explore courses"})}</Link></article>}
  </div></section>
}
