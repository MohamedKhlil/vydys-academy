"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

type Method = "click" | "bankily" | "sedad" | "masrvi";
const BASE_PRICE=1500, CLICK_DISCOUNT=.10, PAYMENT_NUMBER="34540455";
const COURSE_ID="a338b86f-39ff-4448-a611-f8a9e1d02909";

export default function PaiementPage(){
  const {t}=useLanguage();
  const [method,setMethod]=useState<Method>("click");
  const [proof,setProof]=useState<File|null>(null);
  const [fullName,setFullName]=useState("");
  const [phone,setPhone]=useState("");
  const [reference,setReference]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const amount=useMemo(()=>method==="click"?Math.round(BASE_PRICE*(1-CLICK_DISCOUNT)):BASE_PRICE,[method]);
  const labels:Record<Method,string>={click:"Click",bankily:"Bankily",sedad:"Sedad",masrvi:"Masrvi"};

  async function submit(e:FormEvent){
    e.preventDefault(); setMessage("");
    if(!proof){setMessage(t({fr:"Ajoutez une capture d'écran de paiement.",ar:"أضف لقطة شاشة للدفع.",en:"Please add a payment screenshot."}));return}
    setLoading(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){window.location.href="/connexion";return}
      const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const path=`${user.id}/${crypto.randomUUID()}-${safe}`;
      const up=await supabase.storage.from("payment-proofs").upload(path,proof,{contentType:proof.type,upsert:false});
      if(up.error) throw up.error;
      const ins=await supabase.rpc("submit_platform_course_payment",{
        p_course_id:COURSE_ID,
        p_payment_method:method,
        p_transaction_reference:reference,
        p_proof_path:path
      });
      if(ins.error) throw ins.error;
      const profileUpdate=await supabase.rpc("update_my_profile",{p_full_name:fullName,p_phone:phone});
      if(profileUpdate.error) throw profileUpdate.error;
      setMessage(t({fr:"Preuve envoyée. Votre paiement est maintenant en attente de validation par la Direction.",ar:"تم إرسال الإثبات. الدفع الآن قيد مراجعة الإدارة.",en:"Proof submitted. Your payment is now pending Management approval."}));
      setProof(null); setReference("");
    }catch(err){setMessage(err instanceof Error?err.message:"Erreur")}finally{setLoading(false)}
  }

  return <section className="section page-top payment-page"><div className="container payment-layout"><div>
    <span className="eyebrow">{t({fr:"Inscription",ar:"التسجيل",en:"Enrollment"})}</span>
    <h1 className="payment-title">{t({fr:"Finalisez votre inscription",ar:"أكمل تسجيلك",en:"Complete your enrollment"})}</h1>
    <p className="payment-intro">{t({fr:"Choisissez votre moyen de paiement, effectuez le transfert puis envoyez une capture d'écran. La Direction vérifiera manuellement le paiement.",ar:"اختر وسيلة الدفع ثم أرسل لقطة شاشة بعد التحويل. ستقوم الإدارة بالتحقق يدوياً.",en:"Choose your payment method, make the transfer, then upload a screenshot. Management will verify it manually."})}</p>

    <div className="payment-methods four">
      {(["click","bankily","sedad","masrvi"] as Method[]).map(m=><button key={m} className={method===m?"payment-option selected":"payment-option"} onClick={()=>setMethod(m)}><div><strong>{labels[m]}</strong><span>{m==="click"?t({fr:"10 % de réduction",ar:"خصم 10٪",en:"10% discount"}):t({fr:"Tarif standard",ar:"السعر العادي",en:"Standard price"})}</span></div><b>{m==="click"?"1 350":"1 500"} MRU</b></button>)}
    </div>

    <article className="panel payment-instructions"><span className="tag">{t({fr:"Étape 1",ar:"الخطوة 1",en:"Step 1"})}</span><h2>{t({fr:"Effectuez le paiement",ar:"قم بالدفع",en:"Make the payment"})}</h2>
      <p>{t({fr:`Envoyez exactement ${amount.toLocaleString("fr-FR")} MRU via ${labels[method]} au numéro suivant :`,ar:`أرسل بالضبط ${amount.toLocaleString("fr-FR")} أوقية عبر ${labels[method]} إلى الرقم التالي:`,en:`Send exactly ${amount.toLocaleString("fr-FR")} MRU via ${labels[method]} to this number:`})}</p>
      <div className="pay-number"><span>{labels[method]}</span><strong>{PAYMENT_NUMBER}</strong></div>
      <div className="amount-box"><span>{t({fr:"Montant à payer",ar:"المبلغ المطلوب",en:"Amount to pay"})}</span><strong>{amount.toLocaleString("fr-FR")} MRU</strong>{method==="click"&&<small>{t({fr:"Économie : 150 MRU",ar:"التوفير: 150 أوقية",en:"You save: 150 MRU"})}</small>}</div>
    </article>

    <form className="panel proof-panel" onSubmit={submit}><span className="tag">{t({fr:"Étape 2",ar:"الخطوة 2",en:"Step 2"})}</span><h2>{t({fr:"Envoyez votre preuve de paiement",ar:"أرسل إثبات الدفع",en:"Upload your payment proof"})}</h2>
      <p>{t({fr:"La capture doit montrer le montant payé, le numéro 34540455 et la confirmation de transaction.",ar:"يجب أن تظهر الصورة المبلغ المدفوع والرقم 34540455 وتأكيد العملية.",en:"The screenshot must show the amount paid, number 34540455 and transaction confirmation."})}</p>
      <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)} required/><span>↑</span><strong>{proof?.name||t({fr:"Choisir une capture d'écran",ar:"اختر لقطة شاشة",en:"Choose a screenshot"})}</strong><small>PNG, JPG, WEBP · 5 MB max</small></label>
      <label className="form-field"><span>{t({fr:"Nom complet",ar:"الاسم الكامل",en:"Full name"})}</span><input value={fullName} onChange={e=>setFullName(e.target.value)} required/></label>
      <label className="form-field"><span>{t({fr:"Téléphone",ar:"رقم الهاتف",en:"Phone number"})}</span><input value={phone} onChange={e=>setPhone(e.target.value)} required inputMode="tel"/></label>
      <label className="form-field"><span>{t({fr:"Référence de transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)} placeholder={t({fr:"Si disponible",ar:"إن وجد",en:"If available"})}/></label>
      <button className="btn full" disabled={loading}>{loading?"...":t({fr:"Envoyer pour validation",ar:"إرسال للمراجعة",en:"Submit for approval"})}</button>
      {message&&<p className="manual-note">{message}</p>}
    </form>
  </div><aside className="panel payment-summary"><span className="tag">{t({fr:"Votre commande",ar:"طلبك",en:"Your order"})}</span><h3>Marketing Digital & IA</h3>
    <div className="summary-row"><span>{t({fr:"Prix formation",ar:"سعر الدورة",en:"Course price"})}</span><strong>1 500 MRU</strong></div>
    {method==="click"&&<div className="summary-row discount"><span>{t({fr:"Réduction Click -10 %",ar:"خصم Click -10٪",en:"Click discount -10%"})}</span><strong>-150 MRU</strong></div>}
    <div className="summary-row"><span>{t({fr:"Moyen",ar:"وسيلة الدفع",en:"Method"})}</span><strong>{labels[method]}</strong></div><div className="summary-row"><span>{t({fr:"Numéro",ar:"الرقم",en:"Number"})}</span><strong>{PAYMENT_NUMBER}</strong></div>
    <div className="summary-total"><span>{t({fr:"Total",ar:"الإجمالي",en:"Total"})}</span><strong>{amount.toLocaleString("fr-FR")} MRU</strong></div>
    <div className="pending-card"><span>⏳</span><div><strong>{t({fr:"Validation manuelle",ar:"مراجعة يدوية",en:"Manual approval"})}</strong><p>{t({fr:"Par la Direction Vydys Academy",ar:"من طرف إدارة Vydys Academy",en:"By Vydys Academy Management"})}</p></div></div>
  </aside></div></section>
}
