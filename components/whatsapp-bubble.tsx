"use client";

import { useMemo } from "react";

export default function WhatsAppBubble({number,message}:{number?:string|null;message?:string}){
  const href=useMemo(()=>{
    const raw=String(number||"").replace(/\D/g,"");
    if(!raw)return "";
    const normalized=raw.length===8?"222"+raw:raw;
    const text=encodeURIComponent(message||"Bonjour, je souhaite avoir plus d'informations sur votre formation Vydys.");
    return "https://wa.me/"+normalized+"?text="+text;
  },[number,message]);

  if(!href)return null;
  return <a className="whatsapp-bubble" href={href} target="_blank" rel="noreferrer" aria-label="WhatsApp">
    <span className="whatsapp-bubble-icon">WA</span>
    <span className="whatsapp-bubble-text">WhatsApp</span>
  </a>;
}
