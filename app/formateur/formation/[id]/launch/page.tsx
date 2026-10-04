"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../../../components/language-provider";
import { supabase } from "../../../../../lib/supabase";

type Method="click"|"bankily"|"sedad"|"masrvi";

export default function CourseLaunchFeePage(){
  const {id}=useParams<{id:string}>();
  const {t}=useLanguage();
  const [course,setCourse]=useState<any>(null);
  const [settings,setSettings]=useState<any>(null);
  const [order,setOrder]=useState<any>(null);
  const [method,setMethod]=useState<Method>("bankily");
  const [reference,setReference]=useState("");
  const [proof,setProof]=useState<File|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const [{data:c},{data:s},{data:o}]=await Promise.all([
      supabase.from("courses").select("id,title_fr,status,launch_fee_status").eq("id",id).eq("instructor_id",user.id).maybeSingle(),
      supabase.from("platform_settings").select("course_launch_fee_enabled,course_launch_fee_amount,course_launch_fee_currency,course_launch_fee_local_mru,platform_payment_number").eq("id",1).single(),
      supabase.from("course_launch_fee_orders").select("*").eq("course_id",id).maybeSingle()
    ]);
    setCourse(c||false);setSettings(s);setOrder(o||null);
  }
  useEffect(()=>{load()},[id]);

  async function submit(e:FormEvent){
    e.preventDefault();setMessage("");
    if(!proof){setMessage(t({fr:"Ajoutez la preuve de paiement.",ar:"أضف إثبات الدفع.",en:"Add payment proof."}));return}
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    setBusy(true);
    const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${user.id}/launch-fees/${id}/${crypto.randomUUID()}-${safe}`;
    const {error:upError}=await supabase.storage.from("trainer-files").upload(path,proof,{contentType:proof.type});
    if(upError){setBusy(false);setMessage(upError.message);return}
    const {error}=await supabase.rpc("submit_course_launch_fee_manual",{p_course_id:id,p_payment_method:method,p_transaction_reference:reference,p_proof_path:path});
    setBusy(false);
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Paiement envoyé à la Direction pour validation.",ar:"تم إرسال الدفع للإدارة للمراجعة.",en:"Payment sent to Management for approval."}));setProof(null);setReference("");await load();
  }

  if(course===null||settings===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(course===false)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Formation introuvable",ar:"الدورة غير موجودة",en:"Course not found"})}</h1></article></div></section>;

  const localAmount=String(settings.course_launch_fee_currency)==="MRU"?Number(settings.course_launch_fee_amount||0):Number(settings.course_launch_fee_local_mru||0);
  const internationalAmount=Number(settings.course_launch_fee_amount||0);
  const internationalCurrency=settings.course_launch_fee_currency||"USD";
  const paid=course.status==="published"||course.launch_fee_status==="paid"||order?.status==="paid"||order?.status==="waived";

  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Course Launch</span><h1>{t({fr:"Finaliser le lancement",ar:"إكمال إطلاق الدورة",en:"Complete course launch"})}</h1><p>{course.title_fr}</p></div><Link className="btn btn-ghost" href={"/formateur/formation/"+id+"/builder"}>← Course Builder</Link></div>

    {message&&<p className="manual-note">{message}</p>}
    {paid?<article className="panel launch-paid-state"><span>✓</span><div><h2>{t({fr:"Formation publiée",ar:"تم نشر الدورة",en:"Course published"})}</h2><p>{t({fr:"Le frais de lancement a été validé ou annulé par la Direction.",ar:"تم اعتماد رسوم الإطلاق أو إعفاؤها من الإدارة.",en:"The launch fee has been approved or waived by Management."})}</p><Link className="btn" href="/formateur">{t({fr:"Retour au dashboard",ar:"العودة للوحة التحكم",en:"Back to dashboard"})}</Link></div></article>:course.status!=="approved_pending_fee"?<article className="panel"><h2>{t({fr:"La formation doit d’abord être approuvée par la Direction.",ar:"يجب اعتماد الدورة أولاً من الإدارة.",en:"The course must first be approved by Management."})}</h2></article>:<div className="launch-fee-layout">
      <section className="panel launch-fee-summary"><span className="eyebrow">{t({fr:"Frais Vydys",ar:"رسوم Vydys",en:"Vydys fee"})}</span><h2>{t({fr:"Une seule fois par nouvelle formation",ar:"مرة واحدة لكل دورة جديدة",en:"One time per new course"})}</h2><div className="launch-fee-big"><strong>{internationalAmount.toLocaleString("fr-FR")} {internationalCurrency}</strong><span>{t({fr:"référence internationale",ar:"المرجع الدولي",en:"international reference"})}</span></div><p>{t({fr:"Vydys ne prend ensuite aucune commission sur vos ventes. Les étudiants vous paient directement.",ar:"بعد ذلك لا تأخذ Vydys أي عمولة من مبيعاتك. يدفع الطلاب لك مباشرة.",en:"Vydys then takes no commission on your sales. Students pay you directly."})}</p>{order&&<div className={"launch-order-status "+order.status}>{order.status}</div>}</section>

      <form className="panel trainer-form" onSubmit={submit}><span className="eyebrow">{t({fr:"Paiement manuel Mauritanie",ar:"دفع يدوي في موريتانيا",en:"Mauritania manual payment"})}</span><h2>{t({fr:"Bankily / Masrvi / Sedad / Click",ar:"Bankily / Masrvi / Sedad / Click",en:"Bankily / Masrvi / Sedad / Click"})}</h2>
        {localAmount<=0?<p className="manual-note">{t({fr:"La Direction doit d’abord définir l’équivalent MRU du frais de lancement dans Admin → Tarifs.",ar:"يجب على الإدارة أولاً تحديد المعادل بالأوقية في الإدارة ← الأسعار.",en:"Management must first define the MRU equivalent of the launch fee in Admin → Pricing."})}</p>:<>
          <div className="amount-box"><span>{t({fr:"Montant à payer",ar:"المبلغ المطلوب",en:"Amount to pay"})}</span><strong>{localAmount.toLocaleString("fr-FR")} MRU</strong><small>{t({fr:"Équivalent fixé par l’Admin",ar:"معادل تحدده الإدارة",en:"Admin-set equivalent"})}</small></div>
          <div className="payment-methods four">{(["bankily","masrvi","sedad","click"] as Method[]).map(m=><button type="button" key={m} className={method===m?"payment-option selected":"payment-option"} onClick={()=>setMethod(m)}><strong>{m[0].toUpperCase()+m.slice(1)}</strong></button>)}</div>
          <div className="pay-number"><span>{method.toUpperCase()}</span><strong>{settings.platform_payment_number}</strong></div>
          <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Ajouter la preuve",ar:"أضف الإثبات",en:"Add proof"})}</strong></label>
          <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
          <button className="btn" disabled={busy}>{busy?"...":t({fr:"Envoyer pour validation",ar:"إرسال للمراجعة",en:"Submit for approval"})}</button>
        </>}
      </form>
    </div>}
  </div></section>
}
