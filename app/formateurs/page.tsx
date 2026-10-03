"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function FormateursPage(){
  const {t}=useLanguage();
  const [rows,setRows]=useState<any[]>([]);
  useEffect(()=>{supabase.rpc("get_instructor_ranking").then(({data})=>setRows(data||[]))},[]);

  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Communauté Vydys",ar:"مجتمع Vydys",en:"Vydys community"})}</span><h1>{t({fr:"Découvrez les meilleurs formateurs",ar:"اكتشف أفضل المدربين",en:"Discover top instructors"})}</h1><p>{t({fr:"Le classement combine les notes des étudiants, le nombre d'avis et l'activité réelle sur la plateforme.",ar:"يعتمد الترتيب على تقييمات الطلاب وعدد الآراء والنشاط الحقيقي على المنصة.",en:"Ranking reflects student ratings, review volume and real activity on the platform."})}</p></div>
    <div className="trainer-ranking">
      {rows.map((r,i)=><article className="panel trainer-rank-card" key={r.user_id}>
        <div className="rank-number">#{i+1}</div>
        <div className="avatar trainer-avatar">{r.display_name?.slice(0,2).toUpperCase()}</div>
        <div className="trainer-rank-main"><h2>{r.display_name}</h2><p>{r.headline}</p><small>{r.expertise}</small><div className="rating-line big"><span className="stars">★★★★★</span><strong>{Number(r.average_rating||0).toFixed(1)}</strong><span>({r.review_count})</span></div><div className="trainer-stats-inline"><span>{r.course_count} {t({fr:"formations",ar:"دورات",en:"courses"})}</span><span>{r.student_count} {t({fr:"étudiants",ar:"طلاب",en:"students"})}</span></div></div>
        <Link className="btn btn-small" href={"/formateur/"+r.public_slug}>{t({fr:"Voir le profil",ar:"عرض الملف",en:"View profile"})}</Link>
      </article>)}
      {rows.length===0&&<article className="panel"><p>{t({fr:"Aucun formateur public pour le moment.",ar:"لا يوجد مدربون منشورون حالياً.",en:"No public instructors yet."})}</p></article>}
    </div>
  </div></section>
}
