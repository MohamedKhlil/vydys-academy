"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type SearchRow={
  entity_type:"course"|"classroom"|"product"|"instructor";
  entity_id:string;
  slug:string|null;
  title_fr:string|null;
  title_ar:string|null;
  title_en:string|null;
  summary_fr:string|null;
  summary_ar:string|null;
  summary_en:string|null;
  image_url:string|null;
  meta:Record<string,unknown>|null;
};

export default function SearchPage(){
  const {t,lang}=useLanguage();
  const [query,setQuery]=useState("");
  const [rows,setRows]=useState<SearchRow[]>([]);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const [error,setError]=useState("");

  function title(row:SearchRow){
    return lang==="ar"
      ?row.title_ar||row.title_fr||row.title_en||""
      :lang==="fr"
        ?row.title_fr||row.title_en||row.title_ar||""
        :row.title_en||row.title_fr||row.title_ar||"";
  }

  function summary(row:SearchRow){
    return lang==="ar"
      ?row.summary_ar||row.summary_fr||row.summary_en||""
      :lang==="fr"
        ?row.summary_fr||row.summary_en||row.summary_ar||""
        :row.summary_en||row.summary_fr||row.summary_ar||"";
  }

  function href(row:SearchRow){
    if(row.entity_type==="course")return `/formation/${encodeURIComponent(row.slug||"")}`;
    if(row.entity_type==="classroom")return `/classroom/${encodeURIComponent(row.slug||"")}`;
    if(row.entity_type==="product")return `/marketplace/${encodeURIComponent(row.slug||"")}`;
    return "/formateurs";
  }

  function label(type:SearchRow["entity_type"]){
    if(type==="course")return t({fr:"Formation",ar:"دورة",en:"Course"});
    if(type==="classroom")return "Classroom";
    if(type==="product")return t({fr:"Produit",ar:"منتج",en:"Product"});
    return t({fr:"Formateur",ar:"مدرب",en:"Instructor"});
  }

  function formatPrice(row:SearchRow){
    const amount=Number(row.meta?.price);
    const currency=String(row.meta?.currency||"");
    if(!Number.isFinite(amount)||!currency)return "";
    try{
      return new Intl.NumberFormat(
        lang==="ar"?"ar":lang==="fr"?"fr-FR":"en-US",
        {style:"currency",currency,maximumFractionDigits:2}
      ).format(amount);
    }catch{
      return `${amount.toLocaleString()} ${currency}`;
    }
  }

  async function run(raw:string,replaceUrl=true){
    const clean=raw.trim().slice(0,80);
    setQuery(clean);
    setError("");
    if(clean.length<2){
      setRows([]);
      setSearched(Boolean(clean));
      return;
    }

    setLoading(true);
    const {data,error:rpcError}=await supabase.rpc("global_public_search",{
      p_query:clean,
      p_limit:8
    });
    setLoading(false);
    setSearched(true);

    if(rpcError){
      setRows([]);
      setError(t({
        fr:"La recherche est temporairement indisponible.",
        ar:"البحث غير متاح مؤقتاً.",
        en:"Search is temporarily unavailable."
      }));
      return;
    }

    setRows((data||[]) as SearchRow[]);
    if(replaceUrl){
      const url=new URL(window.location.href);
      url.searchParams.set("q",clean);
      window.history.replaceState(null,"",url);
    }
  }

  useEffect(()=>{
    const initial=new URL(window.location.href).searchParams.get("q")||"";
    if(initial.trim().length>=2)void run(initial,false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function submit(e:FormEvent){
    e.preventDefault();
    void run(query);
  }

  return <section className="section page-top"><div className="container" style={{maxWidth:980}}>
    <div className="page-hero">
      <span className="eyebrow">{t({fr:"Recherche globale",ar:"البحث الشامل",en:"Global search"})}</span>
      <h1>{t({
        fr:"Trouvez tout l'écosystème Vydys.",
        ar:"ابحث في منظومة Vydys كاملة.",
        en:"Search the Vydys ecosystem."
      })}</h1>
      <p>{t({
        fr:"Formations, Classrooms, formateurs et produits de la marketplace.",
        ar:"الدورات والفصول والمدربون ومنتجات السوق.",
        en:"Courses, Classrooms, instructors and marketplace products."
      })}</p>
    </div>

    <form onSubmit={submit} className="panel" style={{display:"flex",gap:10,marginBottom:22}}>
      <label style={{flex:1}}>
        <span className="sr-only">{t({fr:"Rechercher",ar:"بحث",en:"Search"})}</span>
        <input
          value={query}
          onChange={e=>setQuery(e.target.value)}
          maxLength={80}
          autoComplete="off"
          placeholder={t({
            fr:"Ex. IA, Python, marketing, cloud…",
            ar:"مثال: الذكاء الاصطناعي، Python، التسويق…",
            en:"e.g. AI, Python, marketing, cloud…"
          })}
          aria-label={t({fr:"Recherche globale",ar:"البحث الشامل",en:"Global search"})}
        />
      </label>
      <button className="btn" disabled={loading||query.trim().length<2}>
        {loading?"…":t({fr:"Rechercher",ar:"بحث",en:"Search"})}
      </button>
    </form>

    {error&&<article className="panel"><p>{error}</p></article>}

    {!error&&searched&&!loading&&rows.length===0&&<article className="panel">
      <h2>{t({fr:"Aucun résultat",ar:"لا توجد نتائج",en:"No results"})}</h2>
      <p>{t({
        fr:"Essayez un autre mot-clé ou explorez les formations.",
        ar:"جرّب كلمة أخرى أو استكشف الدورات.",
        en:"Try another keyword or browse courses."
      })}</p>
      <Link className="btn btn-ghost" href="/formations">{t({fr:"Voir les formations",ar:"عرض الدورات",en:"Browse courses"})}</Link>
    </article>}

    <div className="student-course-grid">
      {rows.map(row=>{
        const price=formatPrice(row);
        return <Link className="student-course-card panel" href={href(row)} key={row.entity_type+row.entity_id}>
          {row.image_url&&<img src={row.image_url} alt="" style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",borderRadius:14}}/>}
          <div>
            <span className="tag">{label(row.entity_type)}</span>
            <h2>{title(row)}</h2>
            <p>{summary(row)}</p>
          </div>
          <div className="student-card-meta">
            {price&&<strong>{price}</strong>}
            <span>{t({fr:"Ouvrir",ar:"فتح",en:"Open"})} →</span>
          </div>
        </Link>
      })}
    </div>
  </div></section>
}
