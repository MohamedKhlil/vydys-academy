"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function DevenirFormateurPage(){
  const {t}=useLanguage();
  const [userId,setUserId]=useState<string|null>(null);
  const [displayName,setDisplayName]=useState("");
  const [headline,setHeadline]=useState("");
  const [expertise,setExpertise]=useState("");
  const [bio,setBio]=useState("");
  const [years,setYears]=useState("");
  const [social,setSocial]=useState("");
  const [status,setStatus]=useState<string|null>(null);
  const [note,setNote]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){return}
    setUserId(user.id);
    const {data:profile}=await supabase.from("profiles").select("full_name").eq("id",user.id).single();
    setDisplayName(profile?.full_name||"");
    const {data:app}=await supabase.from("trainer_applications").select("*").eq("user_id",user.id).maybeSingle();
    if(app){
      setStatus(app.status);setNote(app.admin_note||null);
      setDisplayName(app.display_name||"");setHeadline(app.headline||"");setExpertise(app.expertise||"");
      setBio(app.bio||"");setYears(app.experience_years?.toString()||"");setSocial(app.social_links||"");
    }
  })()},[]);

  async function submit(e:FormEvent){
    e.preventDefault(); setMessage("");
    if(!userId){window.location.href="/connexion";return}
    const payload={
      user_id:userId,display_name:displayName,headline,expertise,bio,
      experience_years:years?Number(years):null,social_links:social,
      status:"pending",submitted_at:new Date().toISOString()
    };
    const {error}=await supabase.from("trainer_applications").upsert(payload,{onConflict:"user_id"});
    if(error){setMessage(error.message);return}
    setStatus("pending");
    setMessage(t({fr:"Votre candidature a été envoyée à la Direction.",ar:"تم إرسال طلبك إلى الإدارة.",en:"Your application has been submitted to Management."}));
  }

  return <section className="section page-top"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Formateurs",ar:"المدربون",en:"Instructors"})}</span><h1>{t({fr:"Devenez formateur sur Vydys Academy",ar:"كن مدرباً على Vydys Academy",en:"Become an instructor on Vydys Academy"})}</h1><p>{t({fr:"Créez votre espace, publiez vos formations et développez votre communauté d'étudiants.",ar:"أنشئ مساحتك وانشر دوراتك وطوّر مجتمع طلابك.",en:"Create your space, publish courses and grow your student community."})}</p></div>

    {status&&<article className="panel trainer-status"><strong>{t({fr:"Statut de la candidature :",ar:"حالة الطلب:",en:"Application status:"})} {status}</strong>{note&&<p>{note}</p>}</article>}

    <form className="panel trainer-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field"><span>{t({fr:"Nom public",ar:"الاسم العام",en:"Public name"})}</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} required/></label>
        <label className="form-field"><span>{t({fr:"Titre professionnel",ar:"الصفة المهنية",en:"Professional headline"})}</span><input value={headline} onChange={e=>setHeadline(e.target.value)} placeholder="Expert marketing digital"/></label>
        <label className="form-field full-row"><span>{t({fr:"Domaines d'expertise",ar:"مجالات الخبرة",en:"Areas of expertise"})}</span><input value={expertise} onChange={e=>setExpertise(e.target.value)} required placeholder="Marketing, IA, Design..."/></label>
        <label className="form-field"><span>{t({fr:"Années d'expérience",ar:"سنوات الخبرة",en:"Years of experience"})}</span><input type="number" min="0" value={years} onChange={e=>setYears(e.target.value)}/></label>
        <label className="form-field"><span>{t({fr:"Liens sociaux / Portfolio",ar:"روابط التواصل / الأعمال",en:"Social links / Portfolio"})}</span><input value={social} onChange={e=>setSocial(e.target.value)}/></label>
        <label className="form-field full-row"><span>{t({fr:"Biographie",ar:"نبذة",en:"Biography"})}</span><textarea value={bio} onChange={e=>setBio(e.target.value)} required rows={7}/></label>
      </div>
      <button className="btn" type="submit">{t({fr:"Envoyer ma candidature",ar:"إرسال طلبي",en:"Submit application"})}</button>
      {message&&<p className="manual-note">{message}</p>}
    </form>
  </div></section>
}
