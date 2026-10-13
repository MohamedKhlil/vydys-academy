"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./language-provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function MobileInstallPrompt(){
  const {t}=useLanguage();
  const [deferred,setDeferred]=useState<BeforeInstallPromptEvent|null>(null);
  const [visible,setVisible]=useState(false);
  const [ios,setIos]=useState(false);
  const [showIosHelp,setShowIosHelp]=useState(false);
  const [showGenericHelp,setShowGenericHelp]=useState(false);

  useEffect(()=>{
    if(typeof window==="undefined")return;
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }

    const standalone=window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone===true;
    if(standalone)return;

    const ua=navigator.userAgent||"";
    const isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.matchMedia("(max-width: 900px)").matches;
    if(!isMobile)return;

    const isIos=/iPhone|iPad|iPod/i.test(ua);
    setIos(isIos);

    const dismissedAt=Number(localStorage.getItem("vydys-install-dismissed-at")||0);
    const canShow=!dismissedAt || Date.now()-dismissedAt>7*24*60*60*1000;

    const onPrompt=(event:Event)=>{
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      if(canShow)setVisible(true);
    };
    const onForce=()=>{
      setVisible(true);
      if(isIos)setShowIosHelp(true);
      else if(!deferred)setShowGenericHelp(true);
    };
    const onInstalled=()=>{
      setVisible(false);
      localStorage.removeItem("vydys-install-dismissed-at");
    };

    window.addEventListener("beforeinstallprompt",onPrompt);
    window.addEventListener("appinstalled",onInstalled);
    window.addEventListener("vydys:install",onForce);

    const timer=window.setTimeout(()=>{
      if(canShow && isIos)setVisible(true);
    },1600);

    return()=>{
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt",onPrompt);
      window.removeEventListener("appinstalled",onInstalled);
      window.removeEventListener("vydys:install",onForce);
    };
  },[]);

  async function install(){
    if(ios){setShowIosHelp(true);return}
    if(!deferred){
      setShowGenericHelp(true);
      setVisible(true);
      return;
    }
    await deferred.prompt();
    const result=await deferred.userChoice;
    if(result.outcome==="accepted")setVisible(false);
    setDeferred(null);
  }

  function dismiss(){
    localStorage.setItem("vydys-install-dismissed-at",String(Date.now()));
    setVisible(false);
  }

  if(!visible)return null;

  return <aside className="mobile-install-prompt" role="dialog" aria-label={t({fr:"Installer Vydys",ar:"تثبيت Vydys",en:"Install Vydys"})}>
    <button className="mobile-install-close" onClick={dismiss} aria-label={t({fr:"Fermer",ar:"إغلاق",en:"Close"})}>×</button>
    <div className="mobile-install-head">
      <img src="/vydys-icon.svg" alt=""/>
      <div><strong>{t({fr:"Installer Vydys",ar:"ثبّت Vydys",en:"Install Vydys"})}</strong><small>{t({fr:"Accès rapide depuis votre téléphone",ar:"وصول سريع من هاتفك",en:"Fast access from your phone"})}</small></div>
    </div>
    <p>{t({fr:"Ajoutez Vydys à votre écran d’accueil comme une application.",ar:"أضف Vydys إلى شاشتك الرئيسية كتطبيق.",en:"Add Vydys to your home screen like an app."})}</p>
    {ios&&showIosHelp&&<div className="ios-install-help">
      <span>1. {t({fr:"Touchez Partager",ar:"اضغط مشاركة",en:"Tap Share"})}</span>
      <span>2. {t({fr:"Choisissez « Sur l’écran d’accueil »",ar:"اختر « إضافة إلى الشاشة الرئيسية »",en:"Choose “Add to Home Screen”"})}</span>
      <span>3. {t({fr:"Touchez Ajouter",ar:"اضغط إضافة",en:"Tap Add"})}</span>
    </div>}
    {!ios&&showGenericHelp&&<div className="ios-install-help">
      <span>1. {t({fr:"Ouvrez le menu du navigateur (⋮)",ar:"افتح قائمة المتصفح (⋮)",en:"Open the browser menu (⋮)"})}</span>
      <span>2. {t({fr:"Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil »",ar:"اختر « تثبيت التطبيق » أو « إضافة إلى الشاشة الرئيسية »",en:"Choose “Install app” or “Add to Home screen”"})}</span>
    </div>}
    <div className="mobile-install-actions">
      <button className="btn" onClick={install}>{ios?t({fr:"Comment installer",ar:"طريقة التثبيت",en:"How to install"}):t({fr:"Installer maintenant",ar:"ثبّت الآن",en:"Install now"})}</button>
      <button className="btn btn-ghost" onClick={dismiss}>{t({fr:"Plus tard",ar:"لاحقاً",en:"Later"})}</button>
    </div>
  </aside>;
}
