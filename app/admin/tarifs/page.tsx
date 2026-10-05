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
  const [classroomLaunchEnabled,setClassroomLaunchEnabled]=useState(true);
  const [classroomLaunchAmount,setClassroomLaunchAmount]=useState("3");
  const [classroomLaunchCurrency,setClassroomLaunchCurrency]=useState("USD");
  const [classroomLaunchLocalMru,setClassroomLaunchLocalMru]=useState("0");
  const [grace,setGrace]=useState("0");
  const [requireApproval,setRequireApproval]=useState(true);
  const [platformProviders,setPlatformProviders]=useState<any[]>([]);
  const [provider,setProvider]=useState<"stripe"|"paypal"|"paddle">("stripe");
  const [providerEnvironment,setProviderEnvironment]=useState<"live"|"sandbox">("live");
  const [stripeKey,setStripeKey]=useState("");
  const [paypalClientId,setPaypalClientId]=useState("");
  const [paypalSecret,setPaypalSecret]=useState("");
  const [paddleApiKey,setPaddleApiKey]=useState("");
  const [payoneerAccount,setPayoneerAccount]=useState("");
  const [payoneerCurrency,setPayoneerCurrency]=useState("USD");
  const [payoneerInstructions,setPayoneerInstructions]=useState("");
  const [payoneerActive,setPayoneerActive]=useState(false);
  const [providerBusy,setProviderBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="direction"||p?.role==="admin";setAllowed(ok);if(!ok)return;
    const [{data:s},{data:c},{data:providers},{data:manualMethods}]=await Promise.all([
      supabase.from("platform_settings").select("*").eq("id",1).single(),
      supabase.from("currency_catalog").select("code,name,symbol").eq("enabled",true).order("code"),
      supabase.from("platform_payment_credentials").select("provider,key_hint,environment,status,provider_account_id,provider_account_label,last_tested_at,last_error").order("provider"),
      supabase.from("platform_payment_methods").select("*").eq("provider_code","payoneer").eq("payment_mode","manual").maybeSingle()
    ]);
    setCurrencies(c||[]);setPlatformProviders(providers||[]);
    if(manualMethods){setPayoneerAccount(manualMethods.account_number||"");setPayoneerCurrency(manualMethods.currency||"USD");setPayoneerInstructions(manualMethods.instructions||"");setPayoneerActive(Boolean(manualMethods.is_active));}
    if(s){
      setMonthly(String(s.trainer_monthly_price??s.trainer_monthly_price_mru??0));
      setQuarterly(String(s.trainer_quarterly_price??s.trainer_quarterly_price_mru??0));
      setAnnual(String(s.trainer_annual_price??s.trainer_annual_price_mru??0));
      setSubscriptionCurrency(s.trainer_subscription_currency||"MRU");
      setLaunchEnabled(Boolean(s.course_launch_fee_enabled));
      setLaunchAmount(String(s.course_launch_fee_amount??1));
      setLaunchCurrency(s.course_launch_fee_currency||"USD");
      setLaunchLocalMru(String(s.course_launch_fee_local_mru??0));
      setClassroomLaunchEnabled(Boolean(s.classroom_launch_fee_enabled));
      setClassroomLaunchAmount(String(s.classroom_launch_fee_amount??3));
      setClassroomLaunchCurrency(s.classroom_launch_fee_currency||"USD");
      setClassroomLaunchLocalMru(String(s.classroom_launch_fee_local_mru??0));
      setGrace(String(s.grace_period_days||0));
      setRequireApproval(Boolean(s.require_course_approval));
    }
  })()},[]);


  async function connectPlatformProvider(){
    setProviderBusy(true);setMessage("");
    const body:any={action:"connect_provider",provider,environment:providerEnvironment};
    if(provider==="stripe")body.secret_key=stripeKey.trim();
    else if(provider==="paypal"){body.client_id=paypalClientId.trim();body.client_secret=paypalSecret.trim()}
    else body.api_key=paddleApiKey.trim();
    const {data,error}=await supabase.functions.invoke("vydys-platform-billing",{body});
    setProviderBusy(false);
    if(error||data?.error){setMessage(data?.detail||data?.error||error?.message||"Connection failed");return}
    setStripeKey("");setPaypalClientId("");setPaypalSecret("");setPaddleApiKey("");
    setMessage(t({fr:"Provider Vydys connecté et vérifié.",ar:"تم ربط مزود Vydys والتحقق منه.",en:"Vydys provider connected and verified."}));
    window.location.reload();
  }

  async function disconnectPlatformProvider(code:string){
    if(!window.confirm(t({fr:"Déconnecter ce provider Vydys ?",ar:"قطع اتصال مزود Vydys؟",en:"Disconnect this Vydys provider?"})))return;
    const {data,error}=await supabase.functions.invoke("vydys-platform-billing",{body:{action:"disconnect_provider",provider:code}});
    if(error||data?.error)setMessage(data?.detail||data?.error||error?.message||"Error");else window.location.reload();
  }

  async function savePayoneer(){
    setMessage("");
    const {error}=await supabase.rpc("set_platform_manual_payment_method",{
      p_provider:"payoneer",p_account_number:payoneerAccount,p_currency:payoneerCurrency,
      p_instructions:payoneerInstructions,p_active:payoneerActive
    });
    setMessage(error?error.message:t({fr:"Payoneer enregistré.",ar:"تم حفظ Payoneer.",en:"Payoneer saved."}));
  }

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
      classroom_launch_fee_enabled:classroomLaunchEnabled,
      classroom_launch_fee_amount:Number(classroomLaunchAmount)||0,
      classroom_launch_fee_currency:classroomLaunchCurrency,
      classroom_launch_fee_local_mru:Number(classroomLaunchLocalMru)||0,
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

      <article className="panel trainer-form classroom-fee-admin"><span className="eyebrow">{t({fr:"Frais Classroom",ar:"رسوم الفصل المباشر",en:"Classroom launch fee"})}</span><h2>{t({fr:"Prix de publication d’une nouvelle Classroom",ar:"سعر نشر فصل مباشر جديد",en:"New Classroom publication fee"})}</h2>
        <label className="checkbox-line"><input type="checkbox" checked={classroomLaunchEnabled} onChange={e=>setClassroomLaunchEnabled(e.target.checked)}/>{t({fr:"Activer le frais Classroom",ar:"تفعيل رسوم الفصل",en:"Enable Classroom fee"})}</label>
        <div className="form-grid">
          <label className="form-field"><span>{t({fr:"Montant international",ar:"المبلغ الدولي",en:"International amount"})}</span><input type="number" min="0" step="0.01" value={classroomLaunchAmount} onChange={e=>setClassroomLaunchAmount(e.target.value)}/></label>
          <label className="form-field"><span>{t({fr:"Devise",ar:"العملة",en:"Currency"})}</span><select value={classroomLaunchCurrency} onChange={e=>setClassroomLaunchCurrency(e.target.value)}>{currencies.map(x=><option value={x.code} key={x.code}>{x.code}</option>)}</select></label>
          <label className="form-field full-row"><span>{t({fr:"Équivalent manuel MRU",ar:"المعادل اليدوي بالأوقية",en:"Manual MRU equivalent"})}</span><input type="number" min="0" step="0.01" value={classroomLaunchLocalMru} onChange={e=>setClassroomLaunchLocalMru(e.target.value)}/><small>{t({fr:"Utilisé pour Click / Bankily / Masrvi / Sedad. Modifiable à tout moment par l’Admin.",ar:"يستخدم لـ Click / Bankily / Masrvi / Sedad ويمكن للإدارة تغييره.",en:"Used for Click / Bankily / Masrvi / Sedad. Admin can change it anytime."})}</small></label>
        </div>
        <div className="launch-fee-preview"><span>Vydys Classroom</span><strong>{Number(classroomLaunchAmount||0).toLocaleString()} {classroomLaunchCurrency}</strong><small>{classroomLaunchEnabled?t({fr:"Après validation Admin",ar:"بعد اعتماد الإدارة",en:"After Admin approval"}):t({fr:"Désactivé",ar:"معطل",en:"Disabled"})}</small></div>
      </article>
    </div>


    <article className="panel platform-provider-admin"><div className="admin-section-head"><div><span className="eyebrow">{t({fr:"Encaissement international Vydys",ar:"تحصيل Vydys الدولي",en:"Vydys international billing"})}</span><h2>{t({fr:"Connecter le compte marchand de Vydys",ar:"ربط حساب Vydys التجاري",en:"Connect Vydys merchant account"})}</h2></div><p>{t({fr:"Utilisé uniquement pour les abonnements formateurs et frais de lancement — jamais pour les ventes des formateurs.",ar:"يُستخدم فقط لاشتراكات المدربين ورسوم الإطلاق — وليس لمبيعات المدربين.",en:"Used only for instructor subscriptions and launch fees — never for instructor course sales."})}</p></div>
      <div className="platform-provider-grid">
        <div className="trainer-form">
          <label className="form-field"><span>Provider</span><select value={provider} onChange={e=>setProvider(e.target.value as "stripe"|"paypal"|"paddle")}><option value="stripe">Stripe</option><option value="paypal">PayPal</option><option value="paddle">Paddle</option></select></label>
          <label className="form-field"><span>{t({fr:"Environnement",ar:"البيئة",en:"Environment"})}</span><select value={providerEnvironment} onChange={e=>setProviderEnvironment(e.target.value as "live"|"sandbox")}><option value="live">Live</option><option value="sandbox">Sandbox/Test</option></select></label>
          {provider==="stripe"?<label className="form-field"><span>Stripe Secret Key</span><input type="password" autoComplete="off" value={stripeKey} onChange={e=>setStripeKey(e.target.value)} placeholder={providerEnvironment==="live"?"sk_live_...":"sk_test_..."}/></label>:provider==="paypal"?<>
            <label className="form-field"><span>PayPal Client ID</span><input type="password" autoComplete="off" value={paypalClientId} onChange={e=>setPaypalClientId(e.target.value)}/></label>
            <label className="form-field"><span>PayPal Client Secret</span><input type="password" autoComplete="off" value={paypalSecret} onChange={e=>setPaypalSecret(e.target.value)}/></label>
          </>:<label className="form-field"><span>Paddle API Key</span><input type="password" autoComplete="off" value={paddleApiKey} onChange={e=>setPaddleApiKey(e.target.value)} placeholder={providerEnvironment==="live"?"pdl_live_apikey_...":"pdl_sdbx_apikey_..."}/></label>}
          <button className="btn" onClick={connectPlatformProvider} disabled={providerBusy}>{providerBusy?"...":t({fr:"Tester & connecter Vydys",ar:"اختبار وربط Vydys",en:"Test & connect Vydys"})}</button>
        </div>
        <div className="provider-list">{platformProviders.length===0?<p>{t({fr:"Aucun provider automatique Vydys connecté.",ar:"لا يوجد مزود تلقائي لـ Vydys.",en:"No automatic Vydys provider connected."})}</p>:platformProviders.map(p=><article className="provider-connected-card" key={p.provider}><div className="provider-logo">{p.provider==="stripe"?"S":p.provider==="paypal"?"P":"PD"}</div><div><strong>{p.provider==="stripe"?"Stripe":p.provider==="paypal"?"PayPal":"Paddle"}</strong><span>{p.provider_account_label||p.provider_account_id||p.key_hint}</span><small>{p.environment} · {p.status} · {p.key_hint}</small></div><button onClick={()=>disconnectPlatformProvider(p.provider)}>{t({fr:"Déconnecter",ar:"قطع الاتصال",en:"Disconnect"})}</button></article>)}</div>
      </div>
      <p className="provider-security-note">🔐 {t({fr:"Les identifiants Vydys sont chiffrés dans Supabase Vault et ne sont jamais renvoyés au navigateur.",ar:"يتم تشفير بيانات Vydys داخل Supabase Vault ولا تُعاد إلى المتصفح.",en:"Vydys credentials are encrypted in Supabase Vault and are never returned to the browser."})}</p>
      <article className="provider-webhook-note"><strong>{t({fr:"Webhook de réconciliation",ar:"Webhook للمطابقة",en:"Reconciliation webhook"})}</strong><code>https://ruzwqmtqyvtpgccqonqi.supabase.co/functions/v1/vydys-payment-webhook</code><small>Stripe: checkout.session.completed · PayPal: CHECKOUT.ORDER.APPROVED</small><p>{t({fr:"À configurer dans le dashboard du provider. Même si la page de retour est fermée, Vydys pourra confirmer le paiement côté serveur.",ar:"قم بإعداده في لوحة المزود. حتى لو أُغلقت صفحة العودة يمكن لـ Vydys تأكيد الدفع على الخادم.",en:"Configure it in the provider dashboard. Even if the return page is closed, Vydys can confirm the payment server-side."})}</p></article>
    </article>

    <article className="panel trainer-form payoneer-admin-card"><span className="eyebrow">Payoneer</span><h2>{t({fr:"Paiement international manuel vers Vydys",ar:"دفع دولي يدوي إلى Vydys",en:"Manual international payment to Vydys"})}</h2><p>{t({fr:"Le formateur paie Vydys via Payoneer puis envoie sa preuve. La Direction valide ensuite l’abonnement ou le frais.",ar:"يدفع المدرب إلى Vydys عبر Payoneer ثم يرسل الإثبات وتقوم الإدارة بالمراجعة.",en:"The instructor pays Vydys through Payoneer, uploads proof, then Management approves the subscription or fee."})}</p>
      <label className="checkbox-line"><input type="checkbox" checked={payoneerActive} onChange={e=>setPayoneerActive(e.target.checked)}/>{t({fr:"Activer Payoneer",ar:"تفعيل Payoneer",en:"Enable Payoneer"})}</label>
      <div className="form-grid">
        <label className="form-field"><span>{t({fr:"Compte / email destinataire",ar:"الحساب / البريد المستلم",en:"Recipient account / email"})}</span><input value={payoneerAccount} onChange={e=>setPayoneerAccount(e.target.value)} placeholder="Payoneer account"/></label>
        <label className="form-field"><span>{t({fr:"Devise",ar:"العملة",en:"Currency"})}</span><select value={payoneerCurrency} onChange={e=>setPayoneerCurrency(e.target.value)}>{currencies.map(x=><option key={x.code} value={x.code}>{x.code}</option>)}</select></label>
        <label className="form-field full-row"><span>{t({fr:"Instructions",ar:"التعليمات",en:"Instructions"})}</span><textarea rows={3} value={payoneerInstructions} onChange={e=>setPayoneerInstructions(e.target.value)} placeholder={t({fr:"Instructions de paiement Payoneer visibles par le formateur.",ar:"تعليمات Payoneer التي يراها المدرب.",en:"Payoneer payment instructions shown to instructors."})}/></label>
      </div><button className="btn" onClick={savePayoneer}>{t({fr:"Enregistrer Payoneer",ar:"حفظ Payoneer",en:"Save Payoneer"})}</button>
    </article>

    <article className="panel trainer-form admin-policy-card"><h2>{t({fr:"Règles plateforme",ar:"قواعد المنصة",en:"Platform rules"})}</h2><div className="form-grid">
      <label className="form-field"><span>{t({fr:"Délai de grâce abonnement (jours)",ar:"فترة سماح الاشتراك (أيام)",en:"Subscription grace period (days)"})}</span><input type="number" min="0" value={grace} onChange={e=>setGrace(e.target.value)}/></label>
      <label className="form-field checkbox-field"><input type="checkbox" checked={requireApproval} onChange={e=>setRequireApproval(e.target.checked)}/><span>{t({fr:"Validation Direction obligatoire avant publication",ar:"موافقة الإدارة مطلوبة قبل النشر",en:"Management approval required before publication"})}</span></label>
    </div><button className="btn" onClick={save}>{t({fr:"Enregistrer les paramètres",ar:"حفظ الإعدادات",en:"Save settings"})}</button>{message&&<p className="manual-note">{message}</p>}</article>
  </div></section>
}
