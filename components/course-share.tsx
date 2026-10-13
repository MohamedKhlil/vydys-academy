"use client";

import { useState } from "react";
import { useLanguage } from "./language-provider";

type Props={
  title:string;
  slug:string;
  compact?:boolean;
};

export default function CourseShare({title,slug,compact=false}:Props){
  const {t}=useLanguage();
  const [copied,setCopied]=useState(false);
  const url=`https://www.vydys.com/formation/${slug}`;
  const shareText=t({
    fr:`Découvrez cette formation sur Vydys Academy : ${title}`,
    ar:`اكتشف هذه الدورة على Vydys Academy: ${title}`,
    en:`Discover this course on Vydys Academy: ${title}`
  });

  async function copyLink(){
    try{
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1800);
    }catch{
      window.prompt(t({fr:"Copiez ce lien",ar:"انسخ هذا الرابط",en:"Copy this link"}),url);
    }
  }

  async function share(){
    if(typeof navigator!=="undefined"&&navigator.share){
      try{
        await navigator.share({title,text:shareText,url});
        return;
      }catch(error:any){
        if(error?.name==="AbortError")return;
      }
    }
    await copyLink();
  }

  const whatsapp=`https://wa.me/?text=${encodeURIComponent(shareText+" "+url)}`;

  if(compact){
    return <div className="course-share compact">
      <button type="button" onClick={share} className="course-share-main" aria-label={t({fr:"Partager cette formation",ar:"مشاركة هذه الدورة",en:"Share this course"})}>↗</button>
      <a href={whatsapp} target="_blank" rel="noreferrer" className="course-share-whatsapp" aria-label="WhatsApp">WA</a>
    </div>;
  }

  return <div className="course-share">
    <button type="button" onClick={share} className="course-share-main">↗ {t({fr:"Partager",ar:"مشاركة",en:"Share"})}</button>
    <a href={whatsapp} target="_blank" rel="noreferrer" className="course-share-whatsapp">WhatsApp</a>
    <button type="button" onClick={copyLink} className="course-share-copy">{copied?"✓ "+t({fr:"Copié",ar:"تم النسخ",en:"Copied"}):"⧉ "+t({fr:"Copier le lien",ar:"نسخ الرابط",en:"Copy link"})}</button>
  </div>;
}
