"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";
import StudentCvEditor from "../../components/student-cv-editor";

export default function PortfolioSettingsPage(){
  const {t}=useLanguage();
  const [profile,setProfile]=useState<any>(null);
  const [displayName,setDisplayName]=useState("");
  const [headline,setHeadline]=useState("");
  const [bio,setBio]=useState("");
  const [github,setGithub]=useState("");
  const [linkedin,setLinkedin]=useState("");
  const [website,setWebsite]=useState("");
  const [isPublic,setIsPublic]=useState(false);
  const [discoverable,setDiscoverable]=useState(false);
  const [openToWork,setOpenToWork]=useState(false);
  const [city,setCity]=useState("");
  const [country,setCountry]=useState("");
  const [skillsText,setSkillsText]=useState("");
  const [saving,setSaving]=useState(false);
  const [skills,setSkills]=useState(0);
  const [projects,setProjects]=useState(0);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    await supabase.rpc("ensure_my_student_profile");
    const [{data:p},{count:sCount},{count:pCount}]=await Promise.all([
      supabase.from("student_profiles").select("*").eq("user_id",user.id).single(),
      supabase.from("user_skills").select("skill_id",{count:"exact",head:true}).eq("user_id",user.id).eq("verification_status","verified"),
      supabase.from("student_projects").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("status","approved")
    ]);
    if(p){setProfile(p);setDisplayName(p.display_name||"");setHeadline(p.headline||"");setBio(p.bio||"");setGithub(p.github_url||"");setLinkedin(p.linkedin_url||"");setWebsite(p.website_url||"");setIsPublic(Boolean(p.is_public));setDiscoverable(Boolean(p.discoverable));setOpenToWork(Boolean(p.open_to_work));setCity(p.city||"");setCountry(p.country||"");setSkillsText((p.self_reported_skills||[]).join(", "))}
    setSkills(sCount||0);setProjects(pCount||0);
  }
  useEffect(()=>{load()},[]);

  async function save(e:FormEvent){
    e.preventDefault();if(saving)return;setMessage("");
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const links=[github,linkedin,website].map(x=>x.trim());
    if(links.some(value=>value&&!/^https?:\/\//i.test(value))){
      setMessage(t({fr:"Utilisez des liens commençant par https:// ou http://.",ar:"استخدم روابط تبدأ بـ https:// أو http://.",en:"Use links starting with https:// or http://."}));return;
    }
    const selfSkills=Array.from(new Set(skillsText.split(",").map(x=>x.trim()).filter(Boolean)));
    if(selfSkills.length>20||selfSkills.some(x=>x.length>60)){
      setMessage(t({fr:"Maximum 20 compétences de 60 caractères chacune.",ar:"20 مهارة كحد أقصى، 60 حرفاً لكل مهارة.",en:"Maximum 20 skills, 60 characters each."}));return;
    }
    setSaving(true);
    const {error}=await supabase.from("student_profiles").update({
      display_name:displayName,headline,bio,github_url:github||null,linkedin_url:linkedin||null,
      website_url:website||null,is_public:isPublic,discoverable:isPublic&&discoverable,
      open_to_work:openToWork,city:city.trim()||null,country:country.trim()||null,
      self_reported_skills:selfSkills,updated_at:new Date().toISOString()
    }).eq("user_id",user.id);
    setMessage(error?error.message:t({fr:"Portfolio enregistré.",ar:"تم حفظ الملف.",en:"Portfolio saved."}));
    if(!error)await load();
    setSaving(false);
  }

  if(!profile)return <section className="dashboard-shell"><div className="container">...</div></section>;
  return <section className="dashboard-shell"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Portfolio · CV</span><h1>{t({fr:"Votre identité professionnelle Tech",ar:"هويتك المهنية التقنية",en:"Your Tech professional identity"})}</h1><p>{t({fr:"Présentez vos projets, compétences vérifiées et certifications aux entreprises.",ar:"اعرض مشاريعك ومهاراتك المعتمدة وشهاداتك للشركات.",en:"Show employers your projects, verified skills and certifications."})}</p></div>{isPublic&&<Link className="btn" href={"/talent/"+profile.public_slug}>{t({fr:"Voir mon portfolio public",ar:"عرض ملفي العام",en:"View public portfolio"})}</Link>}</div>

    <div className="stat-grid"><article className="panel stat"><span>{t({fr:"Compétences vérifiées",ar:"مهارات معتمدة",en:"Verified skills"})}</span><strong>{skills}</strong></article><article className="panel stat"><span>{t({fr:"Projets validés",ar:"مشاريع معتمدة",en:"Approved projects"})}</span><strong>{projects}</strong></article><article className="panel stat"><span>URL</span><strong className="small-stat">/talent/{profile.public_slug}</strong></article></div>

    <div className="cv-editor-intro panel">
      <div><span className="eyebrow">{t({fr:"Ma visibilité professionnelle",ar:"ظهوري المهني",en:"My professional presence"})}</span>
        <h2>{t({fr:"Un CV numérique qui vous appartient.",ar:"سيرة ذاتية رقمية تحت سيطرتك.",en:"Your CV, your choice."})}</h2>
        <p>{t({fr:"Complétez votre profil comme sur LinkedIn : diplôme, expérience, compétences et projets. Choisissez ensuite ce que les recruteurs peuvent voir.",ar:"أكمل ملفك كما في LinkedIn: الشهادات والخبرة والمهارات والمشاريع. اختر ما يمكن لأصحاب العمل رؤيته.",en:"Build a LinkedIn-style profile with education, experience, skills and projects. Choose what recruiters can see."})}</p>
      </div>
      <Link href="/talents" className="btn btn-ghost">{t({fr:"Voir l’annuaire des talents",ar:"دليل المواهب",en:"Explore the talent directory"})} →</Link>
    </div>

    <form className="panel trainer-form portfolio-form" onSubmit={save}>
      <div className="form-grid"><label className="form-field"><span>{t({fr:"Nom public",ar:"الاسم العام",en:"Public name"})}</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} required/></label><label className="form-field"><span>{t({fr:"Titre professionnel",ar:"المسمى المهني",en:"Professional headline"})}</span><input value={headline} onChange={e=>setHeadline(e.target.value)} placeholder="AI Builder · Data Analyst · Developer"/></label></div>
      <label className="form-field"><span>Bio</span><textarea rows={6} value={bio} onChange={e=>setBio(e.target.value)}/></label>
      <div className="form-grid"><label className="form-field"><span>GitHub</span><input value={github} onChange={e=>setGithub(e.target.value)}/></label><label className="form-field"><span>LinkedIn</span><input value={linkedin} onChange={e=>setLinkedin(e.target.value)}/></label></div>
      <label className="form-field"><span>Website</span><input value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      <div className="form-grid">
        <label className="form-field"><span>{t({fr:"Ville",ar:"المدينة",en:"City"})}</span>
          <input maxLength={100} value={city} onChange={e=>setCity(e.target.value)} placeholder={t({fr:"Ex. Nouakchott",ar:"مثال: نواكشوط",en:"e.g. Nouakchott"})}/></label>
        <label className="form-field"><span>{t({fr:"Pays",ar:"البلد",en:"Country"})}</span>
          <input maxLength={100} value={country} onChange={e=>setCountry(e.target.value)} placeholder={t({fr:"Ex. Mauritanie",ar:"مثال: موريتانيا",en:"e.g. Mauritania"})}/></label>
      </div>
      <label className="form-field"><span>{t({fr:"Compétences déclarées (séparées par des virgules)",ar:"المهارات المضافة ذاتياً (مفصولة بفواصل)",en:"Self-reported skills (comma-separated)"})}</span>
        <input value={skillsText} onChange={e=>setSkillsText(e.target.value)} placeholder="Python, Marketing, Data, Project management" maxLength={1200}/>
        <small>{t({fr:"Déclarées par vous, distinctes des compétences vérifiées par Vydys.",ar:"مهارات تضيفها بنفسك، وليست معتمدة من Vydys.",en:"Self-reported, separate from Vydys-verified skills."})}</small>
      </label>
      <div className="cv-visibility-options">
        <label className="checkbox-line"><input type="checkbox" checked={isPublic}
          onChange={e=>{setIsPublic(e.target.checked);if(!e.target.checked)setDiscoverable(false)}}/>
          {t({fr:"Rendre mon portfolio accessible via son lien public",ar:"إتاحة ملفي عبر الرابط العام",en:"Allow my portfolio to be viewed by public link"})}</label>
        <label className="checkbox-line"><input type="checkbox" checked={discoverable} disabled={!isPublic}
          onChange={e=>setDiscoverable(e.target.checked)}/>
          {t({fr:"Apparaître dans l’annuaire public Vydys Talents (recherche par recruteurs)",ar:"الظهور في دليل Vydys Talents العام للباحثين عن المواهب",en:"List me in the public Vydys Talents recruiter directory"})}</label>
        <label className="checkbox-line"><input type="checkbox" checked={openToWork} onChange={e=>setOpenToWork(e.target.checked)}/>
          {t({fr:"Je suis ouvert aux opportunités professionnelles",ar:"أنا متاح للفرص المهنية",en:"I'm open to work opportunities"})}</label>
        <p>{t({fr:"La recherche publique reste désactivée tant que vous ne l’autorisez pas. Les diplômes et expériences possèdent chacun leur propre option de visibilité.",ar:"لن يظهر ملفك في البحث العام دون موافقتك. لكل شهادة وخبرة إعداد خصوصية مستقل.",en:"Public discovery stays off until you enable it. Each education and work entry has its own visibility control."})}</p>
      </div>
      <button className="btn" disabled={saving}>{saving?t({fr:"Enregistrement…",ar:"جار الحفظ...",en:"Saving…"}):t({fr:"Enregistrer mon profil",ar:"حفظ ملفي",en:"Save my profile"})}</button>{message&&<p className="manual-note">{message}</p>}
    </form>
    {profile.user_id&&<StudentCvEditor userId={profile.user_id}/>}
  </div></section>
}
