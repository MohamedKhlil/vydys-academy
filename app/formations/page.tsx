"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type Course={
  id:string;slug:string;title_fr:string;title_ar:string;title_en:string;
  description_fr:string|null;description_ar:string|null;description_en:string|null;
  base_price_mru:number;base_price_amount:number;base_currency:string;category:string|null;instructor_id:string|null;cover_url:string|null;
};
type Rating={course_id:string;average_rating:number|string;review_count:number};
type Instructor={user_id:string;public_slug:string;display_name:string;headline:string|null};

export default function FormationsPage(){
  const {lang,t}=useLanguage();
  const [courses,setCourses]=useState<Course[]>([]);
  const [ratings,setRatings]=useState<Record<string,Rating>>({});
  const [instructors,setInstructors]=useState<Record<string,Instructor>>({});
  const [favorites,setFavorites]=useState<Set<string>>(new Set());
  const [userId,setUserId]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("all");
  const [currency,setCurrency]=useState("all");
  const [minRating,setMinRating]=useState("0");
  const [sort,setSort]=useState("top");

  async function load(){
    const [{data:c},{data:r},{data:i},{data:{user}}]=await Promise.all([
      supabase.from("courses").select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,base_price_amount,base_currency,category,instructor_id,cover_url").eq("status","published"),
      supabase.from("course_rating_summary").select("course_id,average_rating,review_count"),
      supabase.from("instructor_profiles").select("user_id,public_slug,display_name,headline").eq("is_public",true),
      supabase.auth.getUser()
    ]);
    setCourses((c||[]) as Course[]);
    const rm:Record<string,Rating>={};(r||[]).forEach((x:any)=>rm[x.course_id]=x);setRatings(rm);
    const im:Record<string,Instructor>={};(i||[]).forEach((x:any)=>im[x.user_id]=x);setInstructors(im);
    setUserId(user?.id||null);
    if(user){
      const [{data:f},{data:p}]=await Promise.all([
        supabase.from("course_favorites").select("course_id").eq("user_id",user.id),
        supabase.from("profiles").select("preferred_currency").eq("id",user.id).maybeSingle()
      ]);
      setFavorites(new Set((f||[]).map((x:any)=>x.course_id)));
      const pref=String(p?.preferred_currency||"").toUpperCase();
      if(pref&&(c||[]).some((x:any)=>String(x.base_currency||"MRU").toUpperCase()===pref))setCurrency(pref);
    }
  }

  useEffect(()=>{load()},[]);

  const categories=useMemo(()=>Array.from(new Set(courses.map(c=>c.category).filter(Boolean) as string[])),[courses]);
  const currencies=useMemo(()=>Array.from(new Set(courses.map(c=>String(c.base_currency||"MRU").toUpperCase()))).sort(),[courses]);
  const formatMoney=(amount:number,cur:string)=>new Intl.NumberFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{style:"currency",currency:cur,maximumFractionDigits:2}).format(amount);

  const shown=useMemo(()=>{
    const q=search.trim().toLowerCase();const minR=Number(minRating||0);
    const arr=courses.filter(c=>{
      const title=lang==="ar"?c.title_ar:lang==="en"?c.title_en:c.title_fr;
      const desc=lang==="ar"?c.description_ar:lang==="en"?c.description_en:c.description_fr;
      const instructor=c.instructor_id?instructors[c.instructor_id]:null;
      const rating=Number(ratings[c.id]?.average_rating||0);
      return (category==="all"||c.category===category)
        && (currency==="all"||String(c.base_currency||"MRU").toUpperCase()===currency)
        && (!q||title.toLowerCase().includes(q)||(desc||"").toLowerCase().includes(q)||(instructor?.display_name||"").toLowerCase().includes(q))
        && rating>=minR;
    });
    return arr.sort((a,b)=>{
      if((sort==="price_low"||sort==="price_high")&&currency!=="all"){
        const av=Number(a.base_price_amount??a.base_price_mru),bv=Number(b.base_price_amount??b.base_price_mru);
        return sort==="price_low"?av-bv:bv-av;
      }
      if(sort==="reviews")return (ratings[b.id]?.review_count||0)-(ratings[a.id]?.review_count||0);
      const ra=Number(ratings[a.id]?.average_rating||0),rb=Number(ratings[b.id]?.average_rating||0);
      if(rb!==ra)return rb-ra;
      return (ratings[b.id]?.review_count||0)-(ratings[a.id]?.review_count||0);
    });
  },[courses,ratings,instructors,search,category,currency,minRating,sort,lang]);

  async function toggleFavorite(courseId:string){
    if(!userId){window.location.href="/connexion";return}
    if(favorites.has(courseId)){await supabase.from("course_favorites").delete().eq("user_id",userId).eq("course_id",courseId);setFavorites(prev=>{const n=new Set(prev);n.delete(courseId);return n})}
    else{await supabase.from("course_favorites").insert({user_id:userId,course_id:courseId});setFavorites(prev=>new Set(prev).add(courseId))}
  }

  return <section className="section page-top marketplace-page"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Marketplace internationale Vydys",ar:"سوق Vydys الدولي",en:"Vydys Global Marketplace"})}</span><h1>{t({fr:"Trouvez la formation qui vous fera progresser.",ar:"اعثر على الدورة التي ستطور مهاراتك.",en:"Find the course that moves you forward."})}</h1><p>{t({fr:"Les formateurs fixent leurs vrais prix et devises. Vydys n’invente pas de conversion entre des monnaies différentes.",ar:"يحدد المدربون الأسعار والعملات الحقيقية. لا يخترع Vydys أسعار صرف بين العملات.",en:"Instructors set real prices and currencies. Vydys does not invent exchange rates between currencies."})}</p><div className="hero-actions"><Link className="btn btn-ghost" href="/formateurs">{t({fr:"Classement des formateurs",ar:"ترتيب المدربين",en:"Instructor ranking"})}</Link>{userId&&<Link className="btn btn-ghost" href="/favoris">♥ {t({fr:"Mes favoris",ar:"المفضلة",en:"My favorites"})}</Link>}</div></div>

    <div className="market-filter-panel"><div className="market-filters advanced global">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t({fr:"Formation ou formateur...",ar:"دورة أو مدرب...",en:"Course or instructor..."})}/>
      <select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">{t({fr:"Toutes les catégories",ar:"كل الفئات",en:"All categories"})}</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
      <select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="all">{t({fr:"Toutes les devises",ar:"كل العملات",en:"All currencies"})}</option>{currencies.map(c=><option key={c} value={c}>{c}</option>)}</select>
      <select value={minRating} onChange={e=>setMinRating(e.target.value)}><option value="0">{t({fr:"Toutes les notes",ar:"كل التقييمات",en:"All ratings"})}</option><option value="4">4★+</option><option value="4.5">4.5★+</option></select>
      <select value={sort} onChange={e=>setSort(e.target.value)}><option value="top">{t({fr:"Mieux notées",ar:"الأعلى تقييماً",en:"Top rated"})}</option><option value="reviews">{t({fr:"Plus d'avis",ar:"الأكثر تقييماً",en:"Most reviewed"})}</option><option value="price_low" disabled={currency==="all"}>{t({fr:"Prix croissant",ar:"السعر تصاعدي",en:"Price low to high"})}</option><option value="price_high" disabled={currency==="all"}>{t({fr:"Prix décroissant",ar:"السعر تنازلي",en:"Price high to low"})}</option></select>
    </div></div>

    <div className="market-grid">
      {shown.map((c,index)=>{
        const title=lang==="ar"?c.title_ar:lang==="en"?c.title_en:c.title_fr;
        const desc=lang==="ar"?c.description_ar:lang==="en"?c.description_en:c.description_fr;
        const rating=Number(ratings[c.id]?.average_rating||0);const reviews=ratings[c.id]?.review_count||0;
        const instructor=c.instructor_id?instructors[c.instructor_id]:null;const cur=String(c.base_currency||"MRU").toUpperCase();const amount=Number(c.base_price_amount??c.base_price_mru);
        return <article className="market-card" key={c.id}>
          <div className="course-cover">{c.cover_url?<img src={c.cover_url} alt="" />:<span>V</span>}{index<3&&rating>0?<b>{t({fr:"Top formation",ar:"من الأفضل",en:"Top course"})}</b>:null}<button className={favorites.has(c.id)?"favorite-btn active":"favorite-btn"} onClick={()=>toggleFavorite(c.id)} aria-label="favorite">♥</button></div>
          <div className="market-card-body">
            <div className="rating-line"><span className="stars">★★★★★</span><strong>{rating?rating.toFixed(1):"—"}</strong><small>({reviews})</small></div>
            <h2>{title}</h2><p>{desc}</p>
            {instructor?<Link className="trainer-link" href={"/formateur/"+instructor.public_slug}>{instructor.display_name}{instructor.headline?" · "+instructor.headline:""}</Link>:<span className="trainer-link">Vydys Academy</span>}
            <div className="course-card-footer"><strong>{formatMoney(amount,cur)}</strong><Link className="btn btn-small" href={"/formation/"+c.slug}>{t({fr:"Voir",ar:"عرض",en:"View"})}</Link></div>
          </div>
        </article>
      })}
    </div>
    {shown.length===0&&<article className="panel"><p>{t({fr:"Aucune formation ne correspond à vos filtres.",ar:"لا توجد دورة مطابقة للمرشحات.",en:"No courses match your filters."})}</p></article>}
  </div></section>
}
