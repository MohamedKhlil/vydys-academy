"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

type Plan="monthly"|"quarterly"|"annual";
type Method="click"|"bankily"|"sedad"|"masrvi"|"payoneer";

export default function AbonnementPage(){
  const {t}=useLanguage();
  const [settings,setSettings]=useState<any>(null);
  const [autoMethods,setAutoMethods]=useState<any[]>([]);
  const [payoneer,setPayoneer]=useState<any>(null);
  const [plan,setPlan]=useState<Plan>("monthly");
  const [method,setMethod]=useState<Method>("bankily");
  const [proof,setProof]=useState<File|null>(null);
  const [reference,setReference]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    const [{data:s},{data:m},{data:p}]=await Promise.all([
      supabase.from("platform_settings").select("*").eq("id",1).single(),
      supabase.from("platform_payment_methods").select("*").eq("payment_mode","automatic").eq("is_active",true),
      supabase.from("platform_payment_methods").select("*").eq("provider_code","payoneer").eq("payment_mode","manual").eq("is_active",true).maybeSingle()
    ]);
    setSettings(s);setAutoMethods(m||[]);setPayoneer(p||null);
  }
  useEffect(()=>{load()},[]);

  if(!settings)return <section className="section page-top"><div className="container">...</div></section>;

  const currency=String(settings.trainer_subscription_currency||"MRU").toUpperCase();
  const prices:any={
    monthly:Number(settings.trainer_monthly_price??settings.trainer_monthly_price_mru??0),
    quarterly:Number(settings.trainer_quarterly_price??settings.trainer_quarterly_price_mru??0),
    annual:Number(settings.trainer_annual_price??settings.trainer_annual_price_mru??0)
  };
  const amount=prices[plan]||0;
  const format=(value:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency,maximumFractionDigits:2}).format(value);

  async function submitManual(e:FormEvent){
    e.preventDefault();setMessage("");
    if(method!=="payoneer"&&currency!=="MRU"){setMessage(t({fr:"Le paiement manuel Mauritanie nécessite un tarif d’abonnement en MRU.",ar:"الدفع اليدوي في موريتانيا يتطلب تسعيراً بالأوقية.",en:"Mauritania manual payment requires the subscription price to be in MRU."}));return}
    if(method==="payoneer"&&(!payoneer||String(payoneer.currency).toUpperCase()!==currency)){setMessage(t({fr:"Payoneer n’est pas configuré dans la devise de cet abonnement.",ar:"Payoneer غير مضبوط بعملة هذا الاشتراك.",en:"Payoneer is not configured in this subscription currency."}));return}
    if(!proof){setMessage(t({fr:"Ajoutez une preuve de paiement.",ar:"أضف إثبات الدفع.",en:"Add payment proof."}));return}
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    setBusy(true);
    const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const proofPath=`${user.id}/subscriptions/${crypto.randomUUID()}-${safe}`;
    const {error:upError}=await supabase.storage.from("trainer-files").upload(proofPath,proof,{contentType:proof.type});
    if(upError){setBusy(false);setMessage(upError.message);return}
    const {error}=await supabase.rpc("submit_trainer_subscription_secure",{p_plan:plan,p_payment_method:method,p_transaction_reference:reference,p_proof_path:proofPath});
    setBusy(false);
    setMessage(error?error.message:t({fr:"Demande d'abonnement envoyée à la Direction.",ar:"تم إرسال طلب الاشتراك إلى الإدارة.",en:"Subscription request sent to Management."}));
    if(!error){setProof(null);setReference("")}
  }

  async function payAutomatic(provider:string){
    setBusy(true);setMessage("");
    const {data,error}=await supabase.functions.invoke("vydys-platform-billing",{body:{action:"create_checkout",purpose:"subscription",plan,provider}});
    setBusy(false);
    if(error||data?.error){setMessage(data?.detail||data?.error||error?.message||"Checkout error");return}
    if(data?.url)window.location.href=data.url;
  }

  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Abonnement formateur",ar:"اشتراك المدرب",en:"Instructor subscription"})}</span><h1>{t({fr:"Activez votre accès professionnel",ar:"فعّل وصولك المهني",en:"Activate your professional access"})}</h1><p>{t({fr:"En Mauritanie, vous pouvez payer manuellement. À l’international, utilisez un provider Vydys connecté pour une activation automatique.",ar:"في موريتانيا يمكنك الدفع يدوياً. دولياً استخدم مزود Vydys المتصل للتفعيل التلقائي.",en:"In Mauritania you can pay manually. Internationally, use a connected Vydys provider for automatic activation."})}</p></div>

    <div className="pricing-grid">
      {(["monthly","quarterly","annual"] as Plan[]).map(p=><button className={plan===p?"plan-card selected":"plan-card"} onClick={()=>setPlan(p)} key={p}><span>{p==="monthly"?t({fr:"Mensuel",ar:"شهري",en:"Monthly"}):p==="quarterly"?t({fr:"Trimestriel",ar:"ربع سنوي",en:"Quarterly"}):t({fr:"Annuel",ar:"سنوي",en:"Annual"})}</span><strong>{format(prices[p]||0)}</strong></button>)}
    </div>

    {message&&<p className="manual-note">{message}</p>}
    <div className="subscription-pay-grid">
      <form className="panel trainer-form" onSubmit={submitManual}>
        <span className="eyebrow">{t({fr:"Mauritanie · Manuel",ar:"موريتانيا · يدوي",en:"Mauritania · Manual"})}</span>
        <h2>{t({fr:"Banques digitales locales",ar:"البنوك الرقمية المحلية",en:"Local digital banks"})}</h2>
        <p>{t({fr:"Le paiement est envoyé à Vydys puis validé par la Direction.",ar:"يتم إرسال الدفع إلى Vydys ثم مراجعته من الإدارة.",en:"Payment is sent to Vydys and reviewed by Management."})}</p>
        {currency!=="MRU"?<p className="manual-note">{t({fr:"Le tarif actuel est en "+currency+". Activez un provider international ou demandez à l’Admin de configurer l’abonnement en MRU.",ar:"السعر الحالي بعملة "+currency+". استخدم مزوداً دولياً أو اطلب من الإدارة ضبط السعر بالأوقية.",en:"The current price is in "+currency+". Use an international provider or ask Admin to configure the subscription in MRU."})}</p>:<>
          <div className="payment-methods four">{(["bankily","masrvi","sedad","click"] as Method[]).map(m=><button type="button" key={m} className={method===m?"payment-option selected":"payment-option"} onClick={()=>setMethod(m)}><strong>{m[0].toUpperCase()+m.slice(1)}</strong></button>)}</div>
          <div className="pay-number"><span>{method.toUpperCase()}</span><strong>{settings.platform_payment_number}</strong></div>
          <div className="amount-box"><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><strong>{format(amount)}</strong></div>
          <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Ajouter la preuve",ar:"أضف الإثبات",en:"Add proof"})}</strong></label>
          <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
          <button className="btn" disabled={busy}>{busy?"...":t({fr:"Envoyer pour validation",ar:"إرسال للمراجعة",en:"Submit for approval"})}</button>
        </>}
      </form>

      {payoneer&&<form className="panel trainer-form payoneer-payment-card" onSubmit={e=>{setMethod("payoneer");submitManual(e)}}>
        <span className="eyebrow">International · Payoneer</span>
        <h2>Payoneer</h2>
        <p>{t({fr:"Payez directement le compte Payoneer de Vydys, puis envoyez la preuve pour validation.",ar:"ادفع مباشرة إلى حساب Payoneer الخاص بـ Vydys ثم أرسل الإثبات للمراجعة.",en:"Pay the Vydys Payoneer account directly, then upload proof for approval."})}</p>
        <div className="pay-number"><span>PAYONEER</span><strong>{payoneer.account_number}</strong></div>
        {payoneer.instructions&&<p className="payment-instructor-instructions">{payoneer.instructions}</p>}
        <div className="amount-box"><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><strong>{format(amount)}</strong></div>
        {String(payoneer.currency).toUpperCase()!==currency?<p className="manual-note">{t({fr:"La devise Payoneer configurée ne correspond pas au tarif actuel.",ar:"عملة Payoneer لا تطابق السعر الحالي.",en:"Configured Payoneer currency does not match the current price."})}</p>:<>
          <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Ajouter la preuve Payoneer",ar:"أضف إثبات Payoneer",en:"Add Payoneer proof"})}</strong></label>
          <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
          <button className="btn" disabled={busy}>{busy?"...":t({fr:"Envoyer Payoneer",ar:"إرسال Payoneer",en:"Submit Payoneer"})}</button>
        </>}
      </form>}

      <aside className="panel automatic-billing-card">
        <span className="eyebrow">{t({fr:"International · Automatique",ar:"دولي · تلقائي",en:"International · Automatic"})}</span>
        <h2>{t({fr:"Activation immédiate",ar:"تفعيل فوري",en:"Instant activation"})}</h2>
        <p>{t({fr:"Le checkout est encaissé par le compte marchand Vydys. Une fois le paiement confirmé côté serveur, votre abonnement est activé automatiquement.",ar:"يتم الدفع إلى حساب Vydys التجاري. بعد التأكيد على الخادم يتم تفعيل اشتراكك تلقائياً.",en:"Checkout is collected by the Vydys merchant account. Once server-confirmed, your subscription activates automatically."})}</p>
        <div className="auto-billing-options">{autoMethods.length===0?<p className="manual-note">{t({fr:"Aucun provider international Vydys n’est encore connecté.",ar:"لا يوجد مزود دولي متصل بـ Vydys بعد.",en:"No Vydys international provider is connected yet."})}</p>:autoMethods.map(m=><button className="auto-billing-provider" key={m.id} onClick={()=>payAutomatic(m.provider_code)} disabled={busy}><span>{m.provider_code==="stripe"?"S":m.provider_code==="paypal"?"P":"PD"}</span><div><strong>{m.provider_code==="stripe"?"Stripe":m.provider_code==="paypal"?"PayPal":"Paddle"}</strong><small>{format(amount)}</small></div><b>→</b></button>)}</div>
        <small className="billing-note">{t({fr:"Aucune commission sur vos ventes de cours : cet encaissement concerne uniquement votre abonnement Vydys.",ar:"لا توجد عمولة على مبيعات دوراتك: هذا الدفع يخص اشتراك Vydys فقط.",en:"No commission on your course sales: this charge is only for your Vydys subscription."})}</small>
      </aside>
    </div>
  </div></section>
}
