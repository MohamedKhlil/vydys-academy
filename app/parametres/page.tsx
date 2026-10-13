"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

export default function SettingsPage(){
  const {t}=useLanguage();
  const [userId,setUserId]=useState("");
  const [email,setEmail]=useState("");
  const [profile,setProfile]=useState<any>({full_name:"",username:"",phone:"",bio:"",website:"",avatar_url:"",preferred_language:"fr",preferred_currency:"USD",timezone:"Africa/Nouakchott",role:"student"});
  const [whatsappNumber,setWhatsappNumber]=useState("");
  const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);setEmail(user.email||"");
    const {data}=await supabase.from("profiles").select("full_name,username,phone,bio,website,avatar_url,preferred_language,preferred_currency,timezone,role").eq("id",user.id).maybeSingle();
    if(data){
      setProfile((p:any)=>({...p,...data}));
      if(data.role==="instructor"){
        const {data:trainer}=await supabase.from("instructor_profiles").select("whatsapp_number").eq("user_id",user.id).maybeSingle();
        setWhatsappNumber(trainer?.whatsapp_number||"");
      }
    }
  })()},[]);

  async function save(e:FormEvent){
    e.preventDefault();if(!userId)return;setBusy(true);setNotice("");
    const {error}=await supabase.from("profiles").update({
      full_name:profile.full_name||null,username:profile.username||null,phone:profile.phone||null,bio:profile.bio||null,website:profile.website||null,
      preferred_language:profile.preferred_language,preferred_currency:profile.preferred_currency,timezone:profile.timezone,updated_at:new Date().toISOString()
    }).eq("id",userId);
    if(!error&&profile.role==="instructor"){
      const {error:waError}=await supabase.from("instructor_profiles").update({whatsapp_number:whatsappNumber.trim()||null,updated_at:new Date().toISOString()}).eq("user_id",userId);
      if(waError){setBusy(false);setNotice(waError.message);return}
    }
    setBusy(false);setNotice(error?error.message:t({fr:"Profil mis à jour.",ar:"تم تحديث الملف.",en:"Profile updated."}));
  }

  async function uploadAvatar(file?:File){
    if(!file||!userId)return;
    setBusy(true);setNotice("");
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`${userId}/avatar.${ext}`;
    const {error}=await supabase.storage.from("avatars").upload(path,file,{upsert:true,contentType:file.type});
    if(error){setBusy(false);setNotice(error.message);return}
    const {data}=supabase.storage.from("avatars").getPublicUrl(path);
    const url=data.publicUrl+"?v="+Date.now();
    const {error:updateError}=await supabase.from("profiles").update({avatar_url:url,updated_at:new Date().toISOString()}).eq("id",userId);
    if(!updateError)setProfile((p:any)=>({...p,avatar_url:url}));
    setBusy(false);setNotice(updateError?updateError.message:t({fr:"Photo mise à jour.",ar:"تم تحديث الصورة.",en:"Photo updated."}));
  }

  return <section className="section page-top settings-page"><div className="container">
    <div className="page-hero"><span className="eyebrow">{t({fr:"Paramètres",ar:"الإعدادات",en:"Settings"})}</span><h1>{t({fr:"Votre identité Vydys.",ar:"هويتك على Vydys.",en:"Your Vydys identity."})}</h1><p>{t({fr:"Chaque utilisateur contrôle ses informations, sa photo et ses préférences.",ar:"كل مستخدم يتحكم في معلوماته وصورته وتفضيلاته.",en:"Every user controls their information, photo and preferences."})}</p></div>
    <div className="settings-layout">
      <aside className="panel settings-profile-card">
        <div className="settings-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{(profile.full_name||email||"V").slice(0,2).toUpperCase()}</span>}</div>
        <strong>{profile.full_name||email}</strong><small>{profile.role}</small>
        <label className="btn btn-ghost settings-upload">{busy?"...":t({fr:"Changer la photo",ar:"تغيير الصورة",en:"Change photo"})}<input type="file" accept="image/*" onChange={e=>uploadAvatar(e.target.files?.[0])}/></label>
      </aside>
      <form className="panel settings-form" onSubmit={save}>
        <div className="settings-grid">
          <label><span>{t({fr:"Nom complet",ar:"الاسم الكامل",en:"Full name"})}</span><input value={profile.full_name||""} onChange={e=>setProfile({...profile,full_name:e.target.value})}/></label>
          <label><span>{t({fr:"Nom d’utilisateur",ar:"اسم المستخدم",en:"Username"})}</span><input value={profile.username||""} onChange={e=>setProfile({...profile,username:e.target.value.replace(/\s+/g,"").toLowerCase()})}/></label>
          <label><span>Email</span><input value={email} disabled/></label>
          <label><span>{t({fr:"Téléphone",ar:"الهاتف",en:"Phone"})}</span><input value={profile.phone||""} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label>
          <label className="wide"><span>Bio</span><textarea value={profile.bio||""} onChange={e=>setProfile({...profile,bio:e.target.value})}/></label>
          <label className="wide"><span>Website</span><input value={profile.website||""} onChange={e=>setProfile({...profile,website:e.target.value})}/></label>
          {profile.role==="instructor"&&<label className="wide"><span>{t({fr:"WhatsApp pour les demandes d’information",ar:"واتساب للاستفسارات",en:"WhatsApp for enquiries"})}</span><input value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} placeholder="36787827"/><small>{t({fr:"Ce numéro sera affiché sur vos formations et Classrooms.",ar:"سيظهر هذا الرقم في دوراتك وفصولك.",en:"This number will appear on your courses and Classrooms."})}</small></label>}
          <label><span>{t({fr:"Langue",ar:"اللغة",en:"Language"})}</span><select value={profile.preferred_language} onChange={e=>setProfile({...profile,preferred_language:e.target.value})}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></label>
          <label><span>{t({fr:"Devise",ar:"العملة",en:"Currency"})}</span><input value={profile.preferred_currency||"USD"} onChange={e=>setProfile({...profile,preferred_currency:e.target.value.toUpperCase()})}/></label>
          <label className="wide"><span>Timezone</span><input value={profile.timezone||""} onChange={e=>setProfile({...profile,timezone:e.target.value})}/></label>
        </div>
        {notice&&<p className="manual-note">{notice}</p>}
        <button className="btn" disabled={busy}>{busy?"...":t({fr:"Enregistrer",ar:"حفظ",en:"Save changes"})}</button>
      </form>
    </div>
  </div></section>
}
