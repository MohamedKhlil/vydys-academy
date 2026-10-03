"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function FormateurPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [activeSub,setActiveSub]=useState(false);
  const [courses,setCourses]=useState<any[]>([]);
  const [methods,setMethods]=useState<any[]>([]);
  const [sales,setSales]=useState<any[]>([]);
  const [ratings,setRatings]=useState<Record<string,any>>({});
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="instructor";
    setAllowed(ok);
    if(!ok)return;

    const [{data:subs},{data:c},{data:m},{data:s},{data:r}]=await Promise.all([
      supabase.from("trainer_subscriptions").select("id,status,ends_at").eq("instructor_id",user.id).eq("status","active"),
      supabase.from("courses").select("id,slug,title_fr,status,base_price_mru,created_at").eq("instructor_id",user.id).order("created_at",{ascending:false}),
      supabase.from("instructor_payment_methods").select("*").eq("instructor_id",user.id).eq("is_active",true),
      supabase.from("instructor_sales_view").select("*").eq("instructor_id",user.id).order("created_at",{ascending:false}),
      supabase.from("course_rating_summary").select("*")
    ]);

    setActiveSub((subs||[]).some((x:any)=>!x.ends_at||new Date(x.ends_at)>=new Date()));
    setCourses(c||[]);setMethods(m||[]);
    const enriched=await Promise.all((s||[]).map(async(x:any)=>{
      const {data:signed}=x.proof_path?await supabase.storage.from("payment-proofs").createSignedUrl(x.proof_path,3600):{data:null};
      return {...x,proofUrl:signed?.signedUrl};
    }));
    setSales(enriched);
    const rm:Record<string,any>={};(r||[]).forEach((x:any)=>rm[x.course_id]=x);setRatings(rm);
  }

  useEffect(()=>{load()},[]);

  const approved=sales.filter(s=>s.status==="approved");
  const pending=sales.filter(s=>s.status==="pending");
  const grossRevenue=useMemo(()=>approved.reduce((sum,s)=>sum+Number(s.expected_amount_mru||0),0),[sales]);
  const platformFees=useMemo(()=>approved.reduce((sum,s)=>sum+Number(s.platform_fee_mru||0),0),[sales]);

  async function approve(id:string){
    setMessage("");
    const {error}=await supabase.rpc("approve_payment",{p_payment_id:id});
    if(error){setMessage(error.message);return}
    await load();
  }
  async function reject(id:string){
    const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));
    if(reason===null)return;
    const {error}=await supabase.rpc("reject_payment",{p_payment_id:id,p_reason:reason});
    if(error){setMessage(error.message);return}
    await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Espace formateur",ar:"مساحة المدرب",en:"Instructor area"})}</h1><p>{t({fr:"Votre profil n'est pas encore validé comme formateur.",ar:"ملفك لم يُعتمد بعد كمدرب.",en:"Your profile is not yet approved as an instructor."})}</p><Link className="btn" href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"})}</Link></article></div></section>;

  const feeText = platformFees>0 ? t({fr:"Commission Vydys",ar:"عمولة Vydys",en:"Vydys fee"}) + ": " + platformFees.toLocaleString("fr-FR") + " MRU" : "";

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">{t({fr:"Espace formateur",ar:"مساحة المدرب",en:"Instructor dashboard"})}</span><h1>{t({fr:"Pilotez votre activité",ar:"أدر نشاطك",en:"Run your teaching business"})}</h1><p>{t({fr:"Formations, étudiants, ventes, évaluations et revenus au même endroit.",ar:"الدورات والطلاب والمبيعات والتقييمات والإيرادات في مكان واحد.",en:"Courses, students, sales, ratings and revenue in one place."})}</p></div><Link className="btn" href="/formateur/nouvelle-formation">{t({fr:"+ Nouvelle formation",ar:"+ دورة جديدة",en:"+ New course"})}</Link></div>

    <div className="stat-grid">
      <article className="panel stat"><span>{t({fr:"Abonnement Vydys",ar:"اشتراك Vydys",en:"Vydys subscription"})}</span><strong>{activeSub?t({fr:"Actif",ar:"نشط",en:"Active"}):t({fr:"Inactif",ar:"غير نشط",en:"Inactive"})}</strong></article>
      <article className="panel stat"><span>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</span><strong>{courses.length}</strong></article>
      <article className="panel stat"><span>{t({fr:"Paiements à valider",ar:"دفعات للمراجعة",en:"Payments to review"})}</span><strong>{pending.length}</strong></article>
      <article className="panel stat"><span>{t({fr:"Revenus bruts",ar:"الإيرادات الإجمالية",en:"Gross revenue"})}</span><strong>{grossRevenue.toLocaleString("fr-FR")} MRU</strong><small>{feeText}</small></article>
    </div>

    {!activeSub&&<article className="panel subscription-warning"><h2>{t({fr:"Activez votre abonnement formateur",ar:"فعّل اشتراك المدرب",en:"Activate your instructor subscription"})}</h2><p>{t({fr:"Vous pouvez préparer des brouillons, mais un abonnement actif est nécessaire pour soumettre une formation à la publication.",ar:"يمكنك إعداد المسودات، لكن يلزم اشتراك نشط لإرسال دورة للنشر.",en:"You can prepare drafts, but an active subscription is required to submit a course for publication."})}</p><Link className="btn" href="/formateur/abonnement">{t({fr:"Voir les tarifs",ar:"عرض الأسعار",en:"View plans"})}</Link></article>}

    {message&&<p className="manual-note">{message}</p>}

    <article className="panel admin-payments">
      <div className="admin-section-head"><div><span className="tag">{t({fr:"Ventes",ar:"المبيعات",en:"Sales"})}</span><h2>{t({fr:"Paiements étudiants à valider",ar:"مدفوعات الطلاب للمراجعة",en:"Student payments to review"})}</h2></div><p>{t({fr:"Vérifiez la preuve avant d'activer automatiquement l'accès de l'étudiant.",ar:"تحقق من الإثبات قبل تفعيل وصول الطالب تلقائياً.",en:"Check the proof before automatically granting the student access."})}</p></div>
      <div className="payment-review-list">
        {pending.length===0&&<p>{t({fr:"Aucun paiement en attente.",ar:"لا توجد دفعات معلقة.",en:"No pending payments."})}</p>}
        {pending.map(s=><div className="payment-review" key={s.id}>
          {s.proofUrl?<a className="proof-thumb proof-link" href={s.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">—</div>}
          <div className="payment-review-main"><strong>{s.student_name||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</strong><span>{s.course_title_fr||""} · {Number(s.expected_amount_mru).toLocaleString("fr-FR")} MRU · {String(s.payment_method).toUpperCase()}</span><small>{(s.student_phone||"") + (s.transaction_reference?" · Ref: "+s.transaction_reference:"")}</small></div>
          <div className="review-actions"><button className="approve" onClick={()=>approve(s.id)}>{t({fr:"Valider",ar:"قبول",en:"Approve"})}</button><button className="reject" onClick={()=>reject(s.id)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div>
        </div>)}
      </div>
    </article>

    <div className="dash-grid">
      <article className="panel dash-main"><h2>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</h2>
        <div className="table">{courses.length===0?<p>{t({fr:"Aucune formation créée.",ar:"لم تنشئ أي دورة بعد.",en:"No courses created yet."})}</p>:courses.map(c=>{const rs=ratings[c.id];return <div className="tr trainer-course-row" key={c.id}><span><Link className="text-link" href={"/formateur/formation/"+c.id+"/builder"}>{c.title_fr}</Link><small className="course-rating-mini">★ {Number(rs?.average_rating||0).toFixed(1)} ({rs?.review_count||0})</small></span><span>{c.base_price_mru} MRU</span><span className={c.status==="published"?"status":"status pending"}>{c.status}</span></div>})}</div>
      </article>
      <aside className="dash-side"><article className="panel"><h3>{t({fr:"Configuration",ar:"الإعدادات",en:"Setup"})}</h3><div className="quick-actions"><Link href="/formateur/paiements">{t({fr:"Mes moyens de paiement",ar:"وسائل الدفع",en:"Payment methods"})}</Link><Link href="/formateur/marketing">{t({fr:"Coupons & annonces",ar:"القسائم والإعلانات",en:"Coupons & announcements"})}</Link><Link href="/messages">{t({fr:"Messages étudiants",ar:"رسائل الطلاب",en:"Student messages"})}</Link><Link href="/formateur/abonnement">{t({fr:"Mon abonnement",ar:"اشتراكي",en:"My subscription"})}</Link><Link href="/devenir-formateur">{t({fr:"Mon profil public",ar:"ملفي العام",en:"Public profile"})}</Link></div></article></aside>
    </div>

    <article className="panel sales-history"><h2>{t({fr:"Historique des ventes",ar:"سجل المبيعات",en:"Sales history"})}</h2>
      <div className="table">
        <div className="tr sales-head"><span>{t({fr:"Étudiant",ar:"الطالب",en:"Student"})}</span><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><span>{t({fr:"Statut",ar:"الحالة",en:"Status"})}</span></div>
        {sales.map(s=><div className="tr sales-row" key={s.id}><span>{s.student_name||"—"}</span><span>{s.course_title_fr||"—"}</span><span>{Number(s.expected_amount_mru).toLocaleString("fr-FR")} MRU</span><span className={s.status==="approved"?"status":s.status==="pending"?"status pending":"status rejected"}>{s.status}</span></div>)}
      </div>
    </article>
  </div></section>
}
