"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

type Plan="monthly"|"quarterly"|"annual";
type Method="click"|"bankily"|"sedad"|"masrvi";

export default function AbonnementPage(){
  const {t}=useLanguage();
  const [settings,setSettings]=useState<any>(null);
  const [plan,setPlan]=useState<Plan>("monthly");
  const [method,setMethod]=useState<Method>("click");
  const [proof,setProof]=useState<File|null>(null);
  const [reference,setReference]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{supabase.from("platform_settings").select("*").eq("id",1).single().then(({data})=>setSettings(data))},[]);
  if(!settings)return <section className="section page-top"><div className="container">...</div></section>;

  const prices={monthly:settings.trainer_monthly_price_mru,quarterly:settings.trainer_quarterly_price_mru,annual:settings.trainer_annual_price_mru};
  const amount=Number(prices[plan]||0);

  async function submit(e:FormEvent){
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    let proofPath:string|null=null;
    if(proof){
      const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      proofPath=`${user.id}/subscriptions/${crypto.randomUUID()}-${safe}`;
      const {error:upError}=await supabase.storage.from("trainer-files").upload(proofPath,proof,{contentType:proof.type});
      if(upError){setMessage(upError.message);return}
    }
    const {error}=await supabase.rpc("submit_trainer_subscription_secure",{
      p_plan:plan,
      p_payment_method:method,
      p_transaction_reference:reference,
      p_proof_path:proofPath
    });
    setMessage(error?error.message:t({fr:"Demande d'abonnement envoyée à la Direction.",ar:"تم إرسال طلب الاشتراك إلى الإدارة.",en:"Subscription request sent to Management."}));
  }

  return <section className="section page-top"><div className="container"><div className="page-hero"><span className="eyebrow">{t({fr:"Abonnement formateur",ar:"اشتراك المدرب",en:"Instructor subscription"})}</span><h1>{t({fr:"Activez votre accès professionnel",ar:"فعّل وصولك المهني",en:"Activate your professional access"})}</h1></div>
    <div className="pricing-grid">
      {(["monthly","quarterly","annual"] as Plan[]).map(p=><button className={plan===p?"plan-card selected":"plan-card"} onClick={()=>setPlan(p)} key={p}><span>{p==="monthly"?t({fr:"Mensuel",ar:"شهري",en:"Monthly"}):p==="quarterly"?t({fr:"Trimestriel",ar:"ربع سنوي",en:"Quarterly"}):t({fr:"Annuel",ar:"سنوي",en:"Annual"})}</span><strong>{Number(prices[p]||0).toLocaleString("fr-FR")} MRU</strong></button>)}
    </div>
    <form className="panel trainer-form" onSubmit={submit}>
      <h2>{t({fr:"Paiement de l'abonnement",ar:"دفع الاشتراك",en:"Subscription payment"})}</h2>
      <p>{t({fr:"Payez Vydys Academy puis envoyez votre preuve. La Direction activera votre abonnement après vérification.",ar:"ادفع لـ Vydys Academy ثم أرسل الإثبات. ستقوم الإدارة بالتفعيل بعد المراجعة.",en:"Pay Vydys Academy and upload proof. Management will activate your subscription after review."})}</p>
      <div className="payment-methods four">{(["click","bankily","sedad","masrvi"] as Method[]).map(m=><button type="button" key={m} className={method===m?"payment-option selected":"payment-option"} onClick={()=>setMethod(m)}><strong>{m[0].toUpperCase()+m.slice(1)}</strong></button>)}</div>
      <div className="pay-number"><span>{method.toUpperCase()}</span><strong>{settings.platform_payment_number}</strong></div>
      <div className="amount-box"><span>{t({fr:"Montant",ar:"المبلغ",en:"Amount"})}</span><strong>{amount.toLocaleString("fr-FR")} MRU</strong></div>
      <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Ajouter la preuve",ar:"أضف الإثبات",en:"Add proof"})}</strong></label>
      <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
      <button className="btn">{t({fr:"Envoyer pour validation",ar:"إرسال للمراجعة",en:"Submit for approval"})}</button>
      {message&&<p className="manual-note">{message}</p>}
    </form>
  </div></section>
}
