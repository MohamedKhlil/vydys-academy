"use client";

import { useLanguage } from "../../components/language-provider";

export default function ConnexionPage(){
 const { t } = useLanguage();
 return <section className="auth-page"><div className="auth-card"><span className="brand-mark large-mark">V</span><span className="eyebrow">Vydys Academy</span><h1>{t({fr:"Bienvenue",ar:"مرحباً",en:"Welcome"})}</h1><p>{t({fr:"Connectez-vous à votre espace de formation.",ar:"سجّل الدخول إلى مساحة التدريب الخاصة بك.",en:"Sign in to your learning space."})}</p><form><label>{t({fr:"Email",ar:"البريد الإلكتروني",en:"Email"})}<input type="email" placeholder="votre@email.com" /></label><label>{t({fr:"Mot de passe",ar:"كلمة المرور",en:"Password"})}<input type="password" placeholder="••••••••" /></label><button className="btn full" type="button">{t({fr:"Se connecter",ar:"تسجيل الدخول",en:"Sign in"})}</button></form><div className="auth-note">{t({fr:"L'authentification sera activée avec Supabase.",ar:"سيتم تفعيل تسجيل الدخول عبر Supabase.",en:"Authentication will be enabled with Supabase."})}</div></div></section>
}
