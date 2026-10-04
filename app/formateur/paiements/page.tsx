"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

type ManualMethod="click"|"bankily"|"sedad"|"masrvi"|"bank_transfer";
type AutoProvider="stripe"|"paypal";

export default function FormateurPaiementsPage(){
  const {t}=useLanguage();
  const [rows,setRows]=useState<any[]>([]);
  const [credentials,setCredentials]=useState<any[]>([]);
  const [currencies,setCurrencies]=useState<any[]>([]);
  const [tab,setTab]=useState<"manual"|"automatic">("manual");
  const [method,setMethod]=useState<ManualMethod>("bankily");
  const [account,setAccount]=useState("");
  const [holder,setHolder]=useState("");
  const [currency,setCurrency]=useState("MRU");
  const [instructions,setInstructions]=useState("");
  const [discount,setDiscount]=useState("0");
  const [provider,setProvider]=useState<AutoProvider>("stripe");
  const [environment,setEnvironment]=useState<"live"|"sandbox">("live");
  const [stripeKey,setStripeKey]=useState("");
  const [paypalClientId,setPaypalClientId]=useState("");
  const [paypalSecret,setPaypalSecret]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const [{data:m},{data:c},{data:cur}]=await Promise.all([
      supabase.from("instructor_payment_methods").select("*").eq("instructor_id",user.id).order("created_at"),
      supabase.from("instructor_payment_credentials").select("provider,key_hint,environment,status,provider_account_id,provider_account_label,last_tested_at,last_error").eq("instructor_id",user.id),
      supabase.from("currency_catalog").select("code,name,symbol").eq("enabled",true).order("code")
    ]);
    setRows(m||[]);setCredentials(c||[]);setCurrencies(cur||[]);
  }
  useEffect(()=>{load()},[]);

  async function addManual(e:FormEvent){
    e.preventDefault();setMessage("");
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const actualCurrency=["click","bankily","sedad","masrvi"].includes(method)?"MRU":currency;
    const {error}=await supabase.from("instructor_payment_methods").insert({
      instructor_id:user.id,method,provider_code:method,label:method==="bank_transfer"?t({fr:"Virement bancaire",ar:"تحويل بنكي",en:"Bank transfer"}):method,
      account_number:account,account_holder:holder||null,instructions:instructions||null,
      discount_percent:Number(discount)||0,is_active:true,payment_mode:"manual",
      country_code:["click","bankily","sedad","masrvi"].includes(method)?"MR":"INTL",
      currency:actualCurrency,connection_status:"not_required"
    });
    if(error){setMessage(error.message);return}
    setAccount("");setHolder("");setInstructions("");setDiscount("0");
    setMessage(t({fr:"Moyen de paiement manuel ajouté.",ar:"تمت إضافة وسيلة الدفع اليدوية.",en:"Manual payment method added."}));await load();
  }

  async function connectAuto(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("");
    const body:any={action:"connect_provider",provider,environment};
    if(provider==="stripe")body.secret_key=stripeKey.trim();
    else{body.client_id=paypalClientId.trim();body.client_secret=paypalSecret.trim()}
    const {data,error}=await supabase.functions.invoke("vydys-payments",{body});
    setBusy(false);
    if(error||data?.error){setMessage(data?.detail||data?.error||error?.message||"Connection failed");return}
    setStripeKey("");setPaypalClientId("");setPaypalSecret("");
    setMessage(t({fr:"Provider international connecté et vérifié.",ar:"تم ربط مزود الدفع الدولي والتحقق منه.",en:"International provider connected and verified."}));await load();
  }

  async function disable(id:string){
    await supabase.from("instructor_payment_methods").update({is_active:false}).eq("id",id);await load();
  }
  async function enable(id:string){
    await supabase.from("instructor_payment_methods").update({is_active:true}).eq("id",id);await load();
  }
  async function disconnect(providerCode:string){
    if(!window.confirm(t({fr:"Déconnecter ce provider ?",ar:"قطع اتصال مزود الدفع؟",en:"Disconnect this provider?"})))return;
    const {data,error}=await supabase.functions.invoke("vydys-payments",{body:{action:"disconnect_provider",provider:providerCode}});
    if(error||data?.error)setMessage(data?.detail||data?.error||error?.message||"Error");else{setMessage(t({fr:"Provider déconnecté.",ar:"تم قطع اتصال المزود.",en:"Provider disconnected."}));await load()}
  }

  const manualRows=rows.filter(r=>r.payment_mode!=="automatic");
  const autoRows=rows.filter(r=>r.payment_mode==="automatic");

  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">Vydys Instructor Payments</span><h1>{t({fr:"Recevez vos paiements directement",ar:"استلم مدفوعاتك مباشرة",en:"Receive payments directly"})}</h1><p>{t({fr:"Vydys ne prend aucune commission. Les banques digitales mauritaniennes fonctionnent en validation manuelle ; Stripe/PayPal peuvent confirmer automatiquement les paiements internationaux.",ar:"لا تأخذ Vydys أي عمولة. البنوك الرقمية الموريتانية تعمل بالمراجعة اليدوية؛ ويمكن لـ Stripe/PayPal تأكيد المدفوعات الدولية تلقائياً.",en:"Vydys takes no commission. Mauritanian digital banks use manual confirmation; Stripe/PayPal can confirm international payments automatically."})}</p></div>

    <div className="payment-model-strip">
      <article><span>MR</span><div><strong>{t({fr:"Mauritanie",ar:"موريتانيا",en:"Mauritania"})}</strong><p>Bankily · Masrvi · Sedad · Click → {t({fr:"preuve + validation",ar:"إثبات + مراجعة",en:"proof + approval"})}</p></div></article>
      <article><span>INTL</span><div><strong>{t({fr:"International",ar:"دولي",en:"International"})}</strong><p>Stripe · PayPal → {t({fr:"checkout + confirmation automatique",ar:"دفع + تأكيد تلقائي",en:"checkout + automatic confirmation"})}</p></div></article>
      <article><span>0%</span><div><strong>{t({fr:"Commission Vydys",ar:"عمولة Vydys",en:"Vydys commission"})}</strong><p>{t({fr:"L’argent va au compte du formateur.",ar:"يذهب المال إلى حساب المدرب.",en:"Money goes to the instructor account."})}</p></div></article>
    </div>

    <div className="payment-config-tabs"><button className={tab==="manual"?"active":""} onClick={()=>setTab("manual")}>{t({fr:"Méthodes manuelles",ar:"طرق يدوية",en:"Manual methods"})}</button><button className={tab==="automatic"?"active":""} onClick={()=>setTab("automatic")}>{t({fr:"Providers automatiques",ar:"مزودون تلقائيون",en:"Automatic providers"})}</button></div>

    {message&&<p className="manual-note">{message}</p>}

    {tab==="manual"?<div className="dash-grid">
      <form className="panel trainer-form" onSubmit={addManual}>
        <span className="eyebrow">{t({fr:"Paiement direct formateur",ar:"دفع مباشر للمدرب",en:"Direct instructor payment"})}</span>
        <h2>{t({fr:"Ajouter une méthode manuelle",ar:"إضافة وسيلة يدوية",en:"Add manual method"})}</h2>
        <label className="form-field"><span>{t({fr:"Type",ar:"النوع",en:"Type"})}</span><select value={method} onChange={e=>setMethod(e.target.value as ManualMethod)}><option value="bankily">Bankily</option><option value="masrvi">Masrvi</option><option value="sedad">Sedad</option><option value="click">Click</option><option value="bank_transfer">{t({fr:"Virement bancaire",ar:"تحويل بنكي",en:"Bank transfer"})}</option></select></label>
        <label className="form-field"><span>{t({fr:"Titulaire",ar:"اسم صاحب الحساب",en:"Account holder"})}</span><input value={holder} onChange={e=>setHolder(e.target.value)} placeholder={t({fr:"Nom du titulaire",ar:"اسم صاحب الحساب",en:"Account holder name"})}/></label>
        <label className="form-field"><span>{t({fr:"Numéro / Compte / RIB",ar:"الرقم / الحساب",en:"Number / Account"})}</span><input value={account} onChange={e=>setAccount(e.target.value)} required/></label>
        {method==="bank_transfer"&&<label className="form-field"><span>{t({fr:"Devise reçue",ar:"عملة الاستلام",en:"Settlement currency"})}</span><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select></label>}
        <label className="form-field"><span>{t({fr:"Instructions pour l’étudiant",ar:"تعليمات للطالب",en:"Student instructions"})}</span><textarea rows={4} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder={t({fr:"Ex: indiquez votre nom dans la référence puis envoyez la preuve.",ar:"مثال: اكتب اسمك في المرجع ثم أرسل الإثبات.",en:"Example: include your name in the reference then upload proof."})}/></label>
        <label className="form-field"><span>{t({fr:"Réduction % optionnelle",ar:"خصم اختياري ٪",en:"Optional discount %"})}</span><input type="number" min="0" max="100" step="0.1" value={discount} onChange={e=>setDiscount(e.target.value)}/></label>
        <button className="btn">{t({fr:"Ajouter",ar:"إضافة",en:"Add method"})}</button>
      </form>
      <aside className="panel"><h2>{t({fr:"Mes méthodes manuelles",ar:"طرقي اليدوية",en:"My manual methods"})}</h2><div className="method-list">{manualRows.length===0?<p>{t({fr:"Aucune méthode manuelle.",ar:"لا توجد طريقة يدوية.",en:"No manual method yet."})}</p>:manualRows.map(r=><div className="method-row payment-method-row-rich" key={r.id}><div><strong>{(r.label||r.method).toUpperCase()}</strong><span>{r.account_holder? r.account_holder+" · ":""}{r.account_number}</span><small>{r.currency} · {r.discount_percent}% · {r.is_active?t({fr:"Actif",ar:"نشط",en:"Active"}):t({fr:"Inactif",ar:"غير نشط",en:"Inactive"})}</small></div>{r.is_active?<button onClick={()=>disable(r.id)}>{t({fr:"Désactiver",ar:"تعطيل",en:"Disable"})}</button>:<button className="enable" onClick={()=>enable(r.id)}>{t({fr:"Activer",ar:"تفعيل",en:"Enable"})}</button>}</div>)}</div></aside>
    </div>:<div className="dash-grid">
      <form className="panel trainer-form" onSubmit={connectAuto}>
        <span className="eyebrow">{t({fr:"Paiement international automatique",ar:"دفع دولي تلقائي",en:"Automatic international payment"})}</span>
        <h2>{t({fr:"Connecter votre compte marchand",ar:"ربط حسابك التجاري",en:"Connect your merchant account"})}</h2>
        <p>{t({fr:"Les identifiants sont vérifiés côté serveur puis chiffrés dans Supabase Vault. Ils ne sont jamais réaffichés dans le navigateur.",ar:"يتم التحقق من بيانات الدخول على الخادم ثم تشفيرها داخل Supabase Vault ولا يعاد عرضها في المتصفح.",en:"Credentials are validated server-side and encrypted in Supabase Vault. They are never displayed back in the browser."})}</p>
        <label className="form-field"><span>Provider</span><select value={provider} onChange={e=>setProvider(e.target.value as AutoProvider)}><option value="stripe">Stripe</option><option value="paypal">PayPal</option></select></label>
        <label className="form-field"><span>{t({fr:"Environnement",ar:"البيئة",en:"Environment"})}</span><select value={environment} onChange={e=>setEnvironment(e.target.value as "live"|"sandbox")}><option value="live">Live</option><option value="sandbox">Sandbox/Test</option></select></label>
        {provider==="stripe"?<label className="form-field"><span>Stripe Secret Key</span><input type="password" autoComplete="off" value={stripeKey} onChange={e=>setStripeKey(e.target.value)} placeholder={environment==="live"?"sk_live_...":"sk_test_..."} required/></label>:<>
          <label className="form-field"><span>PayPal Client ID</span><input type="password" autoComplete="off" value={paypalClientId} onChange={e=>setPaypalClientId(e.target.value)} required/></label>
          <label className="form-field"><span>PayPal Client Secret</span><input type="password" autoComplete="off" value={paypalSecret} onChange={e=>setPaypalSecret(e.target.value)} required/></label>
        </>}
        <article className="provider-security-note">🔐 {t({fr:"Utilisez uniquement votre propre compte marchand dans un pays où ce provider vous autorise à recevoir des paiements.",ar:"استخدم حسابك التجاري الخاص فقط في بلد يسمح فيه المزود باستلام المدفوعات.",en:"Use only your own merchant account in a country where the provider allows you to receive payments."})}</article>
        <article className="provider-webhook-note"><strong>{t({fr:"Webhook recommandé",ar:"Webhook موصى به",en:"Recommended webhook"})}</strong><code>https://ruzwqmtqyvtpgccqonqi.supabase.co/functions/v1/vydys-payment-webhook</code><small>{provider==="stripe"?"checkout.session.completed · checkout.session.async_payment_succeeded":"CHECKOUT.ORDER.APPROVED · PAYMENT.CAPTURE.COMPLETED"}</small><p>{t({fr:"Le webhook n’accorde jamais l’accès sur la seule base du message reçu : Vydys re-vérifie le paiement directement chez le provider.",ar:"لا يمنح Webhook الوصول اعتماداً على الرسالة فقط؛ يعيد Vydys التحقق من الدفع مباشرة لدى المزود.",en:"The webhook never grants access based only on the received message; Vydys re-verifies the payment directly with the provider."})}</p></article>
        <button className="btn" disabled={busy}>{busy?"...":t({fr:"Tester & connecter",ar:"اختبار وربط",en:"Test & connect"})}</button>
      </form>
      <aside className="panel"><h2>{t({fr:"Providers connectés",ar:"المزودون المتصلون",en:"Connected providers"})}</h2><div className="provider-list">{credentials.length===0?<p>{t({fr:"Aucun provider automatique connecté.",ar:"لا يوجد مزود تلقائي متصل.",en:"No automatic provider connected."})}</p>:credentials.map(c=><article className="provider-connected-card" key={c.provider}><div className="provider-logo">{c.provider==="stripe"?"S":"P"}</div><div><strong>{c.provider==="stripe"?"Stripe":"PayPal"}</strong><span>{c.provider_account_label||c.provider_account_id||c.key_hint}</span><small>{c.environment} · {c.status} · {c.key_hint}</small></div><button onClick={()=>disconnect(c.provider)}>{t({fr:"Déconnecter",ar:"قطع الاتصال",en:"Disconnect"})}</button></article>)}</div>
        {autoRows.map(r=><div className="auto-method-status" key={r.id}><span>{r.provider_code}</span><b className={r.is_active?"on":"off"}>{r.is_active?"ON":"OFF"}</b></div>)}
      </aside>
    </div>}
  </div></section>
}
