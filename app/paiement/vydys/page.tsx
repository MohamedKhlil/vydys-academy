"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function VydysBillingReturn(){
  const {t}=useLanguage();
  const started=useRef(false);
  const [state,setState]=useState<"checking"|"success"|"error">("checking");
  const [purpose,setPurpose]=useState("");
  const [courseId,setCourseId]=useState("");
  const [classroomId,setClassroomId]=useState("");
  const [message,setMessage]=useState("");

  useEffect(()=>{if(started.current)return;started.current=true;(async()=>{
    const params=new URLSearchParams(window.location.search);
    const orderId=params.get("order_id")||"";
    const sessionId=params.get("session_id")||params.get("token")||"";
    if(!orderId){setState("error");setMessage(t({fr:"Référence de paiement manquante.",ar:"مرجع الدفع مفقود.",en:"Missing payment reference."}));return}
    const {data,error}=await supabase.functions.invoke("vydys-platform-billing",{body:{action:"confirm_checkout",order_id:orderId,session_id:sessionId}});
    if(error||data?.error){setState("error");setMessage(data?.detail||data?.error||error?.message||"Billing confirmation failed");return}
    setPurpose(data?.purpose||"");setCourseId(data?.course_id||"");setClassroomId(data?.classroom_id||"");setState("success");
  })()},[]);

  return <section className="auth-page"><div className="payment-return-card">
    {state==="checking"?<><div className="payment-return-icon checking">…</div><span className="eyebrow">Vydys Billing</span><h1>{t({fr:"Confirmation du paiement",ar:"تأكيد الدفع",en:"Confirming payment"})}</h1><p>{t({fr:"Nous vérifions le paiement directement auprès du provider.",ar:"نقوم بالتحقق من الدفع مباشرة لدى المزود.",en:"We are verifying the payment directly with the provider."})}</p></>:state==="success"?<><div className="payment-return-icon success">✓</div><span className="eyebrow">{t({fr:"Paiement confirmé",ar:"تم تأكيد الدفع",en:"Payment confirmed"})}</span><h1>{purpose==="course_launch"?t({fr:"Votre formation est publiée.",ar:"تم نشر دورتك.",en:"Your course is published."}):purpose==="classroom_launch"?t({fr:"Votre Classroom est publiée.",ar:"تم نشر فصلك المباشر.",en:"Your Classroom is published."}):t({fr:"Votre abonnement est actif.",ar:"اشتراكك نشط.",en:"Your subscription is active."})}</h1><p>{t({fr:"La confirmation a été effectuée automatiquement côté serveur.",ar:"تم التأكيد تلقائياً من جهة الخادم.",en:"The payment was confirmed automatically server-side."})}</p><div className="payment-return-actions"><Link className="btn" href="/formateur">{t({fr:"Ouvrir Vydys Studio",ar:"فتح Vydys Studio",en:"Open Vydys Studio"})}</Link>{courseId&&<Link className="btn btn-ghost" href={"/formateur/formation/"+courseId+"/builder"}>Course Builder</Link>}{classroomId&&<Link className="btn btn-ghost" href={"/formateur/classrooms/"+classroomId}>Classroom Studio</Link>}</div></>:<><div className="payment-return-icon error">!</div><span className="eyebrow">{t({fr:"Paiement non confirmé",ar:"لم يتم تأكيد الدفع",en:"Payment not confirmed"})}</span><h1>{t({fr:"Vérification impossible.",ar:"تعذر التحقق.",en:"Unable to verify."})}</h1><p>{message}</p><Link className="btn" href="/formateur">{t({fr:"Retour au dashboard",ar:"العودة للوحة التحكم",en:"Back to dashboard"})}</Link></>}
  </div></section>
}
