"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../../components/language-provider";
import { supabase } from "../../../../../lib/supabase";

type Method="click"|"bankily"|"sedad"|"masrvi"|"payoneer";

export default function ClassroomLaunchPage(){
  const {id}=useParams<{id:string}>();
  const {t}=useLanguage();
  const [room,setRoom]=useState<any>(null);
  const [settings,setSettings]=useState<any>(null);
  const [order,setOrder]=useState<any>(null);
  const [autoMethods,setAutoMethods]=useState<any[]>([]);
  const [payoneer,setPayoneer]=useState<any>(null);
  const [method,setMethod]=useState<Method>("bankily");
  const [reference,setReference]=useState("");
  const [proof,setProof]=useState<File|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const [{data:r},{data:s},{data:o},{data:auto},{data:p}]=await Promise.all([
      supabase.from("classrooms").select("id,title_fr,status,launch_fee_status").eq("id",id).eq("instructor_id",user.id).maybeSingle(),
      supabase.from("platform_settings").select("classroom_launch_fee_enabled,classroom_launch_fee_amount,classroom_launch_fee_currency,classroom_launch_fee_local_mru,platform_payment_number").eq("id",1).single(),
      supabase.from("classroom_launch_fee_orders").select("*").eq("classroom_id",id).maybeSingle(),
      supabase.from("platform_payment_methods").select("*").eq("payment_mode","automatic").eq("is_active",true),
      supabase.from("platform_payment_methods").select("*").eq("provider_code","payoneer").eq("payment_mode","manual").eq("is_active",true).maybeSingle()
    ]);
    setRoom(r||false);setSettings(s);setOrder(o||null);setAutoMethods(auto||[]);setPayoneer(p||null);
  }
  useEffect(()=>{load()},[id]);

  async function submitManual(e:FormEvent){
    e.preventDefault();setMessage("");
    if(!proof){setMessage(t({fr:"Ajoutez la preuve du paiement.",ar:"أضف إثبات الدفع.",en:"Add payment proof."}));return}
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    setBusy(true);
    const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${user.id}/classroom-fees/${id}/${crypto.randomUUID()}-${safe}`;
    const {error:upError}=await supabase.storage.from("trainer-files").upload(path,proof,{contentType:proof.type});
    if(upError){setBusy(false);setMessage(upError.message);return}
    const {error}=await supabase.rpc("submit_classroom_launch_fee_manual",{p_classroom_id:id,p_payment_method:method,p_transaction_reference:reference,p_proof_path:path});
    setBusy(false);
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Paiement Classroom envoyé à la Direction.",ar:"تم إرسال دفع الفصل للإدارة.",en:"Classroom payment sent to Management."}));
    setProof(null);setReference("");await load();
  }

  async function payAutomatic(provider:string){
    setBusy(true);setMessage("");
    const {data,error}=await supabase.functions.invoke("vydys-platform-billing",{body:{action:"create_checkout",purpose:"classroom_launch",classroom_id:id,provider}});
    setBusy(false);
    if(error||data?.error){setMessage(data?.detail||data?.error||error?.message||"Checkout error");return}
    if(data?.url)window.location.href=data.url;
  }

  if(room===null||settings===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(room===false)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>Classroom introuvable</h1></article></div></section>;

  const localAmount=settings.classroom_launch_fee_currency==="MRU"?Number(settings.classroom_launch_fee_amount||0):Number(settings.classroom_launch_fee_local_mru||0);
  const intlAmount=Number(settings.classroom_launch_fee_amount||0);
  const intlCurrency=settings.classroom_launch_fee_currency||"USD";
  const paid=room.status==="published"||room.launch_fee_status==="paid"||order?.status==="paid"||order?.status==="waived";

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Classroom Launch</span><h1>{t({fr:"Publier votre Classroom",ar:"نشر فصلك المباشر",en:"Publish your Classroom"})}</h1><p>{room.title_fr}</p></div><Link className="btn btn-ghost" href={"/formateur/classrooms/"+id}>← Classroom Studio</Link></div>
    {message&&<p className="manual-note">{message}</p>}

    {paid?<article className="panel launch-paid-state"><span>✓</span><div><h2>{t({fr:"Classroom publiée",ar:"تم نشر الفصل",en:"Classroom published"})}</h2><p>{t({fr:"Les étudiants peuvent maintenant s’inscrire.",ar:"يمكن للطلاب الآن التسجيل.",en:"Learners can now enroll."})}</p><Link className="btn" href={"/formateur/classrooms/"+id}>{t({fr:"Gérer la Classroom",ar:"إدارة الفصل",en:"Manage Classroom"})}</Link></div></article>
    :room.status!=="approved_pending_fee"?<article className="panel"><h2>{t({fr:"La Direction doit d’abord approuver la Classroom.",ar:"يجب أن تعتمد الإدارة الفصل أولاً.",en:"Management must approve the Classroom first."})}</h2></article>
    :<div className="launch-fee-layout">
      <section className="panel launch-fee-summary"><span className="eyebrow">Vydys Classroom</span><h2>{t({fr:"Frais de lancement",ar:"رسوم الإطلاق",en:"Launch fee"})}</h2><div className="launch-fee-big"><strong>{intlAmount.toLocaleString("fr-FR")} {intlCurrency}</strong><span>{t({fr:"une fois par nouvelle Classroom",ar:"مرة واحدة لكل فصل جديد",en:"one time per new Classroom"})}</span></div><p>{t({fr:"Après publication, Vydys garde 0 % des paiements reçus de vos étudiants.",ar:"بعد النشر تحتفظ بـ 100٪ من مدفوعات طلابك.",en:"After launch, Vydys keeps 0% of the payments your learners send you."})}</p>{order&&<div className={"launch-order-status "+order.status}>{order.status}</div>}</section>

      <form className="panel trainer-form" onSubmit={submitManual}><span className="eyebrow">{t({fr:"Mauritanie · Manuel",ar:"موريتانيا · يدوي",en:"Mauritania · Manual"})}</span><h2>Bankily · Masrvi · Sedad · Click</h2>
        {localAmount<=0?<p className="manual-note">{t({fr:"L’Admin doit définir l’équivalent MRU dans Admin → Tarifs.",ar:"يجب على الإدارة تحديد المعادل بالأوقية في الأسعار.",en:"Admin must set the MRU equivalent in Admin → Pricing."})}</p>:<>
          <div className="amount-box"><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><strong>{localAmount.toLocaleString("fr-FR")} MRU</strong></div>
          <div className="payment-methods four">{(["bankily","masrvi","sedad","click"] as Method[]).map(m=><button type="button" key={m} className={method===m?"payment-option selected":"payment-option"} onClick={()=>setMethod(m)}><strong>{m[0].toUpperCase()+m.slice(1)}</strong></button>)}</div>
          <div className="pay-number"><span>{method.toUpperCase()}</span><strong>{settings.platform_payment_number}</strong></div>
          <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Ajouter la preuve",ar:"أضف الإثبات",en:"Add proof"})}</strong></label>
          <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
          <button className="btn" disabled={busy}>{busy?"...":t({fr:"Envoyer pour validation",ar:"إرسال للمراجعة",en:"Submit for approval"})}</button>
        </>}
      </form>

      {payoneer&&<form className="panel trainer-form payoneer-payment-card" onSubmit={e=>{setMethod("payoneer");submitManual(e)}}>
        <span className="eyebrow">International · Payoneer</span><h2>Payoneer</h2>
        <p>{t({fr:"Payez Vydys via Payoneer puis envoyez la preuve pour validation par la Direction.",ar:"ادفع لـ Vydys عبر Payoneer ثم أرسل الإثبات لمراجعة الإدارة.",en:"Pay Vydys through Payoneer, then upload proof for Management approval."})}</p>
        <div className="pay-number"><span>PAYONEER</span><strong>{payoneer.account_number}</strong></div>
        {payoneer.instructions&&<p className="payment-instructor-instructions">{payoneer.instructions}</p>}
        <div className="amount-box"><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><strong>{intlAmount.toLocaleString("fr-FR")} {intlCurrency}</strong></div>
        {String(payoneer.currency).toUpperCase()!==String(intlCurrency).toUpperCase()?<p className="manual-note">{t({fr:"La devise Payoneer configurée ne correspond pas au frais Classroom.",ar:"عملة Payoneer لا تطابق رسوم الفصل.",en:"Configured Payoneer currency does not match the Classroom fee."})}</p>:<>
          <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Ajouter la preuve Payoneer",ar:"أضف إثبات Payoneer",en:"Add Payoneer proof"})}</strong></label>
          <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
          <button className="btn" disabled={busy}>{busy?"...":t({fr:"Envoyer Payoneer",ar:"إرسال Payoneer",en:"Submit Payoneer"})}</button>
        </>}
      </form>}

      <aside className="panel automatic-billing-card launch-auto-card"><span className="eyebrow">{t({fr:"International · Automatique",ar:"دولي · تلقائي",en:"International · Automatic"})}</span><h2>{intlAmount.toLocaleString("fr-FR")} {intlCurrency}</h2><p>{t({fr:"Payez automatiquement via le compte marchand Vydys. Après confirmation serveur, la Classroom est publiée immédiatement.",ar:"ادفع تلقائياً عبر حساب Vydys التجاري وبعد تأكيد الخادم ينشر الفصل فوراً.",en:"Pay through the Vydys merchant account. After server confirmation, the Classroom publishes immediately."})}</p><div className="auto-billing-options">{autoMethods.length===0?<p className="manual-note">{t({fr:"Aucun provider international Vydys connecté.",ar:"لا يوجد مزود دولي متصل.",en:"No Vydys international provider connected."})}</p>:autoMethods.map(m=><button className="auto-billing-provider" key={m.id} onClick={()=>payAutomatic(m.provider_code)} disabled={busy}><span>{m.provider_code==="stripe"?"S":m.provider_code==="paypal"?"P":"PD"}</span><div><strong>{m.provider_code==="stripe"?"Stripe":m.provider_code==="paypal"?"PayPal":"Paddle"}</strong><small>{intlAmount.toLocaleString("fr-FR")} {intlCurrency}</small></div><b>→</b></button>)}</div></aside>
    </div>}
  </div></section>
}
