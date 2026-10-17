"use client";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";

type EventRow={name:string;events:number;visitors:number;signed_in:number};
type Report={period_days:number;events:EventRow[];anonymous_visitors_website:number;tracked_from:string|null};
const steps=[
 ["signup_started",{fr:"Inscription démarrée",ar:"بدء التسجيل",en:"Registration started"}],
 ["course_viewed",{fr:"Formation consultée",ar:"عرض الدورة",en:"Course viewed"}],
 ["course_checkout_started",{fr:"Paiement commencé",ar:"بدء الدفع",en:"Checkout started"}],
 ["course_order_submitted",{fr:"Commande soumise",ar:"طلب دفع مرسل",en:"Order submitted"}],
 ["portfolio_opened",{fr:"Éditeur CV ouvert",ar:"فتح السيرة الذاتية",en:"CV editor opened"}],
 ["portfolio_saved",{fr:"Profil CV enregistré",ar:"حفظ السيرة الذاتية",en:"CV profile saved"}],
 ["talent_opt_in",{fr:"CV proposé à l'annuaire",ar:"عرض السيرة في الدليل",en:"CV opted into directory"}],
 ["talents_viewed",{fr:"Annuaire consulté",ar:"زيارة دليل المواهب",en:"Talent directory visited"}],
 ["jobs_viewed",{fr:"Offres consultées",ar:"زيارة الوظائف",en:"Jobs visited"}],
 ["job_application_submitted",{fr:"Candidature envoyée",ar:"إرسال طلب عمل",en:"Job application sent"}],
 ["talent_contact_requested",{fr:"Contact recruteur demandé",ar:"طلب تواصل مع موهبة",en:"Talent contact requested"}],
 ["company_application_submitted",{fr:"Entreprise inscrite",ar:"تسجيل شركة",en:"Employer registered"}]
] as const;

export default function AdminActivationFunnel(){
 const {t,lang}=useLanguage();
 const [days,setDays]=useState<7|30|90>(30);
 const [report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;setLoading(true);setError("");
  (async()=>{
   const {data,error:e}=await supabase.rpc("vydys_admin_activation_funnel",{p_days:days});
   if(!active)return;
   if(e)setError(e.message);
   else setReport(data as Report);
   setLoading(false);
  })();
  return()=>{active=false};
 },[days]);
 const rows=useMemo(()=>new Map((report?.events||[]).map(e=>[e.name,e])),[report]);
 const locale=lang==="ar"?"ar-MR":lang==="en"?"en-GB":"fr-FR";
 return <section id="activation-funnel" className="panel career-funnel">
   <div className="career-workspace-head"><div><span className="eyebrow">VYDYS / GROWTH</span><h2>{t({fr:"Parcours de conversion",ar:"مسار تحويل الزوار",en:"Activation journey"})}</h2>
     <p>{t({fr:"Actions réellement enregistrées sur Vydys : visites, inscription, formation, CV et recrutement.",ar:"الأنشطة الفعلية المسجلة: الزيارات والتسجيل والدورات والسير الذاتية والتوظيف.",en:"Recorded actions across sign-up, learning, CVs and careers."})}</p>
   </div><div className="career-period-pick" role="group" aria-label={t({fr:"Période",ar:"الفترة",en:"Period"})}>
     {([7,30,90] as const).map(n=><button key={n} type="button" aria-pressed={days===n} onClick={()=>setDays(n)}>{n}j</button>)}
   </div></div>
   {loading&&<p role="status">{t({fr:"Chargement…",ar:"جار التحميل...",en:"Loading…" })}</p>}
   {error&&<p role="alert" className="career-form-error">{error}</p>}
   {!loading&&!error&&report&&<>
    <div className="career-funnel-traffic"><strong>{Number(report.anonymous_visitors_website||0).toLocaleString(locale)}</strong><span>{t({fr:"navigateurs distincts comptabilisés sur la période",ar:"متصفحات فريدة خلال الفترة",en:"distinct browsers recorded in the period"})}</span></div>
    <div className="career-funnel-grid">{steps.map(([key,label])=>{
      const r=rows.get(key);return <div className="career-funnel-stat" key={key}>
        <strong>{Number(r?.visitors||0).toLocaleString(locale)}</strong>
        <span>{t(label)}</span>
        <small>{Number(r?.events||0).toLocaleString(locale)} {t({fr:"événements",ar:"أحداث",en:"events"})}</small>
      </div>
    })}</div>
    <p className="career-muted">{t({
      fr:"Chaque case indique des navigateurs distincts ayant réalisé cette action. Ce sont des totaux indépendants, pas un taux de conversion entre étapes. Les visites anonymes et les comptes connectés peuvent partager un même navigateur.",
      ar:"يظهر كل مربع عدد المتصفحات الفريدة التي قامت بذلك الإجراء. هذه أرقام منفصلة وليست نسب تحويل بين المراحل.",
      en:"Each tile counts distinct browsers for its event. Totals are independent, not step-to-step conversion rates; anonymous and signed-in activity may share a browser."
    })}</p>
    {report.tracked_from&&<small>{t({fr:"Première mesure : ",ar:"أول تسجيل: ",en:"First event recorded: "})}{new Date(report.tracked_from).toLocaleDateString(locale)}</small>}
   </>}
 </section>;
}
