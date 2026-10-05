"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function ResetPage(){
  const {t}=useLanguage();
  const [value,setValue]=useState("");
  const [confirm,setConfirm]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const [recoveryReady,setRecoveryReady]=useState(false);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    let mounted=true;

    const finishCheck=async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      const currentUrl=new URL(window.location.href);
      const recoveryMarker=
        window.location.hash.includes("type=recovery") ||
        currentUrl.searchParams.get("type")==="recovery";

      if(mounted && session && recoveryMarker){
        setRecoveryReady(true);
      }
      if(mounted) setChecking(false);
    };

    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!mounted) return;
      if(event==="PASSWORD_RECOVERY" && session){
        setRecoveryReady(true);
        setChecking(false);
        setMessage("");
      }
    });

    void finishCheck();

    return ()=>{
      mounted=false;
      subscription.unsubscribe();
    };
  },[]);

  async function submit(e:FormEvent){
    e.preventDefault();
    setMessage("");

    if(!recoveryReady){
      setMessage(t({
        fr:"Ce lien de récupération est invalide ou expiré. Demandez un nouveau lien.",
        ar:"رابط الاسترداد غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً.",
        en:"This recovery link is invalid or expired. Request a new link."
      }));
      return;
    }

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
    if(!error){
      await supabase.auth.signOut();
      setRecoveryReady(false);
    }
    setLoading(false);

    setMessage(error
      ? t({
          fr:"Impossible de mettre à jour le mot de passe. Demandez un nouveau lien de récupération.",
          ar:"تعذر تحديث كلمة المرور. اطلب رابط استرداد جديداً.",
          en:"Unable to update the password. Request a new recovery link."
        })
      : t({
          fr:"Mot de passe mis à jour. Vous pouvez maintenant vous reconnecter.",
          ar:"تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول من جديد.",
          en:"Password updated. You can now sign in again."
        })
    );
  }

  return <section className="auth-page"><div className="auth-card">
    <span className="brand-mark large-mark">V</span><span className="eyebrow">Vydys Academy</span>
    <h1>{t({fr:"Nouveau mot de passe",ar:"كلمة مرور جديدة",en:"New password"})}</h1>

    {checking ? (
      <div className="auth-note">{t({
        fr:"Vérification du lien sécurisé…",
        ar:"جارٍ التحقق من الرابط الآمن…",
        en:"Checking secure recovery link…"
      })}</div>
    ) : recoveryReady ? (
      <form onSubmit={submit}>
        <label>{t({fr:"Nouveau mot de passe",ar:"كلمة المرور الجديدة",en:"New password"})}<input type="password" minLength={8} value={value} onChange={e=>setValue(e.target.value)} autoComplete="new-password" required/></label>
        <label>{t({fr:"Confirmer",ar:"تأكيد",en:"Confirm"})}<input type="password" minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/></label>
        <button className="btn full" disabled={loading}>{loading?"...":t({fr:"Mettre à jour",ar:"تحديث",en:"Update"})}</button>
      </form>
    ) : (
      <div className="auth-note">
        {t({
          fr:"Ce lien de récupération est invalide ou expiré.",
          ar:"رابط الاسترداد غير صالح أو منتهي الصلاحية.",
          en:"This recovery link is invalid or expired."
        })}{" "}
        <a href="/mot-de-passe-oublie">{t({
          fr:"Demander un nouveau lien",
          ar:"اطلب رابطاً جديداً",
          en:"Request a new link"
        })}</a>
      </div>
    )}

    {message&&<div className="auth-note">{message}</div>}
  </div></section>
}
