"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function AdminTarifsPage(){
  const {t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [monthly,setMonthly]=useState("0");
  const [quarterly,setQuarterly]=useState("0");
  const [annual,setAnnual]=useState("0");
  const [commission,setCommission]=useState("0");
  const [grace,setGrace]=useState("0");
  const [requireApproval,setRequireApproval]=useState(true);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const {data:s}=await supabase.from("platform_settings").select("*").eq("id",1).single();
    if(s){setMonthly(String(s.trainer_monthly_price_mru));setQuarterly(String(s.trainer_quarterly_price_mru));setAnnual(String(s.trainer_annual_price_mru));setCommission(String(s.platform_commission_percent));setGrace(String(s.grace_period_days));setRequireApproval(Boolean(s.require_course_approval))}
  })()},[]);

  async function save(){
    const {data:{user}}=await supabase.auth.getUser();
    const {error}=await supabase.from("platform_settings").update({
      trainer_monthly_price_mru:Number(monthly),trainer_quarterly_price_mru:Number(quarterly),trainer_annual_price_mru:Number(annual),
      platform_commission_percent:Number(commission),grace_period_days:Number(grace),require_course_approval:requireApproval,
      updated_by:user?.id||null,updated_at:new Date().toISOString()
    }).eq("id",1);
    setMessage(error?error.message:t({fr:"Paramètres enregistrés.",ar:"تم حفظ الإعدادات.",en:"Settings saved."}));
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès réservé",ar:"دخول مخصص",en:"Restricted access"})}</h1></article></div></section>;

  return <section className="dashboard-shell"><div className="container"><div className="dash-header"><div><span className="eyebrow">{t({fr:"Monétisation plateforme",ar:"إيرادات المنصة",en:"Platform monetization"})}</span><h1>{t({fr:"Tarifs formateurs",ar:"أسعار المدربين",en:"Instructor pricing"})}</h1><p>{t({fr:"Ces valeurs sont modifiables à tout moment sans toucher au code.",ar:"يمكن تعديل هذه القيم في أي وقت دون تغيير الكود.",en:"These values can be changed anytime without touching code."})}</p></div></div>
    <article className="panel trainer-form"><div className="form-grid">
      <label className="form-field"><span>{t({fr:"Mensuel MRU",ar:"شهري بالأوقية",en:"Monthly MRU"})}</span><input type="number" min="0" value={monthly} onChange={e=>setMonthly(e.target.value)}/></label>
      <label className="form-field"><span>{t({fr:"Trimestriel MRU",ar:"ربع سنوي بالأوقية",en:"Quarterly MRU"})}</span><input type="number" min="0" value={quarterly} onChange={e=>setQuarterly(e.target.value)}/></label>
      <label className="form-field"><span>{t({fr:"Annuel MRU",ar:"سنوي بالأوقية",en:"Annual MRU"})}</span><input type="number" min="0" value={annual} onChange={e=>setAnnual(e.target.value)}/></label>
      <label className="form-field"><span>{t({fr:"Commission plateforme %",ar:"عمولة المنصة ٪",en:"Platform commission %"})}</span><input type="number" min="0" max="100" step="0.1" value={commission} onChange={e=>setCommission(e.target.value)}/></label>
      <label className="form-field"><span>{t({fr:"Délai de grâce (jours)",ar:"فترة السماح بالأيام",en:"Grace period (days)"})}</span><input type="number" min="0" value={grace} onChange={e=>setGrace(e.target.value)}/></label>
      <label className="form-field checkbox-field"><input type="checkbox" checked={requireApproval} onChange={e=>setRequireApproval(e.target.checked)}/><span>{t({fr:"Validation Direction obligatoire avant publication",ar:"موافقة الإدارة مطلوبة قبل النشر",en:"Management approval required before publication"})}</span></label>
    </div><button className="btn" onClick={save}>{t({fr:"Enregistrer",ar:"حفظ",en:"Save"})}</button>{message&&<p className="manual-note">{message}</p>}</article>
  </div></section>
}
