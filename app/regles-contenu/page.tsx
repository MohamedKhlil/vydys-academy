"use client";

import { useLanguage } from "../../components/language-provider";

export default function ContentRulesPage(){
  const {t}=useLanguage();
  return <section className="section page-top"><div className="container legal-page">
    <span className="eyebrow">Vydys Academy</span>
    <h1>{t({fr:"Standards de contenu",ar:"معايير المحتوى",en:"Content Standards"})}</h1>
    <p>{t({fr:"Les formateurs doivent publier des contenus utiles, exacts, légalement utilisables et conformes à la description commerciale de la formation.",ar:"يجب على المدربين نشر محتوى مفيد ودقيق ومسموح باستخدامه ومتوافق مع وصف الدورة.",en:"Instructors must publish useful, accurate, lawfully usable content consistent with the course description."})}</p>
    <article className="panel legal-card"><h2>{t({fr:"Qualité",ar:"الجودة",en:"Quality"})}</h2><p>{t({fr:"Une formation doit contenir un parcours structuré, des objectifs clairs et des supports cohérents avec le niveau annoncé.",ar:"يجب أن تتضمن الدورة مساراً منظماً وأهدافاً واضحة ومحتوى مناسباً للمستوى المعلن.",en:"A course should contain a structured learning path, clear objectives and materials consistent with the advertised level."})}</p></article>
    <article className="panel legal-card"><h2>{t({fr:"Droits sur les contenus",ar:"حقوق المحتوى",en:"Content rights"})}</h2><p>{t({fr:"Le formateur doit disposer des droits nécessaires sur les vidéos, documents, images et autres contenus publiés.",ar:"يجب أن يمتلك المدرب الحقوق اللازمة للفيديوهات والملفات والصور والمحتوى المنشور.",en:"The instructor must have the necessary rights to videos, documents, images and other published material."})}</p></article>
    <article className="panel legal-card"><h2>{t({fr:"Exactitude commerciale",ar:"دقة العرض التجاري",en:"Commercial accuracy"})}</h2><p>{t({fr:"Le titre, le prix, la durée, les objectifs et les résultats annoncés ne doivent pas induire les étudiants en erreur.",ar:"يجب ألا يضلل العنوان أو السعر أو المدة أو الأهداف أو النتائج المعلنة الطلاب.",en:"The title, price, duration, objectives and advertised outcomes must not mislead students."})}</p></article>
  </div></section>
}
