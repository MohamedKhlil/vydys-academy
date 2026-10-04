"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function SkillsPage(){
  const {lang,t}=useLanguage();
  const [rows,setRows]=useState<any[]>([]);
  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data}=await supabase.from("user_skills")
      .select("level,verification_status,source_type,awarded_at,skills:skill_id(id,slug,name_fr,name_ar,name_en,category,description)")
      .eq("user_id",user.id).eq("verification_status","verified").order("awarded_at",{ascending:false});
    setRows(data||[]);
  })()},[]);
  const grouped=useMemo(()=>rows.reduce((acc:any,r:any)=>{const k=r.skills?.category||"Autres";(acc[k]??=[]).push(r);return acc},{}),[rows]);
  const local=(s:any)=>lang==="ar"?s.name_ar:lang==="en"?s.name_en:s.name_fr;
  const sourceLabel=(source:string)=>source==="project"?t({fr:"Projet validé",ar:"مشروع معتمد",en:"Approved project"}):source==="verified_exam"?t({fr:"Examen pratique Verified",ar:"اختبار عملي Verified",en:"Verified practical exam"}):source==="course"?t({fr:"Formation validée",ar:"دورة معتمدة",en:"Validated course"}):t({fr:"Certification",ar:"شهادة",en:"Certification"});

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Skills Passport</span><h1>{t({fr:"Vos compétences vérifiées",ar:"مهاراتك المعتمدة",en:"Your verified skills"})}</h1><p>{t({fr:"Chaque badge provient d'un projet ou d'une certification validée sur Vydys.",ar:"كل شارة تأتي من مشروع أو شهادة تم اعتمادها على Vydys.",en:"Each badge comes from a project or certification validated on Vydys."})}</p></div><Link className="btn btn-ghost" href="/portfolio">{t({fr:"Mon portfolio",ar:"ملفي",en:"My portfolio"})}</Link></div>
    {rows.length===0?<article className="panel empty-state"><h2>{t({fr:"Aucune compétence vérifiée pour le moment.",ar:"لا توجد مهارات معتمدة حتى الآن.",en:"No verified skills yet."})}</h2><p>{t({fr:"Terminez une formation associée à des compétences ou faites valider un projet.",ar:"أكمل دورة مرتبطة بمهارات أو اعتمد مشروعاً.",en:"Complete a skill-mapped course or have a project approved."})}</p><Link className="btn" href="/projects">{t({fr:"Créer un projet",ar:"إنشاء مشروع",en:"Create a project"})}</Link></article>:Object.entries(grouped).map(([category,items]:any)=><section className="skill-category" key={category}><h2>{category}</h2><div className="skill-passport-grid">{items.map((r:any)=><article className="panel skill-badge-card" key={r.skills.id}><div className="verified-seal">✓</div><div><span className="tag">{r.level}</span><h3>{local(r.skills)}</h3><p>{r.skills.description}</p><small>{t({fr:"Vérifié par Vydys",ar:"معتمد من Vydys",en:"Verified by Vydys"})} · {sourceLabel(r.source_type)}</small></div></article>)}</div></section>)}
  </div></section>
}
