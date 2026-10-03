"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function MotDePasseOubliePage(){
  const {t}=useLanguage();
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();setLoading(true);setMessage("");
    const redirectTo=window.location.origin+"/reinitialiser-mot-de-passe";
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});
    setLoading(false);
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Si ce compte existe, un lien de réinitialisation vient d'être envoyé.",ar:"إذا كان الحساب موجوداً، فقد تم إرسال رابط إعادة تعيين كلمة المرور.",en:"If this account exists, a password reset link has been sent."}));
  }

  return <section className="auth-page"><div className="auth-card">
    <span className="brand-mark large-mark">V</span><span className="eyebrow">Vydys Academy</span>
    <h1>{t({fr:"Mot de passe oublié",ar:"نسيت كلمة المرور",en:"Forgot password"})}</h1>
    <p>{t({fr:"Saisissez votre email pour recevoir un lien sécurisé.",ar:"أدخل بريدك الإلكتروني لاستلام رابط آمن.",en:"Enter your email to receive a secure reset link."})}</p>
    <form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><button className="btn full" disabled={loading}>{loading?"...":t({fr:"Envoyer le lien",ar:"إرسال الرابط",en:"Send reset link"})}</button></form>
    {message&&<div className="auth-note">{message}</div>}
  </div></section>
}
