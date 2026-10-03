"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function CertificatePage(){
  const {code}=useParams<{code:string}>();
  const {lang,t}=useLanguage();
  const [cert,setCert]=useState<any>(null);

  useEffect(()=>{supabase.rpc("get_public_certificate",{p_code:code}).then(({data})=>setCert(data||false))},[code]);
  if(cert===null)return <section className="section page-top"><div className="container">...</div></section>;
  if(cert===false)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Certificat introuvable",ar:"الشهادة غير موجودة",en:"Certificate not found"})}</h1></article></div></section>;

  const title=lang==="ar"?cert.course_title_ar:lang==="en"?cert.course_title_en:cert.course_title_fr;
  return <section className="certificate-page"><div className="certificate-sheet">
    <div className="certificate-brand"><span className="brand-mark">V</span><strong>Vydys Academy</strong></div>
    <span className="certificate-kicker">{t({fr:"CERTIFICAT DE RÉUSSITE",ar:"شهادة إتمام",en:"CERTIFICATE OF COMPLETION"})}</span>
    <h1>{t({fr:"Certificat",ar:"شهادة",en:"Certificate"})}</h1>
    <p>{t({fr:"Ce certificat atteste que",ar:"تشهد Vydys Academy أن",en:"This certifies that"})}</p>
    <h2>{cert.student_name}</h2>
    <p>{t({fr:"a complété avec succès la formation",ar:"أكمل بنجاح دورة",en:"has successfully completed"})}</p>
    <h3>{title}</h3>
    <div className="certificate-meta"><div><small>{t({fr:"Formateur",ar:"المدرب",en:"Instructor"})}</small><strong>{cert.instructor_name}</strong></div><div><small>{t({fr:"Date",ar:"التاريخ",en:"Date"})}</small><strong>{new Date(cert.issued_at).toLocaleDateString()}</strong></div></div>
    <div className="certificate-code"><small>{t({fr:"Code de vérification",ar:"رمز التحقق",en:"Verification code"})}</small><strong>{cert.certificate_code}</strong><span>vydys.com/certificat/{cert.certificate_code}</span></div>
    <button className="btn print-hide" onClick={()=>window.print()}>{t({fr:"Imprimer / Enregistrer PDF",ar:"طباعة / حفظ PDF",en:"Print / Save PDF"})}</button>
  </div></section>
}
