"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase, supabasePublishableKey, supabaseUrl } from "../../lib/supabase";

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
  const [magicEmail,setMagicEmail]=useState("");
  const [quickLoading,setQuickLoading]=useState<"google"|"magic"|null>(null);
  const [googleEnabled,setGoogleEnabled]=useState<boolean|null>(null);

  useEffect(()=>{
    let active=true;
    fetch(supabaseUrl+"/auth/v1/settings",{
      headers:{apikey:supabasePublishableKey}
    })
      .then(async response=>{
        if(!response.ok) throw new Error("Auth settings unavailable");
        return response.json();
      })
      .then(settings=>{
        if(active) setGoogleEnabled(Boolean(settings?.external?.google));
      })
      .catch(()=>{
        if(active) setGoogleEnabled(false);
      });
    return()=>{active=false};
  },[]);

  function authRedirect(){
    if(typeof window==="undefined") return "https://www.vydys.com/auth/complete";
    return window.location.origin+"/auth/complete";
  }

  async function signInGoogle(){
    setMessage("");
    if(googleEnabled!==true){
      setMessage(t({
        fr:"Google est déjà intégré dans Vydys, mais son activation OAuth doit encore être finalisée côté Supabase.",
        ar:"تم دمج Google في Vydys، لكن يجب إكمال تفعيل OAuth في Supabase.",
        en:"Google is integrated in Vydys, but its OAuth activation still needs to be completed in Supabase."
      }));
      return;
    }
    setQuickLoading("google");
    try{
      const {error}=await supabase.auth.signInWithOAuth({
        provider:"google",
        options:{
          redirectTo:authRedirect(),
          queryParams:{access_type:"offline",prompt:"select_account"}
        }
      });
      if(error) throw error;
    }catch(err){
      setMessage(err instanceof Error?err.message:t({
        fr:"Connexion Google indisponible pour le moment.",
        ar:"تسجيل الدخول عبر Google غير متاح حالياً.",
        en:"Google sign-in is currently unavailable."
      }));
      setQuickLoading(null);
    }
  }

  async function sendMagicLink(){
    const target=(magicEmail||email).trim();
    if(!target){
      setMessage(t({
        fr:"Entrez votre adresse email pour recevoir le lien de connexion.",
        ar:"أدخل بريدك الإلكتروني لاستلام رابط تسجيل الدخول.",
        en:"Enter your email address to receive a sign-in link."
      }));
      return;
    }
    setMessage("");
    setQuickLoading("magic");
    try{
      const {error}=await supabase.auth.signInWithOtp({
        email:target,
        options:{
          emailRedirectTo:authRedirect(),
          shouldCreateUser:true,
          data:{
            terms_accepted:true,
            terms_version:"2026-10-03",
            signup_source:"magic_link"
          }
        }
      });
      if(error) throw error;
      setMagicEmail(target);
      setMessage(t({
        fr:"Lien envoyé. Ouvrez votre email et cliquez sur le lien pour entrer dans Vydys.",
        ar:"تم إرسال الرابط. افتح بريدك الإلكتروني واضغط على الرابط للدخول إلى Vydys.",
        en:"Link sent. Open your email and click the link to enter Vydys."
      }));
    }catch(err){
      setMessage(err instanceof Error?err.message:"Erreur");
    }finally{
      setQuickLoading(null);
    }
  }

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

    <div className="auth-quick">
      <button type="button" className={"auth-provider-btn google"+(googleEnabled===false?" unavailable":"")} onClick={signInGoogle} disabled={quickLoading!==null||loading||googleEnabled===null}>
        <span className="auth-provider-icon google-icon">G</span>
        <strong>{quickLoading==="google"?"...":googleEnabled===null?t({fr:"Vérification Google...",ar:"جارٍ التحقق من Google...",en:"Checking Google..."}):googleEnabled===false?t({fr:"Google · activation à finaliser",ar:"Google · التفعيل غير مكتمل",en:"Google · activation pending"}):t({fr:"Continuer avec Google",ar:"المتابعة باستخدام Google",en:"Continue with Google"})}</strong>
      </button>
      {googleEnabled===false&&<small className="auth-provider-status">{t({
        fr:"Le bouton s’activera automatiquement dès que Google OAuth sera activé dans Supabase.",
        ar:"سيتم تفعيل الزر تلقائياً بمجرد تفعيل Google OAuth في Supabase.",
        en:"The button will activate automatically as soon as Google OAuth is enabled in Supabase."
      })}</small>}

      <div className="auth-divider"><span>{t({fr:"ou",ar:"أو",en:"or"})}</span></div>

      <div className="auth-magic-box">
        <div className="auth-magic-copy">
          <span className="auth-provider-icon">✉</span>
          <div>
            <strong>{t({fr:"Connexion sans mot de passe",ar:"تسجيل الدخول بدون كلمة مرور",en:"Passwordless sign-in"})}</strong>
            <small>{t({fr:"Recevez un lien sécurisé par email.",ar:"استلم رابطاً آمناً عبر البريد الإلكتروني.",en:"Receive a secure link by email."})}</small>
          </div>
        </div>
        <div className="auth-magic-row">
          <input type="email" value={magicEmail} onChange={e=>setMagicEmail(e.target.value)} placeholder="email@exemple.com" aria-label="Email magic link"/>
          <button type="button" onClick={sendMagicLink} disabled={quickLoading!==null||loading}>{quickLoading==="magic"?"...":t({fr:"Envoyer le lien",ar:"إرسال الرابط",en:"Send link"})}</button>
        </div>
      </div>

      <p className="auth-consent-note">{t({
        fr:"En continuant, vous acceptez les Conditions d’utilisation et la Politique de confidentialité de Vydys.",
        ar:"بالمتابعة، فإنك توافق على شروط الاستخدام وسياسة الخصوصية الخاصة بـ Vydys.",
        en:"By continuing, you agree to Vydys Terms of Use and Privacy Policy."
      })}</p>
    </div>

    <div className="auth-divider auth-divider-main"><span>{t({fr:"Email et mot de passe",ar:"البريد الإلكتروني وكلمة المرور",en:"Email and password"})}</span></div>

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
