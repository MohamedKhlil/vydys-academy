"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function CertificatePage(){
  const {code}=useParams<{code:string}>();
  const {lang,t}=useLanguage();
  const [cert,setCert]=useState<any>(null);

  useEffect(()=>{
    supabase.rpc("get_public_certificate",{p_code:code}).then(({data})=>setCert(data||false));
  },[code]);

  if(cert===null)return <section className="section page-top"><div className="container">...</div></section>;
  if(cert===false)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Certificat introuvable",ar:"الشهادة غير موجودة",en:"Certificate not found"})}</h1></article></div></section>;

  const title=lang==="ar"?(cert.course_title_ar||cert.course_title_fr):lang==="en"?(cert.course_title_en||cert.course_title_fr):cert.course_title_fr;
  const issued=new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(cert.issued_at));
  const certificateTitle=t({fr:"CERTIFICAT DE RÉUSSITE",ar:"شهادة إتمام ونجاح",en:"CERTIFICATE OF ACHIEVEMENT"});
  const certifies=t({fr:"Vydys Academy certifie que",ar:"تشهد Vydys Academy أن",en:"Vydys Academy certifies that"});
  const completed=t({fr:"a suivi avec succès la formation",ar:"قد أتم بنجاح الدورة التدريبية",en:"has successfully completed the training"});
  const achievement=t({
    fr:"et a acquis les compétences et connaissances prévues par le programme de formation.",
    ar:"واكتسب المهارات والمعارف المحددة ضمن برنامج التدريب.",
    en:"and has acquired the skills and knowledge defined by the training program."
  });

  return <section className="certificate-page">
    <div className="certificate-actions print-hide">
      <button className="btn" onClick={()=>window.print()}>{t({fr:"Imprimer / Enregistrer PDF",ar:"طباعة / حفظ PDF",en:"Print / Save PDF"})}</button>
      <span>{t({fr:"Certificat public et vérifiable",ar:"شهادة عامة قابلة للتحقق",en:"Publicly verifiable certificate"})}</span>
    </div>

    <div className="certificate-sheet certificate-premium" dir={lang==="ar"?"rtl":"ltr"}>
      <div className="certificate-corner certificate-corner-tl"></div>
      <div className="certificate-corner certificate-corner-br"></div>
      <div className="certificate-frame"></div>
      <div className="certificate-wave certificate-wave-a"></div>
      <div className="certificate-wave certificate-wave-b"></div>

      <header className="certificate-top">
        <div className="certificate-top-note">
          <span>{t({fr:"FORMATION",ar:"تكوين",en:"LEARNING"})}</span>
          <span>IA · DIGITAL · TECH</span>
          <span>{t({fr:"POUR UN MONDE DE POSSIBILITÉS",ar:"لعالم من الفرص",en:"FOR A WORLD OF POSSIBILITIES"})}</span>
        </div>

        <div className="certificate-logo">
          <span className="certificate-v-mark">V</span>
          <div><strong>vydys</strong><small>ACADEMY</small></div>
        </div>

        <div className="certificate-motto">
          <span>{t({fr:"APPRENDRE",ar:"تعلّم",en:"LEARN"})}</span>
          <span>{t({fr:"AUJOURD’HUI",ar:"اليوم",en:"TODAY"})}</span>
          <span>{t({fr:"CONSTRUIRE DEMAIN",ar:"وابنِ الغد",en:"BUILD TOMORROW"})}</span>
        </div>
      </header>

      <main className="certificate-content">
        <h1>{certificateTitle}</h1>
        <div className="certificate-gold-divider"><i></i><span>◇</span><i></i></div>

        <p className="certificate-certifies">{certifies}</p>
        <h2>{cert.student_name}</h2>
        <div className="certificate-name-line"></div>

        <p className="certificate-completed">{completed}</p>
        <h3>{title}</h3>
        <div className="certificate-course-line"></div>

        <p className="certificate-achievement">{achievement}</p>

        <div className="certificate-info-row">
          <div className="certificate-info-item">
            <span className="certificate-info-icon">▣</span>
            <div><small>{t({fr:"Date",ar:"التاريخ",en:"Date"})}</small><strong>{issued}</strong></div>
          </div>
          <div className="certificate-info-item">
            <span className="certificate-info-icon">▤</span>
            <div><small>{t({fr:"ID Certificat",ar:"رقم الشهادة",en:"Certificate ID"})}</small><strong>{cert.certificate_code}</strong></div>
          </div>
          <div className="certificate-info-item">
            <span className="certificate-info-icon">◆</span>
            <div><small>{t({fr:"Formateur",ar:"المدرب",en:"Instructor"})}</small><strong>{cert.instructor_name}</strong></div>
          </div>
        </div>
      </main>

      <footer className="certificate-bottom">
        <div className="certificate-signature-block director">
          <div className="certificate-signature-name">Mohamed El Hadrami Khlil</div>
          <div className="certificate-signature-line"></div>
          <small>{t({fr:"Directeur de programme",ar:"مدير البرنامج",en:"Program Director"})}</small>
          <strong>Mohamed El Hadrami Khlil</strong>
        </div>

        <div className="certificate-seal">
          <div className="certificate-seal-ring">
            <span className="certificate-seal-v">V</span>
            <strong>VYDYS ACADEMY</strong>
            <small>CERTIFIED</small>
          </div>
        </div>

        <div className="certificate-signature-block instructor">
          <div className="certificate-signature-line"></div>
          <small>{t({fr:"Formateur",ar:"المدرب",en:"Instructor"})}</small>
          <strong>{cert.instructor_name}</strong>
        </div>
      </footer>

      <div className="certificate-verification">
        <span>www.vydys.com</span>
        <small>{t({fr:"Vérification",ar:"التحقق",en:"Verify"})}: vydys.com/certificat/{cert.certificate_code}</small>
      </div>
    </div>
  </section>
}
