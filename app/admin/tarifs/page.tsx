"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminTarifsPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [currencies,setCurrencies]=useState<any[]>([]);
  const [monthly,setMonthly]=useState("0");
  const [quarterly,setQuarterly]=useState("0");
  const [annual,setAnnual]=useState("0");
  const [subscriptionCurrency,setSubscriptionCurrency]=useState("MRU");
  const [launchEnabled,setLaunchEnabled]=useState(true);
  const [launchAmount,setLaunchAmount]=useState("1");
  const [launchCurrency,setLaunchCurrency]=useState("USD");
  const [launchLocalMru,setLaunchLocalMru]=useState("0");
  const [grace,setGrace]=useState("0");
  const [requireApproval,setRequireApproval]=useState(true);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const [{data:s},{data:c}]=await Promise.all([
      supabase.from("platform_settings").select("*").eq("id",1).single(),
      supabase.from("currency_catalog").select("code,name,symbol").eq("enabled",true).order("code")
    ]);
    setCurrencies(c||[]);
    if(s){
      setMonthly(String(s.trainer_monthly_price??s.trainer_monthly_price_mru??0));
      setQuarterly(String(s.trainer_quarterly_price??s.trainer_quarterly_price_mru??0));
      setAnnual(String(s.trainer_annual_price??s.trainer_annual_price_mru??0));
      setSubscriptionCurrency(s.trainer_subscription_currency||"MRU");
      setLaunchEnabled(Boolean(s.course_launch_fee_enabled));
      setLaunchAmount(String(s.course_launch_fee_amount??1));
      setLaunchCurrency(s.course_launch_fee_currency||"USD");
      setLaunchLocalMru(String(s.course_launch_fee_local_mru??0));
      setGrace(String(s.grace_period_days||0));
      setRequireApproval(Boolean(s.require_course_approval));
    }
  })()},[]);

  async function save(){
    const {data:{user}}=await supabase.auth.getUser();
    const payload:any={
      trainer_monthly_price:Number(monthly)||0,
      trainer_quarterly_price:Number(quarterly)||0,
      trainer_annual_price:Number(annual)||0,
      trainer_subscription_currency:subscriptionCurrency,
      course_launch_fee_enabled:launchEnabled,
      course_launch_fee_amount:Number(launchAmount)||0,
      course_launch_fee_currency:launchCurrency,
      course_launch_fee_local_mru:Number(launchLocalMru)||0,
      platform_commission_percent:0,
      grace_period_days:Number(grace)||0,
      require_course_approval:requireApproval,
      updated_by:user?.id||null,updated_at:new Date().toISOString()
    };
    if(subscriptionCurrency==="MRU"){
      payload.trainer_monthly_price_mru=Math.round(Number(monthly)||0);
      payload.trainer_quarterly_price_mru=Math.round(Number(quarterly)||0);
      payload.trainer_annual_price_mru=Math.round(Number(annual)||0);
    }
    const {error}=await supabase.from("platform_settings").update(payload).eq("id",1);
    setMessage(error?error.message:t({fr:"Paramètres financiers enregistrés.",ar:"تم حفظ الإعدادات المالية.",en:"Financial settings saved."}));
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Finance Control</span><h1>{t({fr:"Tarifs & monétisation",ar:"الأسعار وتحقيق الدخل",en:"Pricing & monetization"})}</h1><p>{t({fr:"Vydys ne prend aucune commission sur les ventes des formateurs. Les revenus plateforme viennent des abonnements et frais de lancement.",ar:"لا تأخذ Vydys أي عمولة من مبيعات المدربين. إيرادات المنصة تأتي من الاشتراكات ورسوم إطلاق الدورات.",en:"Vydys takes no commission on instructor sales. Platform revenue comes from subscriptions and course launch fees."})}</p></div></div>

    <div className="finance-zero-commission panel"><span>0%</span><div><strong>{t({fr:"Commission sur les ventes",ar:"عمولة المبيعات",en:"Sales commission"})}</strong><p>{t({fr:"L’étudiant paie directement le formateur.",ar:"يدفع الطالب مباشرة للمدرب.",en:"Students pay instructors directly."})}</p></div></div>

    <div className="finance-settings-grid">
      <article className="panel trainer-form"><span className="eyebrow">{t({fr:"Abonnement formateur",ar:"اشتراك المدرب",en:"Instructor subscription"})}</span><h2>{t({fr:"Tarifs d’accès professionnel",ar:"أسعار الوصول المهني",en:"Professional access pricing"})}</h2>
        <label className="form-field"><span>{t({fr:"Devise",ar:"العملة",en:"Currency"})}</span><select value={subscriptionCurrency} onChange={e=>setSubscriptionCurrency(e.target.value)}>{currencies.map(c=><option value={c.code} key={c.code}>{c.code} · {c.name}</option>)}</select></label>
        <div className="form-grid">
          <label className="form-field"><span>{t({fr:"Mensuel",ar:"شهري",en:"Monthly"})}</span><input type="number" min="0" step="0.01" value={monthly} onChange={e=>setMonthly(e.target.value)}/></label>
          <label className="form-field"><span>{t({fr:"Trimestriel",ar:"ربع سنوي",en:"Quarterly"})}</span><input type="number" min="0" step="0.01" value={quarterly} onChange={e=>setQuarterly(e.target.value)}/></label>
          <label className="form-field"><span>{t({fr:"Annuel",ar:"سنوي",en:"Annual"})}</span><input type="number" min="0" step="0.01" value={annual} onChange={e=>setAnnual(e.target.value)}/></label>
        </div>
      </article>

      <article className="panel trainer-form"><span className="eyebrow">{t({fr:"Frais de lancement",ar:"رسوم إطلاق الدورة",en:"Course launch fee"})}</span><h2>{t({fr:"Paiement par nouvelle formation",ar:"الدفع لكل دورة جديدة",en:"Fee per new course"})}</h2>
        <label className="checkbox-line"><input type="checkbox" checked={launchEnabled} onChange={e=>setLaunchEnabled(e.target.checked)}/>{t({fr:"Activer le frais de lancement",ar:"تفعيل رسوم الإطلاق",en:"Enable launch fee"})}</label>
        <div className="form-grid">
          <label className="form-field"><span>{t({fr:"Montant international",ar:"المبلغ الدولي",en:"International amount"})}</span><input type="number" min="0" step="0.01" value={launchAmount} onChange={e=>setLaunchAmount(e.target.value)}/></label>
          <label className="form-field"><span>{t({fr:"Devise internationale",ar:"العملة الدولية",en:"International currency"})}</span><select value={launchCurrency} onChange={e=>setLaunchCurrency(e.target.value)}>{currencies.map(c=><option value={c.code} key={c.code}>{c.code}</option>)}</select></label>
          <label className="form-field full-row"><span>{t({fr:"Équivalent manuel MRU pour Bankily / Masrvi / Sedad / Click",ar:"المعادل اليدوي بالأوقية لـ Bankily / Masrvi / Sedad / Click",en:"Manual MRU equivalent for Bankily / Masrvi / Sedad / Click"})}</span><input type="number" min="0" step="0.01" value={launchLocalMru} onChange={e=>setLaunchLocalMru(e.target.value)}/><small>{t({fr:"À définir par l’Admin. Aucun taux de change n’est inventé automatiquement.",ar:"يحدده المسؤول. لا يتم افتراض سعر صرف تلقائياً.",en:"Set by Admin. Vydys does not invent an exchange rate."})}</small></label>
        </div>
        <div className="launch-fee-preview"><span>{t({fr:"Référence internationale",ar:"المرجع الدولي",en:"International reference"})}</span><strong>{Number(launchAmount||0).toLocaleString()} {launchCurrency}</strong><small>{launchEnabled?t({fr:"Après approbation du cours",ar:"بعد اعتماد الدورة",en:"After course approval"}):t({fr:"Désactivé",ar:"معطل",en:"Disabled"})}</small></div>
      </article>
    </div>

    <article className="panel trainer-form admin-policy-card"><h2>{t({fr:"Règles plateforme",ar:"قواعد المنصة",en:"Platform rules"})}</h2><div className="form-grid">
      <label className="form-field"><span>{t({fr:"Délai de grâce abonnement (jours)",ar:"فترة سماح الاشتراك (أيام)",en:"Subscription grace period (days)"})}</span><input type="number" min="0" value={grace} onChange={e=>setGrace(e.target.value)}/></label>
      <label className="form-field checkbox-field"><input type="checkbox" checked={requireApproval} onChange={e=>setRequireApproval(e.target.checked)}/><span>{t({fr:"Validation Direction obligatoire avant publication",ar:"موافقة الإدارة مطلوبة قبل النشر",en:"Management approval required before publication"})}</span></label>
    </div><button className="btn" onClick={save}>{t({fr:"Enregistrer les paramètres",ar:"حفظ الإعدادات",en:"Save settings"})}</button>{message&&<p className="manual-note">{message}</p>}</article>
  </div></section>
}
