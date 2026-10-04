"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function InternationalPaymentReturn(){
  const {t}=useLanguage();
  const started=useRef(false);
  const [state,setState]=useState<"checking"|"success"|"error">("checking");
  const [message,setMessage]=useState("");
  const [courseSlug,setCourseSlug]=useState("");
  const [classroomSlug,setClassroomSlug]=useState("");

  useEffect(()=>{if(started.current)return;started.current=true;(async()=>{
    const params=new URLSearchParams(window.location.search);
    const orderId=params.get("order_id")||"";
    const sessionId=params.get("session_id")||params.get("token")||"";
    if(!orderId){setState("error");setMessage(t({fr:"Référence de commande manquante.",ar:"مرجع الطلب مفقود.",en:"Missing order reference."}));return}
    const {data,error}=await supabase.functions.invoke("vydys-payments",{body:{action:"confirm_checkout",order_id:orderId,session_id:sessionId}});
    if(error||data?.error){setState("error");setMessage(data?.detail||data?.error||error?.message||"Payment confirmation failed");return}
    if(data?.course_id){
      const {data:c}=await supabase.from("courses").select("slug").eq("id",data.course_id).maybeSingle();
      setCourseSlug(c?.slug||"");
    }
    if(data?.classroom_id){
      const {data:room}=await supabase.from("classrooms").select("slug").eq("id",data.classroom_id).maybeSingle();
      setClassroomSlug(room?.slug||"");
    }
    setState("success");
  })()},[]);

  return <section className="auth-page"><div className="payment-return-card">
    {state==="checking"?<><div className="payment-return-icon checking">…</div><span className="eyebrow">{t({fr:"Confirmation sécurisée",ar:"تأكيد آمن",en:"Secure confirmation"})}</span><h1>{t({fr:"Vérification du paiement",ar:"التحقق من الدفع",en:"Verifying payment"})}</h1><p>{t({fr:"Vydys interroge directement le provider du formateur avant d’activer votre accès.",ar:"يتحقق Vydys مباشرة من مزود دفع المدرب قبل تفعيل وصولك.",en:"Vydys is verifying the payment directly with the instructor's provider before granting access."})}</p></>:state==="success"?<><div className="payment-return-icon success">✓</div><span className="eyebrow">{t({fr:"Paiement confirmé",ar:"تم تأكيد الدفع",en:"Payment confirmed"})}</span><h1>{classroomSlug?t({fr:"Votre Classroom est activée.",ar:"تم تفعيل فصلك المباشر.",en:"Your Classroom is active."}):t({fr:"Votre formation est activée.",ar:"تم تفعيل دورتك.",en:"Your course is active."})}</h1><p>{t({fr:"Le paiement a été confirmé automatiquement. Les fonds ont été encaissés sur le compte marchand du formateur.",ar:"تم تأكيد الدفع تلقائياً وتم استلام الأموال في حساب المدرب التجاري.",en:"The payment was confirmed automatically. Funds were collected by the instructor's merchant account."})}</p><div className="payment-return-actions"><Link className="btn" href="/dashboard">{t({fr:"Ouvrir mon espace",ar:"فتح حسابي",en:"Open dashboard"})}</Link>{courseSlug&&<Link className="btn btn-ghost" href={"/apprendre/"+courseSlug}>{t({fr:"Commencer la formation",ar:"بدء الدورة",en:"Start course"})}</Link>}{classroomSlug&&<Link className="btn btn-ghost" href={"/classroom/"+classroomSlug}>{t({fr:"Ouvrir la Classroom",ar:"فتح الفصل",en:"Open Classroom"})}</Link>}</div></>:<><div className="payment-return-icon error">!</div><span className="eyebrow">{t({fr:"Confirmation impossible",ar:"تعذر التأكيد",en:"Unable to confirm"})}</span><h1>{t({fr:"Le paiement n’a pas été validé.",ar:"لم يتم تأكيد الدفع.",en:"Payment was not verified."})}</h1><p>{message}</p><div className="payment-return-actions"><Link className="btn" href="/formations">{t({fr:"Retour aux formations",ar:"العودة للدورات",en:"Back to courses"})}</Link><Link className="btn btn-ghost" href="/support">{t({fr:"Contacter le support",ar:"اتصل بالدعم",en:"Contact support"})}</Link></div></>}
  </div></section>
}
