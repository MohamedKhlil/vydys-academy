"use client";

import { useLanguage } from "../../components/language-provider";

export default function ClassroomPage(){
  const { t } = useLanguage();
  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">Classroom</span><h1>{t({fr:"Apprenez ensemble, en direct avec votre formateur.",ar:"تعلّم مباشرة مع المدرب ومجموعتك.",en:"Learn together, live with your instructor."})}</h1><p>{t({fr:"Planning, sessions live, devoirs, replays et échanges au même endroit.",ar:"الجدول والحصص المباشرة والواجبات والإعادات في مكان واحد.",en:"Schedule, live sessions, assignments and replays in one place."})}</p></div>
    <div className="class-layout"><article className="panel live-room"><div className="live-room-top"><div><span className="tag live">{t({fr:"PROCHAINE SESSION",ar:"الحصة القادمة",en:"NEXT SESSION"})}</span><h2>{t({fr:"Créer une campagne Meta Ads avec l'IA",ar:"إنشاء حملة Meta Ads بالذكاء الاصطناعي",en:"Create a Meta Ads campaign with AI"})}</h2><p>{t({fr:"Mardi · 19:00 — 20:30 · Promotion Octobre 2026",ar:"الثلاثاء · 19:00 — 20:30 · دفعة أكتوبر 2026",en:"Tuesday · 19:00 — 20:30 · October 2026 cohort"})}</p></div><button className="btn">{t({fr:"Rejoindre la classe",ar:"دخول الفصل",en:"Join class"})}</button></div><div className="video-placeholder"><span>▶</span><p>{t({fr:"La salle vidéo sera disponible au début du cours",ar:"ستصبح قاعة الفيديو متاحة عند بدء الحصة",en:"The video room will open when class starts"})}</p></div></article>
    <aside className="class-side"><article className="panel"><h3>{t({fr:"Votre promotion",ar:"دفعتك",en:"Your cohort"})}</h3><p><b>Marketing Digital & IA</b></p><p>{t({fr:"Promotion Octobre 2026",ar:"دفعة أكتوبر 2026",en:"October 2026 cohort"})}</p><div className="members"><span>AM</span><span>FS</span><span>MB</span><span>+21</span></div></article><article className="panel"><h3>{t({fr:"Devoir à rendre",ar:"واجب مطلوب",en:"Assignment due"})}</h3><p>{t({fr:"Créer 3 publicités avec ChatGPT.",ar:"إنشاء 3 إعلانات باستخدام ChatGPT.",en:"Create 3 ads with ChatGPT."})}</p><small>{t({fr:"Échéance : dimanche",ar:"آخر أجل: الأحد",en:"Due: Sunday"})}</small><button className="btn btn-ghost full">{t({fr:"Déposer mon devoir",ar:"رفع الواجب",en:"Submit assignment"})}</button></article></aside></div>
  </div></section>
}
