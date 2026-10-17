"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

const VISITOR_KEY="vydys_analytics_visitor";
const SESSION_KEY="vydys_analytics_session";
const ENTRY_KEY="vydys_analytics_entry_sent";

function getOrCreate(storage:Storage,key:string){
  let value=storage.getItem(key);
  if(!value){
    value=crypto.randomUUID();
    storage.setItem(key,value);
  }
  return value;
}

function getDevice(){
  const ua=navigator.userAgent.toLowerCase();
  const width=window.innerWidth||screen.width||0;
  if(/ipad|tablet|playbook|silk/.test(ua)||(width>=600&&width<=1024&&/android/.test(ua)))return "tablet";
  if(/mobi|iphone|ipod|android/.test(ua)||width<600)return "mobile";
  return "desktop";
}

function getBrowser(){
  const ua=navigator.userAgent;
  if(/Edg\//.test(ua))return "Edge";
  if(/OPR\//.test(ua))return "Opera";
  if(/Chrome\//.test(ua)&&!/Edg\//.test(ua))return "Chrome";
  if(/Firefox\//.test(ua))return "Firefox";
  if(/Safari\//.test(ua)&&!/Chrome\//.test(ua))return "Safari";
  return "Other";
}

function campaignTags(){
  const params=new URLSearchParams(window.location.search);
  const clean=(field:string,max:number)=>{
    const raw=params.get(field)||"";
    // Campaign names should never contain email addresses, URLs or IDs.
    return raw.toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,max)||null;
  };
  return {
    utm_source:clean("utm_source",48),
    utm_medium:clean("utm_medium",48),
    utm_campaign:clean("utm_campaign",64)
  };
}

function referrerHost(){
  if(!document.referrer)return "";
  try{return new URL(document.referrer).hostname.toLowerCase()}catch{return ""}
}

export default function SiteAnalyticsTracker(){
  const pathname=usePathname();

  useEffect(()=>{
    if(!pathname||typeof window==="undefined")return;

    const timer=window.setTimeout(async()=>{
      try{
        const visitorId=getOrCreate(localStorage,VISITOR_KEY);
        const sessionId=getOrCreate(sessionStorage,SESSION_KEY);
        const isEntry=sessionStorage.getItem(ENTRY_KEY)!=="1";
        const {data:{session}}=await supabase.auth.getSession();

        const {error}=await supabase.from("site_page_views").insert({
          visitor_id:visitorId,
          session_id:sessionId,
          user_id:session?.user?.id||null,
          path:pathname.slice(0,500),
          page_title:document.title.slice(0,250),
          referrer:isEntry?document.referrer.slice(0,1000):null,
          referrer_host:isEntry?referrerHost():null,
          is_entry:isEntry,
          device:getDevice(),
          browser:getBrowser(),
          language:(navigator.language||"").slice(0,20),
          ...(isEntry?campaignTags():{})
        });

        if(!error&&isEntry)sessionStorage.setItem(ENTRY_KEY,"1");
      }catch{
        // Analytics must never interfere with the user experience.
      }
    },350);

    return()=>window.clearTimeout(timer);
  },[pathname]);

  return null;
}
