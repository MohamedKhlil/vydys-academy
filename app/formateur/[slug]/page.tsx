"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function PublicTrainerPage(){
  const {slug}=useParams<{slug:string}>();
  const {lang,t}=useLanguage();
  const [trainer,setTrainer]=useState<any>(null);
  const [courses,setCourses]=useState<any[]>([]);
  const [ratings,setRatings]=useState<Record<string,any>>({});

  useEffect(()=>{(async()=>{
    const {data:i}=await supabase.from("instructor_profiles").select("*").eq("public_slug",slug).eq("is_public",true).single();
    if(!i){setTrainer(false);return}setTrainer(i);
    const [{data:c},{data:r}]=await Promise.all([
      supabase.from("courses").select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,category").eq("instructor_id",i.user_id).eq("status","published"),
      supabase.from("course_rating_summary").select("*")
    ]);
    setCourses(c||[]);const map:Record<string,any>={};(r||[]).forEach((x:any)=>map[x.course_id]=x);setRatings(map);
  })()},[slug]);

  if(trainer===null)return <section className="section page-top"><div className="container">...</div></section>;
  if(trainer===false)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Formateur introuvable",ar:"المدرب غير موجود",en:"Instructor not found"})}</h1></article></div></section>;

  return <section className="section page-top"><div className="container">
    <div className="trainer-public-hero"><div className="avatar trainer-avatar">{trainer.display_name?.slice(0,2).toUpperCase()}</div><div><span className="eyebrow">{t({fr:"Formateur Vydys",ar:"مدرب Vydys",en:"Vydys Instructor"})}</span><h1>{trainer.display_name}</h1><h3>{trainer.headline}</h3><p>{trainer.bio}</p><div className="pill-row"><span>{trainer.expertise}</span><span>{courses.length} {t({fr:"formations",ar:"دورات",en:"courses"})}</span></div></div></div>
    <h2 className="subhead">{t({fr:"Formations publiées",ar:"الدورات المنشورة",en:"Published courses"})}</h2>
    <div className="market-grid">{courses.map(c=>{const title=lang==="ar"?c.title_ar:lang==="en"?c.title_en:c.title_fr;const desc=lang==="ar"?c.description_ar:lang==="en"?c.description_en:c.description_fr;const rs=ratings[c.id];return <article className="market-card" key={c.id}><div className="course-cover"><span>V</span></div><div className="market-card-body"><div className="rating-line"><span className="stars">★★★★★</span><strong>{Number(rs?.average_rating||0).toFixed(1)}</strong><small>({rs?.review_count||0})</small></div><h2>{title}</h2><p>{desc}</p><div className="course-card-footer"><strong>{c.base_price_mru.toLocaleString("fr-FR")} MRU</strong><Link className="btn btn-small" href={"/formation/"+c.slug}>{t({fr:"Voir",ar:"عرض",en:"View"})}</Link></div></div></article>})}</div>
  </div></section>
}
