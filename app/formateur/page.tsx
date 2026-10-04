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
  const [classrooms,setClassrooms]=useState<any[]>([]);
  const [methods,setMethods]=useState<any[]>([]);
  const [sales,setSales]=useState<any[]>([]);
  const [ratings,setRatings]=useState<Record<string,any>>({});
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="instructor";setAllowed(ok);if(!ok)return;

    const [{data:subs},{data:c},{data:rooms},{data:m},{data:legacy},{data:orders},{data:r}]=await Promise.all([
      supabase.from("trainer_subscriptions").select("id,status,ends_at").eq("instructor_id",user.id).eq("status","active"),
      supabase.from("courses").select("id,slug,title_fr,status,base_price_mru,base_price_amount,base_currency,launch_fee_status,created_at").eq("instructor_id",user.id).order("created_at",{ascending:false}),
      supabase.from("classrooms").select("id,slug,title_fr,status,start_date,session_count,capacity,base_price_amount,base_currency").eq("instructor_id",user.id).order("created_at",{ascending:false}),
      supabase.from("instructor_payment_methods").select("*").eq("instructor_id",user.id).eq("is_active",true),
      supabase.from("instructor_sales_view").select("*").eq("instructor_id",user.id).order("created_at",{ascending:false}),
      supabase.from("course_orders").select("id,user_id,course_id,payment_mode,provider_code,amount,currency,status,transaction_reference,proof_path,created_at,paid_at,courses:course_id(title_fr)").eq("instructor_id",user.id).order("created_at",{ascending:false}),
      supabase.from("course_rating_summary").select("*")
    ]);

    setActiveSub((subs||[]).some((x:any)=>!x.ends_at||new Date(x.ends_at)>=new Date()));
    setCourses(c||[]);setClassrooms(rooms||[]);setMethods(m||[]);

    const newOrders=orders||[];
    const userIds=[...new Set(newOrders.map((x:any)=>x.user_id).filter(Boolean))];
    const profileMap:Record<string,any>={};
    if(userIds.length){
      const {data:ps}=await supabase.from("profiles").select("id,full_name,phone").in("id",userIds);
      (ps||[]).forEach((x:any)=>profileMap[x.id]=x);
    }
    const modern=await Promise.all(newOrders.map(async(x:any)=>{
      const {data:signed}=x.proof_path?await supabase.storage.from("payment-proofs").createSignedUrl(x.proof_path,3600):{data:null};
      return {
        id:x.id,source:"order",student_name:profileMap[x.user_id]?.full_name||null,student_phone:profileMap[x.user_id]?.phone||null,
        course_title_fr:x.courses?.title_fr||"",amount:Number(x.amount||0),currency:x.currency,
        payment_method:x.provider_code,payment_mode:x.payment_mode,status:x.status,
        transaction_reference:x.transaction_reference,proofUrl:signed?.signedUrl,created_at:x.created_at
      };
    }));
    const old=await Promise.all((legacy||[]).map(async(x:any)=>{
      const {data:signed}=x.proof_path?await supabase.storage.from("payment-proofs").createSignedUrl(x.proof_path,3600):{data:null};
      return {...x,source:"legacy",amount:Number(x.expected_amount_mru||0),currency:"MRU",payment_mode:"manual",proofUrl:signed?.signedUrl};
    }));
    setSales([...modern,...old].sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()));
    const rm:Record<string,any>={};(r||[]).forEach((x:any)=>rm[x.course_id]=x);setRatings(rm);
  }

  useEffect(()=>{load()},[]);

  const pending=sales.filter(s=>(s.source==="order"&&s.status==="proof_submitted")||(s.source==="legacy"&&s.status==="pending"));
  const paid=sales.filter(s=>(s.source==="order"&&s.status==="paid")||(s.source==="legacy"&&s.status==="approved"));
  const revenueByCurrency=useMemo(()=>{
    const out:Record<string,number>={};
    paid.forEach(s=>out[s.currency]=(out[s.currency]||0)+Number(s.amount||0));
    return out;
  },[sales]);
  const revenueText=Object.entries(revenueByCurrency).map(([cur,amount])=>Number(amount).toLocaleString("fr-FR")+" "+cur).join(" · ")||"0";

  async function approve(s:any){
    setMessage("");
    const rpc=s.source==="order"?"approve_manual_course_order":"approve_payment";
    const args=s.source==="order"?{p_order_id:s.id}:{p_payment_id:s.id};
    const {error}=await supabase.rpc(rpc,args);
    if(error){setMessage(error.message);return}await load();
  }
  async function reject(s:any){
    const reason=window.prompt(t({fr:"Motif du refus",ar:"سبب الرفض",en:"Reason for rejection"}));
    if(reason===null)return;
    const rpc=s.source==="order"?"reject_manual_course_order":"reject_payment";
    const args=s.source==="order"?{p_order_id:s.id,p_reason:reason}:{p_payment_id:s.id,p_reason:reason};
    const {error}=await supabase.rpc(rpc,args);
    if(error){setMessage(error.message);return}await load();
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Espace formateur",ar:"مساحة المدرب",en:"Instructor area"})}</h1><p>{t({fr:"Votre profil n'est pas encore validé comme formateur.",ar:"ملفك لم يُعتمد بعد كمدرب.",en:"Your profile is not yet approved as an instructor."})}</p><Link className="btn" href="/devenir-formateur">{t({fr:"Devenir formateur",ar:"كن مدرباً",en:"Become an instructor"})}</Link></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Studio</span><h1>{t({fr:"Pilotez votre activité internationale",ar:"أدر نشاطك الدولي",en:"Run your international teaching business"})}</h1><p>{t({fr:"Ventes directes, formations, Classrooms live et revenus multi-devises.",ar:"مبيعات مباشرة ودورات وفصول مباشرة وإيرادات متعددة العملات.",en:"Direct sales, courses, live Classrooms and multi-currency revenue."})}</p></div><div className="builder-head-actions"><Link className="btn btn-ghost" href="/formateur/classrooms/new">+ Classroom</Link><Link className="btn" href="/formateur/nouvelle-formation">{t({fr:"+ Nouvelle formation",ar:"+ دورة جديدة",en:"+ New course"})}</Link></div></div>

    <div className="stat-grid">
      <article className="panel stat"><span>{t({fr:"Abonnement Vydys",ar:"اشتراك Vydys",en:"Vydys subscription"})}</span><strong>{activeSub?t({fr:"Actif",ar:"نشط",en:"Active"}):t({fr:"Inactif",ar:"غير نشط",en:"Inactive"})}</strong></article>
      <article className="panel stat"><span>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</span><strong>{courses.length}</strong></article>
      <article className="panel stat"><span>Classrooms Live</span><strong>{classrooms.length}</strong><small>{classrooms.filter(r=>r.status==="published").length} {t({fr:"publiées",ar:"منشورة",en:"published"})}</small></article>
      <article className="panel stat"><span>{t({fr:"Paiements manuels à valider",ar:"دفعات يدوية للمراجعة",en:"Manual payments to review"})}</span><strong>{pending.length}</strong></article>
      <article className="panel stat"><span>{t({fr:"Revenus reçus",ar:"الإيرادات المستلمة",en:"Received revenue"})}</span><strong className="multi-currency-stat">{revenueText}</strong><small>0% Vydys commission</small></article>
    </div>

    {!activeSub&&<article className="panel subscription-warning"><div><h2>{t({fr:"Activez votre abonnement formateur",ar:"فعّل اشتراك المدرب",en:"Activate your instructor subscription"})}</h2><p>{t({fr:"Vous pouvez préparer des brouillons, mais un abonnement actif est nécessaire pour soumettre une formation.",ar:"يمكنك إعداد المسودات، لكن يلزم اشتراك نشط لإرسال دورة.",en:"You can prepare drafts, but an active subscription is required to submit a course."})}</p></div><Link className="btn" href="/formateur/abonnement">{t({fr:"Voir les tarifs",ar:"عرض الأسعار",en:"View plans"})}</Link></article>}

    {message&&<p className="manual-note">{message}</p>}

    <article className="panel admin-payments">
      <div className="admin-section-head"><div><span className="tag">{t({fr:"Ventes directes",ar:"المبيعات المباشرة",en:"Direct sales"})}</span><h2>{t({fr:"Paiements manuels à valider",ar:"المدفوعات اليدوية للمراجعة",en:"Manual payments to review"})}</h2></div><p>{t({fr:"Les paiements Stripe/PayPal confirmés automatiquement n’apparaissent pas ici.",ar:"مدفوعات Stripe/PayPal المؤكدة تلقائياً لا تظهر هنا.",en:"Automatically confirmed Stripe/PayPal payments do not appear here."})}</p></div>
      <div className="payment-review-list">
        {pending.length===0&&<p>{t({fr:"Aucun paiement manuel en attente.",ar:"لا توجد دفعات يدوية معلقة.",en:"No manual payment pending."})}</p>}
        {pending.map(s=><div className="payment-review" key={s.source+"-"+s.id}>
          {s.proofUrl?<a className="proof-thumb proof-link" href={s.proofUrl} target="_blank" rel="noreferrer">IMG</a>:<div className="proof-thumb">—</div>}
          <div className="payment-review-main"><strong>{s.student_name||t({fr:"Étudiant",ar:"طالب",en:"Student"})}</strong><span>{s.course_title_fr||""} · {Number(s.amount).toLocaleString("fr-FR")} {s.currency} · {String(s.payment_method).toUpperCase()}</span><small>{(s.student_phone||"")+(s.transaction_reference?" · Ref: "+s.transaction_reference:"")}</small></div>
          <div className="review-actions"><button className="approve" onClick={()=>approve(s)}>{t({fr:"Valider",ar:"قبول",en:"Approve"})}</button><button className="reject" onClick={()=>reject(s)}>{t({fr:"Refuser",ar:"رفض",en:"Reject"})}</button></div>
        </div>)}
      </div>
    </article>

    <div className="dash-grid">
      <article className="panel dash-main"><h2>{t({fr:"Mes formations",ar:"دوراتي",en:"My courses"})}</h2>
        <div className="table">{courses.length===0?<p>{t({fr:"Aucune formation créée.",ar:"لم تنشئ أي دورة بعد.",en:"No courses created yet."})}</p>:courses.map(c=>{const rs=ratings[c.id];const amount=Number(c.base_price_amount??c.base_price_mru);const cur=c.base_currency||"MRU";return <div className="tr trainer-course-row" key={c.id}><span><Link className="text-link" href={"/formateur/formation/"+c.id+"/builder"}>{c.title_fr}</Link><small className="course-rating-mini">★ {Number(rs?.average_rating||0).toFixed(1)} ({rs?.review_count||0})</small></span><span>{amount.toLocaleString("fr-FR")} {cur}</span><span className={c.status==="published"?"status":"status pending"}>{c.status}{c.status==="approved_pending_fee"&&<Link className="launch-fee-link" href={"/formateur/formation/"+c.id+"/launch"}>{t({fr:"Payer lancement",ar:"دفع الإطلاق",en:"Pay launch fee"})}</Link>}</span></div>})}</div>
      </article>
      <aside className="dash-side"><article className="panel"><h3>{t({fr:"Configuration",ar:"الإعدادات",en:"Setup"})}</h3><div className="quick-actions"><Link href="/formateur/copilote">✨ {t({fr:"Copilote IA",ar:"المساعد الذكي",en:"AI Copilot"})}</Link><Link href="/formateur/classrooms">◉ {t({fr:"Mes Classrooms",ar:"فصولي",en:"My Classrooms"})}</Link><Link href="/formateur/projets">⌘ {t({fr:"Projets étudiants",ar:"مشاريع الطلاب",en:"Student projects"})}</Link><Link href="/formateur/paiements">💳 {t({fr:"Mes moyens de paiement",ar:"وسائل الدفع",en:"Payment methods"})}</Link><Link href="/formateur/marketing">{t({fr:"Coupons & annonces",ar:"القسائم والإعلانات",en:"Coupons & announcements"})}</Link><Link href="/messages">{t({fr:"Messages étudiants",ar:"رسائل الطلاب",en:"Student messages"})}</Link><Link href="/formateur/abonnement">{t({fr:"Mon abonnement",ar:"اشتراكي",en:"My subscription"})}</Link><Link href="/devenir-formateur">{t({fr:"Mon profil public",ar:"ملفي العام",en:"Public profile"})}</Link></div></article></aside>
    </div>

    <article className="panel sales-history"><h2>{t({fr:"Historique des ventes",ar:"سجل المبيعات",en:"Sales history"})}</h2>
      <div className="table">
        <div className="tr sales-head"><span>{t({fr:"Étudiant",ar:"الطالب",en:"Student"})}</span><span>{t({fr:"Formation",ar:"الدورة",en:"Course"})}</span><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><span>{t({fr:"Statut",ar:"الحالة",en:"Status"})}</span></div>
        {sales.map(s=><div className="tr sales-row" key={s.source+"-"+s.id}><span>{s.student_name||"—"}</span><span>{s.course_title_fr||"—"}</span><span>{Number(s.amount).toLocaleString("fr-FR")} {s.currency}</span><span className={(s.status==="paid"||s.status==="approved")?"status":(s.status==="proof_submitted"||s.status==="pending")?"status pending":"status rejected"}>{s.status}</span></div>)}
      </div>
    </article>
  </div></section>
}
