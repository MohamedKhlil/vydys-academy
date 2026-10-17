"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "./language-provider";
import { trackGrowthEvent } from "../lib/growth-events";

export default function TalentContactForm({slug,available}:{slug:string;available:boolean}){
 const {t}=useLanguage();
 const [uid,setUid]=useState("");
 const [verified,setVerified]=useState<boolean|null>(null);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [submitted,setSubmitted]=useState(false);
 useEffect(()=>{let active=true;(async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!active)return;
   setUid(user?.id||"");
   if(!user){setVerified(false);return}
   const {data}=await supabase.from("career_companies").select("status").eq("user_id",user.id).maybeSingle();
   if(active)setVerified(data?.status==="approved");
 })();return()=>{active=false}},[]);
 if(!available)return null;
 async function submit(e:FormEvent){
  e.preventDefault();if(!uid||busy)return;
  if(message.trim().length<20||message.trim().length>1000){
   setNotice(t({fr:"Votre message doit contenir de 20 à 1 000 caractères.",ar:"يجب أن تحتوي الرسالة على 20 إلى 1000 حرف.",en:"Write 20 to 1,000 characters."}));return;
  }
  setBusy(true);setNotice("");
  const {error}=await supabase.rpc("career_request_talent_contact",{p_slug:slug,p_message:message.trim()});
  setBusy(false);
  if(error){setNotice(error.message);return}
  setSubmitted(true);
  void trackGrowthEvent("talent_contact_requested");
 }
 return <section className="panel talent-contact-form">
  <span className="eyebrow">VYDYS CAREER CONNECT</span>
  <h2>{t({fr:"Contacter ce talent",ar:"تواصل مع هذا الموهوب",en:"Contact this talent"})}</h2>
  <p>{t({fr:"Le candidat reçoit votre demande et décide s'il souhaite échanger avec vous. Ses coordonnées personnelles ne sont jamais communiquées automatiquement.",ar:"سيتلقى المرشح طلبك ويقرر إذا أراد التواصل، ولن تُشارك بياناته الشخصية تلقائياً.",en:"The candidate receives your request and chooses whether to chat. Their personal contact details are never disclosed automatically."})}</p>
  {submitted?<div role="status"><strong>{t({fr:"Demande envoyée",ar:"تم إرسال الطلب",en:"Request sent"})}</strong>
    <p>{t({fr:"Vous recevrez une notification si le candidat accepte.",ar:"ستصلك إشعارات عند الموافقة.",en:"You'll receive a notification if the candidate accepts."})}</p>
    <Link href="/carriere/contacts">{t({fr:"Mes demandes",ar:"طلباتي",en:"My requests"})} →</Link></div>
  :!uid?<Link className="btn" href={"/connexion?next="+encodeURIComponent("/talent/"+slug)}>
    {t({fr:"Me connecter pour contacter",ar:"تسجيل الدخول للتواصل",en:"Sign in to contact"})}</Link>
  :verified!==true?<div className="career-apply-info">
      <p>{t({fr:"Seuls les recruteurs d'entreprises validées peuvent envoyer une première demande. La vérification se fait depuis l'espace entreprise.",ar:"يمكن للشركات المعتمدة فقط إرسال طلب تواصل أولي. اطلب التحقق عبر مساحة الشركة.",en:"Only approved employers can initiate contact. Request verification in your employer workspace."})}</p>
      <Link href="/carriere/entreprise">{t({fr:"Vérifier mon entreprise",ar:"التحقق من شركتي",en:"Verify my company"})} →</Link>
    </div>
  :<form onSubmit={e=>void submit(e)}>
    <label><span>{t({fr:"Votre message professionnel",ar:"رسالتك المهنية",en:"Your professional message"})}</span>
      <textarea required minLength={20} maxLength={1000} rows={4} value={message} onChange={e=>setMessage(e.target.value)}
        placeholder={t({fr:"Présentez votre entreprise et votre proposition de collaboration.",ar:"عرف بشركتك وفرصة التعاون.",en:"Introduce yourself, your company and the opportunity."})}/></label>
    {notice&&<p role="alert" className="career-form-error">{notice}</p>}
    <button className="btn" type="submit" disabled={busy}>{busy?t({fr:"Envoi…",ar:"جار الإرسال...",en:"Sending…"}):t({fr:"Envoyer la demande",ar:"إرسال الطلب",en:"Send contact request"})}</button>
   </form>}
 </section>;
}
