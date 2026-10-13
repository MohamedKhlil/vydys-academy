"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";
import CourseShare from "../../components/course-share";

type Course={
  id:string;slug:string;title_fr:string;title_ar:string;title_en:string;
  description_fr:string|null;description_ar:string|null;description_en:string|null;
  base_price_mru:number;base_price_amount:number;base_currency:string;category:string|null;instructor_id:string|null;cover_url:string|null;
};
type Rating={course_id:string;average_rating:number|string;review_count:number};
type Instructor={user_id:string;public_slug:string;display_name:string;headline:string|null};
type CoursePrice={course_id:string;currency:string;amount:number|string};
type CourseModule={id:string;course_id:string;title_fr:string;title_ar:string;title_en:string;position:number};
type LiveSummary={has_live_classroom?:boolean;session_count?:number;session_duration_minutes?:number;title_fr?:string;title_ar?:string;title_en?:string};

export default function FormationsPage(){
  const {lang,t}=useLanguage();
  const [courses,setCourses]=useState<Course[]>([]);
  const [ratings,setRatings]=useState<Record<string,Rating>>({});
  const [instructors,setInstructors]=useState<Record<string,Instructor>>({});
  const [favorites,setFavorites]=useState<Set<string>>(new Set());
  const [priceRows,setPriceRows]=useState<CoursePrice[]>([]);
  const [modulesByCourse,setModulesByCourse]=useState<Record<string,CourseModule[]>>({});
  const [liveByCourse,setLiveByCourse]=useState<Record<string,LiveSummary>>({});
  const [displayCurrency,setDisplayCurrency]=useState("USD");
  const [userId,setUserId]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("all");
  const [currency,setCurrency]=useState("all");
  const [minRating,setMinRating]=useState("0");
  const [sort,setSort]=useState("top");

  async function load(){
    const [{data:c},{data:r},{data:i},{data:pr},{data:mods},{data:{user}}]=await Promise.all([
      supabase.from("courses").select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,base_price_amount,base_currency,category,instructor_id,cover_url").eq("status","published"),
      supabase.from("course_rating_summary").select("course_id,average_rating,review_count"),
      supabase.from("instructor_profiles").select("user_id,public_slug,display_name,headline").eq("is_public",true),
      supabase.from("course_prices").select("course_id,currency,amount").eq("is_active",true),
      supabase.from("course_modules").select("id,course_id,title_fr,title_ar,title_en,position").order("position"),
      supabase.auth.getUser()
    ]);
    setCourses((c||[]) as Course[]);setPriceRows((pr||[]) as CoursePrice[]);
    const mm:Record<string,CourseModule[]>={};
    ((mods||[]) as CourseModule[]).forEach(m=>{if(!mm[m.course_id])mm[m.course_id]=[];mm[m.course_id].push(m)});
    Object.values(mm).forEach(rows=>rows.sort((a,b)=>a.position-b.position));
    setModulesByCourse(mm);
    const availableCurrencies=Array.from(new Set((c||[]).map((x:any)=>String(x.base_currency||"MRU").toUpperCase())));
    if(availableCurrencies.length===1)setDisplayCurrency(availableCurrencies[0]);
    const liveRows=await Promise.all((c||[]).map(async(course:any)=>{
      const {data}=await supabase.rpc("get_public_course_live_summary",{p_course_id:course.id});
      return [course.id,data||null] as const;
    }));
    const lm:Record<string,LiveSummary>={};liveRows.forEach(([id,data])=>{if(data?.has_live_classroom)lm[id]=data});
    setLiveByCourse(lm);
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
      if(pref&&(c||[]).some((x:any)=>String(x.base_currency||"MRU").toUpperCase()===pref))setDisplayCurrency(pref);
    }
  }

  useEffect(()=>{load()},[]);

  const priceMap=useMemo(()=>{
    const map:Record<string,Record<string,number>>={};
    priceRows.forEach(p=>{
      const courseId=String(p.course_id);
      const currency=String(p.currency||"").toUpperCase();
      if(!map[courseId])map[courseId]={};
      map[courseId][currency]=Number(p.amount);
    });
    return map;
  },[priceRows]);

  const catalogCourses=useMemo(()=>courses.filter(c=>(modulesByCourse[c.id]||[]).length>0),[courses,modulesByCourse]);
  const categories=useMemo(()=>Array.from(new Set(catalogCourses.map(c=>c.category).filter(Boolean) as string[])),[catalogCourses]);
  const currencies=useMemo(()=>Array.from(new Set(catalogCourses.map(c=>String(c.base_currency||"MRU").toUpperCase()))).sort(),[catalogCourses]);
  const formatMoney=(amount:number,cur:string)=>new Intl.NumberFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{style:"currency",currency:cur,maximumFractionDigits:2}).format(amount);
  function exactPrice(c:Course,cur:string){
    const code=String(cur||"").toUpperCase();
    const base=String(c.base_currency||"MRU").toUpperCase();
    if(priceMap[c.id]?.[code]!=null)return priceMap[c.id][code];
    if(base===code)return Number(c.base_price_amount??c.base_price_mru);
    return null;
  }
  function displayPrice(c:Course){
    const preferred=exactPrice(c,displayCurrency);
    if(preferred!=null)return {amount:preferred,currency:displayCurrency,isLocalFallback:false};
    const base=String(c.base_currency||"MRU").toUpperCase();
    return {amount:Number(c.base_price_amount??c.base_price_mru),currency:base,isLocalFallback:base!==displayCurrency};
  }

  const shown=useMemo(()=>{
    const q=search.trim().toLowerCase();const minR=Number(minRating||0);
    const arr=catalogCourses.filter(c=>{
      const title=lang==="ar"?c.title_ar:lang==="en"?c.title_en:c.title_fr;
      const desc=lang==="ar"?c.description_ar:lang==="en"?c.description_en:c.description_fr;
      const instructor=c.instructor_id?instructors[c.instructor_id]:null;
      const rating=Number(ratings[c.id]?.average_rating||0);
      return (category==="all"||c.category===category)
        && (currency==="all"||exactPrice(c,currency)!=null)
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
  },[catalogCourses,ratings,instructors,search,category,currency,minRating,sort,lang,priceMap]);

  async function toggleFavorite(courseId:string){
    if(!userId){window.location.href="/connexion";return}
    if(favorites.has(courseId)){await supabase.from("course_favorites").delete().eq("user_id",userId).eq("course_id",courseId);setFavorites(prev=>{const n=new Set(prev);n.delete(courseId);return n})}
    else{await supabase.from("course_favorites").insert({user_id:userId,course_id:courseId});setFavorites(prev=>new Set(prev).add(courseId))}
  }

  return <section className="section page-top marketplace-page"><div className="container">
    <div className="page-hero formations-market-hero"><span className="eyebrow">{t({fr:"Catalogue Vydys Academy",ar:"دليل Vydys Academy",en:"Vydys Academy Catalog"})}</span><h1>{t({fr:"Choisissez un parcours. Voyez le programme avant de vous inscrire.",ar:"اختر مسارك واطلع على البرنامج قبل التسجيل.",en:"Choose a pathway. See the curriculum before you enroll."})}</h1><p>{t({fr:"Chaque formation présente clairement ses modules, son formateur, son prix et les séances Classroom live incluses. Vous savez exactement ce que vous allez apprendre.",ar:"كل دورة تعرض الوحدات والمدرب والسعر والحصص المباشرة المشمولة بوضوح حتى تعرف ما ستتعلمه قبل التسجيل.",en:"Every course clearly shows its modules, instructor, price and included live Classroom sessions, so you know exactly what you will learn."})}</p><div className="formation-value-strip"><span>▦ {t({fr:"Programme visible",ar:"برنامج واضح",en:"Visible curriculum"})}</span><span>◉ {t({fr:"Classroom live",ar:"فصول مباشرة",en:"Live Classroom"})}</span><span>✓ {t({fr:"Exercices pratiques",ar:"تمارين تطبيقية",en:"Practical assignments"})}</span><span>MRU {t({fr:"Paiement local",ar:"دفع محلي",en:"Local payment"})}</span></div><div className="hero-actions"><Link className="btn btn-ghost" href="/formateurs">{t({fr:"Découvrir les formateurs",ar:"اكتشف المدربين",en:"Meet instructors"})}</Link>{userId&&<Link className="btn btn-ghost" href="/favoris">♥ {t({fr:"Mes favoris",ar:"المفضلة",en:"My favorites"})}</Link>}</div></div>

    <div className="market-filter-panel formations-filter-panel"><div className="formations-simple-filters">
      <label className="formations-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t({fr:"Rechercher une formation...",ar:"ابحث عن دورة...",en:"Search courses..."})}/></label>
      <select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">{t({fr:"Toutes les catégories",ar:"كل الفئات",en:"All categories"})}</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
      <select value={sort} onChange={e=>setSort(e.target.value)}><option value="top">{t({fr:"Recommandées",ar:"الموصى بها",en:"Recommended"})}</option><option value="reviews">{t({fr:"Plus d'avis",ar:"الأكثر تقييماً",en:"Most reviewed"})}</option></select>
    </div></div>

    <div className="formations-results-bar"><div><strong>{shown.length}</strong><span>{shown.length>1?t({fr:"formations disponibles",ar:"دورات متاحة",en:"courses available"}):t({fr:"formation disponible",ar:"دورة متاحة",en:"course available"})}</span></div><small>{t({fr:"Modules et contenu visibles avant inscription",ar:"الوحدات والمحتوى ظاهرة قبل التسجيل",en:"Modules and curriculum visible before enrollment"})}</small></div>

    <div className="market-grid formations-market-grid">
      {shown.map((c,index)=>{
        const title=lang==="ar"?c.title_ar:lang==="en"?c.title_en:c.title_fr;
        const desc=lang==="ar"?c.description_ar:lang==="en"?c.description_en:c.description_fr;
        const rating=Number(ratings[c.id]?.average_rating||0);const reviews=ratings[c.id]?.review_count||0;
        const instructor=c.instructor_id?instructors[c.instructor_id]:null;const shownPrice=displayPrice(c);const cur=shownPrice.currency;const amount=shownPrice.amount;
        const modules=modulesByCourse[c.id]||[];
        const live=liveByCourse[c.id];
        const moduleTitle=(m:CourseModule)=>lang==="ar"?(m.title_ar||m.title_fr):lang==="en"?(m.title_en||m.title_fr):m.title_fr;
        return <article className="market-card course-market-card" key={c.id}>
          <div className="course-cover course-market-cover">
            {c.cover_url?<img src={c.cover_url} alt="" />:<div className="course-cover-monogram"><span>V</span><small>VYDYS COURSE</small></div>}
            <div className="course-cover-badges">
              {c.category&&<span>{c.category}</span>}
              {live?.has_live_classroom&&<span className="live">● {live.session_count} LIVE</span>}
              {index<3&&rating>0&&<span className="top">{t({fr:"Top formation",ar:"من الأفضل",en:"Top course"})}</span>}
            </div>
            <button className={favorites.has(c.id)?"favorite-btn active":"favorite-btn"} onClick={()=>toggleFavorite(c.id)} aria-label="favorite">♥</button>
          </div>
          <div className="market-card-body course-market-body">
            <div className="course-card-meta-row">
              <span className="course-module-count">{modules.length} {t({fr:"modules",ar:"وحدات",en:"modules"})}</span>
              {live?.has_live_classroom&&<span className="course-live-inline">● {live.session_count} × {live.session_duration_minutes} min</span>}
              {rating>0&&<span className="course-rating-inline">★ {rating.toFixed(1)}{reviews>0?" · "+reviews:""}</span>}
            </div>

            <h2>{title}</h2>
            <p className="course-market-desc">{desc}</p>

            <div className="course-program-preview compact">
              <strong className="course-program-label">{t({fr:"Aperçu du programme",ar:"لمحة عن البرنامج",en:"Curriculum preview"})}</strong>
              <div className="course-module-preview-list">
                {modules.slice(0,3).map((m,idx)=><div key={m.id}><span>{String(idx+1).padStart(2,"0")}</span><strong>{moduleTitle(m)}</strong></div>)}
              </div>
              {modules.length>3&&<small className="course-more-modules">+{modules.length-3} {t({fr:"modules dans le programme complet",ar:"وحدات في البرنامج الكامل",en:"modules in the full curriculum"})}</small>}
            </div>

            {instructor?<Link className="trainer-link course-trainer-row" href={"/formateur/"+instructor.public_slug}><span className="course-trainer-avatar">{instructor.display_name?.slice(0,2).toUpperCase()}</span><span><strong>{instructor.display_name}</strong><small>{live?.has_live_classroom?t({fr:"Formateur · sessions live incluses",ar:"مدرب · حصص مباشرة مشمولة",en:"Instructor · live sessions included"}):instructor.headline||""}</small></span></Link>:null}

            <div className="course-card-footer">
              <div className="course-price-stack"><small>{t({fr:"Prix unique",ar:"السعر الموحد",en:"Single price"})}</small><strong>{formatMoney(amount,cur)}</strong></div>
              <div className="course-card-actions"><CourseShare compact title={title} slug={c.slug}/><Link className="btn btn-small course-open-btn" href={"/formation/"+c.slug}>{t({fr:"Découvrir",ar:"اكتشف",en:"Explore"})} →</Link></div>
            </div>
          </div>
        </article>
      })}
    </div>
    {shown.length===0&&<article className="panel"><p>{t({fr:"Aucune formation ne correspond à vos filtres.",ar:"لا توجد دورة مطابقة للمرشحات.",en:"No courses match your filters."})}</p></article>}
  </div></section>
}
