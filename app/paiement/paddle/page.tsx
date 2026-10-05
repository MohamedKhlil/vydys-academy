"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

declare global{
  interface Window{
    Paddle?:any;
  }
}

export default function PaddleCheckoutPage(){
  const {t}=useLanguage();
  const [orderId,setOrderId]=useState("");
  const opened=useRef(false);
  const [state,setState]=useState<"loading"|"ready"|"error">("loading");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get("order_id")||"";
    setOrderId(id);
  },[]);

  useEffect(()=>{
    if(!orderId)return;
    let cancelled=false;

    async function start(){
      if(!orderId){setState("error");setMessage("Missing order");return}
      const {data,error}=await supabase.functions.invoke("vydys-platform-billing",{body:{action:"get_paddle_checkout",order_id:orderId}});
      if(cancelled)return;
      if(error||data?.error){setState("error");setMessage(data?.detail||data?.error||error?.message||"Checkout error");return}

      function openCheckout(){
        if(cancelled||opened.current||!window.Paddle)return;
        opened.current=true;
        try{
          if(data.environment==="sandbox")window.Paddle.Environment.set("sandbox");
          window.Paddle.Initialize({
            token:data.client_token,
            checkout:{settings:{
              displayMode:"overlay",
              theme:"light",
              locale:"en",
              successUrl:data.success_url
            }}
          });
          window.Paddle.Checkout.open({transactionId:data.transaction_id});
          setState("ready");
        }catch(e:any){
          setState("error");setMessage(e?.message||"Paddle checkout error");
        }
      }

      if(window.Paddle){openCheckout();return}
      const existing=document.querySelector('script[data-vydys-paddle="1"]') as HTMLScriptElement|null;
      if(existing){existing.addEventListener("load",openCheckout,{once:true});return}
      const script=document.createElement("script");
      script.src="https://cdn.paddle.com/paddle/v2/paddle.js";
      script.async=true;script.dataset.vydysPaddle="1";
      script.onload=openCheckout;
      script.onerror=()=>{setState("error");setMessage("Unable to load Paddle")};
      document.head.appendChild(script);
    }

    start();
    return()=>{cancelled=true};
  },[orderId]);

  return <section className="section page-top"><div className="container">
    <article className="panel payment-return-card">
      <div className={"payment-return-icon "+(state==="error"?"error":"checking")}>{state==="error"?"!":"P"}</div>
      <span className="eyebrow">Paddle · Vydys</span>
      <h1>{state==="error"?t({fr:"Impossible d’ouvrir Paddle",ar:"تعذر فتح Paddle",en:"Unable to open Paddle"}):t({fr:"Ouverture du paiement sécurisé",ar:"فتح الدفع الآمن",en:"Opening secure checkout"})}</h1>
      <p>{state==="error"?message:t({fr:"Le checkout Paddle va s’ouvrir automatiquement. Après paiement, Vydys vérifiera la transaction côté serveur avant d’activer votre abonnement ou votre publication.",ar:"سيفتح دفع Paddle تلقائياً وبعد الدفع تتحقق Vydys من العملية على الخادم قبل التفعيل.",en:"Paddle Checkout will open automatically. After payment, Vydys verifies the transaction server-side before activating your subscription or publication."})}</p>
      {state==="ready"&&<button className="btn" onClick={()=>{opened.current=false;window.location.reload()}}>{t({fr:"Rouvrir Paddle",ar:"إعادة فتح Paddle",en:"Reopen Paddle"})}</button>}
    </article>
  </div></section>
}
