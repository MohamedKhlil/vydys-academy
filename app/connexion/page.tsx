"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function ConnexionPage(){
  const { t } = useLanguage();
  const [mode,setMode]=useState<"login"|"register">("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [fullName,setFullName]=useState("");
  const [phone,setPhone]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const [accepted,setAccepted]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();
    setLoading(true); setMessage("");
    try{
      if(mode==="register"){
        const { error } = await supabase.auth.signUp({
          email,password,
          options:{data:{full_name:fullName,phone,terms_accepted:true,terms_version:"2026-10-03"}}
        });
        if(error) throw error;
        setMessage(t({
          fr:"Compte créé. Vérifiez votre email si une confirmation est demandée, puis connectez-vous.",
          ar:"تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا طُلب التأكيد ثم سجّل الدخول.",
          en:"Account created. Check your email if confirmation is required, then sign in."
        }));
        setMode("login");
      }else{
        const { data, error } = await supabase.auth.signInWithPassword({email,password});
        if(error) throw error;

        const userId=data.user?.id;
        if(!userId){window.location.href="/dashboard";return}

        const { data:profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id",userId)
          .single();

        window.location.href =
          profile?.role==="direction" || profile?.role==="admin"
            ? "/admin"
            : "/dashboard";
      }
    }catch(err){
      setMessage(err instanceof Error ? err.message : "Erreur");
    }finally{setLoading(false)}
  }

  return <section className="auth-page"><div className="auth-card">
    <span className="brand-mark large-mark">V</span><span className="eyebrow">Vydys Academy</span>
    <h1>{mode==="login"?t({fr:"Bienvenue",ar:"مرحباً",en:"Welcome"}):t({fr:"Créer un compte",ar:"إنشاء حساب",en:"Create account"})}</h1>
    <p>{mode==="login"?t({fr:"Connectez-vous à votre espace de formation.",ar:"سجّل الدخول إلى مساحة التدريب الخاصة بك.",en:"Sign in to your learning space."}):t({fr:"Créez votre compte étudiant.",ar:"أنشئ حساب الطالب الخاص بك.",en:"Create your student account."})}</p>
    <form onSubmit={submit}>
      {mode==="register" && <>
        <label>{t({fr:"Nom complet",ar:"الاسم الكامل",en:"Full name"})}<input value={fullName} onChange={e=>setFullName(e.target.value)} required /></label>
        <label>{t({fr:"Téléphone",ar:"رقم الهاتف",en:"Phone"})}<input value={phone} onChange={e=>setPhone(e.target.value)} required /></label>
        <label className="legal-check"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>{t({fr:"J’accepte les",ar:"أوافق على",en:"I accept the"})} <a href="/conditions" target="_blank">{t({fr:"Conditions d’utilisation",ar:"شروط الاستخدام",en:"Terms of Use"})}</a> {t({fr:"et la",ar:"و",en:"and"})} <a href="/confidentialite" target="_blank">{t({fr:"Politique de confidentialité",ar:"سياسة الخصوصية",en:"Privacy Policy"})}</a>.</span></label>
      </>}
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
      <label>{t({fr:"Mot de passe",ar:"كلمة المرور",en:"Password"})}<input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required /></label>
      <button className="btn full" disabled={loading||(mode==="register"&&!accepted)}>{loading?"...":mode==="login"?t({fr:"Se connecter",ar:"تسجيل الدخول",en:"Sign in"}):t({fr:"Créer mon compte",ar:"إنشاء الحساب",en:"Create account"})}</button>
    </form>
    {mode==="login"&&<a className="auth-link" href="/mot-de-passe-oublie">{t({fr:"Mot de passe oublié ?",ar:"نسيت كلمة المرور؟",en:"Forgot password?"})}</a>}
    {message && <div className="auth-note">{message}</div>}
    <button className="auth-switch" onClick={()=>setMode(mode==="login"?"register":"login")}>
      {mode==="login"?t({fr:"Pas encore de compte ? S'inscrire",ar:"ليس لديك حساب؟ سجّل الآن",en:"No account yet? Register"}):t({fr:"Déjà inscrit ? Se connecter",ar:"لديك حساب؟ سجّل الدخول",en:"Already registered? Sign in"})}
    </button>
  </div></section>
}
