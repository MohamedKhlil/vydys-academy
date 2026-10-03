"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type Course={
  id:string;slug:string;title_fr:string;title_ar:string;title_en:string;
  description_fr:string|null;description_ar:string|null;description_en:string|null;
  base_price_mru:number;category:string|null;instructor_id:string|null;cover_url:string|null;
};
type Rating={course_id:string;average_rating:number|string;review_count:number};
type Instructor={user_id:string;public_slug:string;display_name:string;headline:string|null};

export default function FormationsPage(){
  const {lang,t}=useLanguage();
  const [courses,setCourses]=useState<Course[]>([]);
  const [ratings,setRatings]=useState<Record<string,Rating>>({});
  const [instructors,setInstructors]=useState<Record<string,Instructor>>({});
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("all");

  useEffect(()=>{(async()=>{
    const [{data:c},{data:r},{data:i}]=await Promise.all([
      supabase.from("courses").select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,category,instructor_id,cover_url").eq("status","published"),
      supabase.from("course_rating_summary").select("course_id,average_rating,review_count"),
      supabase.from("instructor_profiles").select("user_id,public_slug,display_name,headline").eq("is_public",true)
    ]);
    setCourses((c||[]) as Course[]);
    const rm:Record<string,Rating>={};(r||[]).forEach((x:any)=>rm[x.course_id]=x);setRatings(rm);
    const im:Record<string,Instructor>={};(i||[]).forEach((x:any)=>im[x.user_id]=x);setInstructors(im);
  })()},[]);

  const categories=useMemo(()=>Array.from(new Set(courses.map(c=>c.category).filter(Boolean) as string[])),[courses]);
  const shown=useMemo(()=>courses.filter(c=>{
    const title=lang==="ar"?c.title_ar:lang==="en"?c.title_en:c.title_fr;
    const desc=lang==="ar"?c.description_ar:lang==="en"?c.description_en:c.description_fr;
    const q=search.toLowerCase();
    return (category==="all"||c.category===category)&&(!q||title.toLowerCase().includes(q)||(desc||"").toLowerCase().includes(q));
  }).sort((a,b)=>{
    const ra=Number(ratings[a.id]?.average_rating||0), rb=Number(ratings[b.id]?.average_rating||0);
    if(rb!==ra)return rb-ra;
    return (ratings[b.id]?.review_count||0)-(ratings[a.id]?.review_count||0);
  }),[courses,ratings,search,category,lang]);

  return <section className="section page-top marketplace-page"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Marketplace Vydys",ar:"سوق Vydys",en:"Vydys Marketplace"})}</span><h1>{t({fr:"Trouvez la formation qui vous fera progresser.",ar:"اعثر على الدورة التي ستطور مهاراتك.",en:"Find the course that moves you forward."})}</h1><p>{t({fr:"Comparez les formateurs, les prix et les avis des étudiants.",ar:"قارن بين المدربين والأسعار وآراء الطلاب.",en:"Compare instructors, prices and student ratings."})}</p></div>

    <div className="market-filters">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t({fr:"Rechercher une formation...",ar:"ابحث عن دورة...",en:"Search courses..."})}/>
      <select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">{t({fr:"Toutes les catégories",ar:"كل الفئات",en:"All categories"})}</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
    </div>

    <div className="market-grid">
      {shown.map((c,index)=>{
        const title=lang==="ar"?c.title_ar:lang==="en"?c.title_en:c.title_fr;
        const desc=lang==="ar"?c.description_ar:lang==="en"?c.description_en:c.description_fr;
        const rating=Number(ratings[c.id]?.average_rating||0);
        const reviews=ratings[c.id]?.review_count||0;
        const instructor=c.instructor_id?instructors[c.instructor_id]:null;
        return <article className="market-card" key={c.id}>
          <div className="course-cover">{c.cover_url?<img src={c.cover_url} alt="" />:<span>V</span>}{index<3&&rating>0?<b>{t({fr:"Top formation",ar:"من الأفضل",en:"Top course"})}</b>:null}</div>
          <div className="market-card-body">
            <div className="rating-line"><span className="stars">★★★★★</span><strong>{rating?rating.toFixed(1):"—"}</strong><small>({reviews})</small></div>
            <h2>{title}</h2><p>{desc}</p>
            {instructor?<Link className="trainer-link" href={"/formateur/"+instructor.public_slug}>{instructor.display_name}{instructor.headline?" · "+instructor.headline:""}</Link>:<span className="trainer-link">Vydys Academy</span>}
            <div className="course-card-footer"><strong>{c.base_price_mru.toLocaleString("fr-FR")} MRU</strong><Link className="btn btn-small" href={"/formation/"+c.slug}>{t({fr:"Voir",ar:"عرض",en:"View"})}</Link></div>
          </div>
        </article>
      })}
    </div>
    {shown.length===0&&<article className="panel"><p>{t({fr:"Aucune formation ne correspond à votre recherche.",ar:"لا توجد دورة مطابقة للبحث.",en:"No courses match your search."})}</p></article>}
  </div></section>
}
