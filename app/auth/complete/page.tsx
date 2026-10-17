"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";
import { safeStudentReturnPath } from "../../../lib/post-auth-path";

const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export default function AuthCompletePage(){
  const {t}=useLanguage();
  const [state,setState]=useState<"loading"|"error">("loading");
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let alive=true;

    async function complete(){
      try{
        const params=new URLSearchParams(window.location.search);
        const providerError=params.get("error_description")||params.get("error");
        if(providerError) throw new Error(providerError);

        let session=null as any;
        let lastError:any=null;

        for(let i=0;i<12;i++){
          const result=await supabase.auth.getSession();
          lastError=result.error;
          session=result.data.session;
          if(session?.user) break;
          await wait(250);
        }

        if(lastError) throw lastError;
        if(!session?.user) throw new Error(t({
          fr:"La connexion n’a pas pu être finalisée. Réessayez depuis la page de connexion.",
          ar:"تعذر إكمال تسجيل الدخول. حاول مرة أخرى من صفحة تسجيل الدخول.",
          en:"Sign-in could not be completed. Please try again from the sign-in page."
        }));

        const user=session.user;
        const {data:profile,error:profileError}=await supabase
          .from("profiles")
          .select("role,full_name,avatar_url")
          .eq("id",user.id)
          .maybeSingle();

        if(profileError) throw profileError;

        const meta=user.user_metadata||{};
        const patch:Record<string,any>={};

        if(!profile?.full_name){
          const name=String(meta.full_name||meta.name||"").trim();
          if(name) patch.full_name=name;
        }
        if(!profile?.avatar_url){
          const avatar=String(meta.avatar_url||meta.picture||"").trim();
          if(avatar) patch.avatar_url=avatar;
        }

        if(Object.keys(patch).length){
          await supabase.from("profiles").update(patch).eq("id",user.id);
        }

        if(!meta.terms_accepted){
          await supabase.auth.updateUser({
            data:{
              terms_accepted:true,
              terms_version:"2026-10-03",
              signup_source:meta.provider||meta.signup_source||"oauth"
            }
          });
        }

        const requested=params.get("next")||"";
        const safeNext=safeStudentReturnPath(requested);
        const role=profile?.role||"student";
        const destination=
          role==="direction"||role==="admin"
            ?"/admin"
            :role==="instructor"
              ?"/formateur"
              :(safeNext||"/dashboard");

        if(alive) window.location.replace(destination);
      }catch(err){
        if(!alive) return;
        setMessage(err instanceof Error?err.message:"Erreur");
        setState("error");
      }
    }

    complete();
    return()=>{alive=false};
  },[t]);

  return <section className="auth-page auth-complete-page"><div className="auth-card auth-complete-card">
    <span className="brand-mark large-mark">V</span>
    <span className="eyebrow">Vydys Academy</span>
    {state==="loading"?<>
      <div className="auth-complete-spinner" aria-hidden="true"/>
      <h1>{t({fr:"Connexion en cours",ar:"جارٍ تسجيل الدخول",en:"Signing you in"})}</h1>
      <p>{t({
        fr:"Nous préparons votre espace Vydys et votre profil.",
        ar:"نقوم بإعداد مساحة Vydys وملفك الشخصي.",
        en:"We are preparing your Vydys workspace and profile."
      })}</p>
    </>:<>
      <div className="auth-complete-error" aria-hidden="true">!</div>
      <h1>{t({fr:"Connexion non terminée",ar:"لم يكتمل تسجيل الدخول",en:"Sign-in not completed"})}</h1>
      <div className="auth-note">{message}</div>
      <Link className="btn full" href="/connexion">{t({fr:"Retour à la connexion",ar:"العودة لتسجيل الدخول",en:"Back to sign in"})}</Link>
    </>}
  </div></section>;
}
