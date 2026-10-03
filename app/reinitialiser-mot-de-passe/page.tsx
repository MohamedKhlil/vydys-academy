"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function ResetPage(){
  const {t}=useLanguage();
  const [value,setValue]=useState("");
  const [confirm,setConfirm]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();
    if(value.length<8){
      setMessage(t({fr:"Utilisez au moins 8 caractères.",ar:"استخدم 8 أحرف على الأقل.",en:"Use at least 8 characters."}));
      return;
    }
    if(value!==confirm){
      setMessage(t({fr:"Les deux valeurs ne correspondent pas.",ar:"القيمتان غير متطابقتين.",en:"The two values do not match."}));
      return;
    }
    setLoading(true);
    const {error}=await supabase.auth.updateUser({password:value});
    setLoading(false);
    setMessage(error?error.message:t({fr:"Mise à jour effectuée. Vous pouvez vous reconnecter.",ar:"تم التحديث. يمكنك تسجيل الدخول من جديد.",en:"Update completed. You can sign in again."}));
  }

  return <section className="auth-page"><div className="auth-card">
    <span className="brand-mark large-mark">V</span><span className="eyebrow">Vydys Academy</span>
    <h1>{t({fr:"Nouveau mot de passe",ar:"كلمة مرور جديدة",en:"New password"})}</h1>
    <form onSubmit={submit}>
      <label>{t({fr:"Nouveau mot de passe",ar:"كلمة المرور الجديدة",en:"New password"})}<input type="password" minLength={8} value={value} onChange={e=>setValue(e.target.value)} required/></label>
      <label>{t({fr:"Confirmer",ar:"تأكيد",en:"Confirm"})}<input type="password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>
      <button className="btn full" disabled={loading}>{loading?"...":t({fr:"Mettre à jour",ar:"تحديث",en:"Update"})}</button>
    </form>
    {message&&<div className="auth-note">{message}</div>}
  </div></section>
}
