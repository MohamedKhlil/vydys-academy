"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";

type Education={
  id:string;institution:string;degree:string;field_of_study:string|null;
  started_on:string|null;ended_on:string|null;description:string|null;is_public:boolean
};
type Experience={
  id:string;job_title:string;organization:string;employment_type:string|null;
  started_on:string|null;ended_on:string|null;description:string|null;is_public:boolean
};

const emptyEducation={id:"",institution:"",degree:"",field_of_study:"",started_on:"",ended_on:"",description:"",is_public:false};
const emptyExperience={id:"",job_title:"",organization:"",employment_type:"",started_on:"",ended_on:"",description:"",is_public:false};
const fromMonth=(date:string|null|undefined)=>date?.slice(0,7)||"";
const toMonth=(date:string)=>date?date+"-01":null;

export default function StudentCvEditor({userId}:{userId:string}){
  const {t}=useLanguage();
  const [education,setEducation]=useState<Education[]>([]);
  const [experience,setExperience]=useState<Experience[]>([]);
  const [educationForm,setEducationForm]=useState({...emptyEducation});
  const [experienceForm,setExperienceForm]=useState({...emptyExperience});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");

  async function load(){
    const [{data:e,error:edError},{data:x,error:exError}]=await Promise.all([
      supabase.from("student_education")
        .select("id,institution,degree,field_of_study,started_on,ended_on,description,is_public")
        .eq("user_id",userId).order("started_on",{ascending:false}),
      supabase.from("student_experience")
        .select("id,job_title,organization,employment_type,started_on,ended_on,description,is_public")
        .eq("user_id",userId).order("started_on",{ascending:false})
    ]);
    setEducation((e||[]) as Education[]);
    setExperience((x||[]) as Experience[]);
    setLoading(false);
    if(edError||exError)setNotice(t({
      fr:"Impossible de charger les éléments du CV.",
      ar:"تعذر تحميل معلومات السيرة الذاتية.",
      en:"Unable to load CV entries."
    }));
  }
  useEffect(()=>{if(userId)void load()},[userId]);

  function educationEdit(item:Education){
    setEducationForm({
      id:item.id,institution:item.institution,degree:item.degree,field_of_study:item.field_of_study||"",
      started_on:fromMonth(item.started_on),ended_on:fromMonth(item.ended_on),
      description:item.description||"",is_public:item.is_public
    });
    document.getElementById("cv-education-form")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function experienceEdit(item:Experience){
    setExperienceForm({
      id:item.id,job_title:item.job_title,organization:item.organization,
      employment_type:item.employment_type||"",started_on:fromMonth(item.started_on),
      ended_on:fromMonth(item.ended_on),description:item.description||"",is_public:item.is_public
    });
    document.getElementById("cv-experience-form")?.scrollIntoView({behavior:"smooth",block:"center"});
  }

  async function saveEducation(e:FormEvent){
    e.preventDefault();if(saving)return;setSaving(true);setNotice("");
    const payload={
      user_id:userId,
      institution:educationForm.institution.trim(),
      degree:educationForm.degree.trim(),
      field_of_study:educationForm.field_of_study.trim()||null,
      started_on:toMonth(educationForm.started_on),ended_on:toMonth(educationForm.ended_on),
      description:educationForm.description.trim()||null,
      is_public:educationForm.is_public,
      updated_at:new Date().toISOString()
    };
    if(payload.started_on&&payload.ended_on&&payload.ended_on<payload.started_on){
      setNotice(t({fr:"La date de fin précède la date de début.",ar:"تاريخ النهاية يسبق تاريخ البداية.",en:"The end date is before the start date."}));
      setSaving(false);return;
    }
    const {error}=educationForm.id
      ?await supabase.from("student_education").update(payload).eq("id",educationForm.id).eq("user_id",userId)
      :await supabase.from("student_education").insert(payload);
    if(!error){setEducationForm({...emptyEducation});await load()}
    setNotice(error?error.message:t({fr:"Diplôme enregistré.",ar:"تم حفظ الشهادة الدراسية.",en:"Education saved."}));
    setSaving(false);
  }

  async function saveExperience(e:FormEvent){
    e.preventDefault();if(saving)return;setSaving(true);setNotice("");
    const payload={
      user_id:userId,
      job_title:experienceForm.job_title.trim(),
      organization:experienceForm.organization.trim(),
      employment_type:experienceForm.employment_type||null,
      started_on:toMonth(experienceForm.started_on),ended_on:toMonth(experienceForm.ended_on),
      description:experienceForm.description.trim()||null,
      is_public:experienceForm.is_public,
      updated_at:new Date().toISOString()
    };
    if(payload.started_on&&payload.ended_on&&payload.ended_on<payload.started_on){
      setNotice(t({fr:"La date de fin précède la date de début.",ar:"تاريخ النهاية يسبق تاريخ البداية.",en:"The end date is before the start date."}));
      setSaving(false);return;
    }
    const {error}=experienceForm.id
      ?await supabase.from("student_experience").update(payload).eq("id",experienceForm.id).eq("user_id",userId)
      :await supabase.from("student_experience").insert(payload);
    if(!error){setExperienceForm({...emptyExperience});await load()}
    setNotice(error?error.message:t({fr:"Expérience enregistrée.",ar:"تم حفظ الخبرة.",en:"Experience saved."}));
    setSaving(false);
  }

  async function remove(table:"student_education"|"student_experience",id:string){
    if(saving)return;
    if(!window.confirm(t({
      fr:"Supprimer définitivement cette information de votre CV ?",
      ar:"هل تريد حذف هذه المعلومة نهائياً من سيرتك الذاتية؟",
      en:"Permanently remove this CV entry?"
    })))return;
    setSaving(true);setNotice("");
    const {error}=await supabase.from(table).delete().eq("id",id).eq("user_id",userId);
    if(!error)await load();
    setNotice(error?error.message:t({fr:"Information supprimée.",ar:"تم حذف المعلومة.",en:"Entry removed."}));
    setSaving(false);
  }

  return <div className="cv-editor-grid">
    <section className="panel cv-editor-section" aria-labelledby="education-heading">
      <div className="cv-editor-heading">
        <span className="eyebrow">01 / {t({fr:"Formation",ar:"التعليم",en:"Education"})}</span>
        <h2 id="education-heading">{t({fr:"Diplômes et études",ar:"الشهادات والدراسة",en:"Degrees and education"})}</h2>
        <p>{t({
          fr:"Ajoutez vos établissements, diplômes et spécialisations. Les éléments publiés sont signalés comme renseignés par vous, pas comme certifiés par Vydys.",
          ar:"أضف المؤسسات والشهادات والتخصصات. هذه معلومات تضيفها بنفسك، وليست شهادات معتمدة من Vydys.",
          en:"Add institutions, degrees and fields of study. Your public entries are self-reported, not Vydys-verified."
        })}</p>
      </div>
      {education.length>0&&<div className="cv-entry-list">
        {education.map(item=><div className="cv-entry" key={item.id}>
          <div><strong>{item.degree}</strong><small>{item.institution}{item.started_on?" · "+item.started_on.slice(0,4):""}</small>
            <span>{item.is_public?t({fr:"Visible sur le CV public",ar:"ظاهر في السيرة العامة",en:"Visible on public CV"}):t({fr:"Privé",ar:"خاص",en:"Private"})}</span>
          </div>
          <div className="cv-entry-actions">
            <button type="button" disabled={saving} onClick={()=>educationEdit(item)}>{t({fr:"Modifier",ar:"تعديل",en:"Edit"})}</button>
            <button type="button" disabled={saving} onClick={()=>void remove("student_education",item.id)}>{t({fr:"Supprimer",ar:"حذف",en:"Delete"})}</button>
          </div>
        </div>)}
      </div>}
      <form id="cv-education-form" className="cv-edit-form" onSubmit={e=>void saveEducation(e)}>
        <div className="cv-two">
          <label><span>{t({fr:"Établissement",ar:"المؤسسة التعليمية",en:"Institution"})}</span>
            <input required minLength={2} maxLength={150} value={educationForm.institution} onChange={e=>setEducationForm({...educationForm,institution:e.target.value})}/></label>
          <label><span>{t({fr:"Diplôme",ar:"الشهادة",en:"Degree"})}</span>
            <input required minLength={2} maxLength={150} value={educationForm.degree} onChange={e=>setEducationForm({...educationForm,degree:e.target.value})} placeholder={t({fr:"Ex. Licence, Master…",ar:"مثال: إجازة، ماجستير",en:"e.g. Bachelor, Master's"})}/></label>
        </div>
        <label><span>{t({fr:"Domaine d’étude",ar:"التخصص",en:"Field of study"})}</span>
          <input maxLength={150} value={educationForm.field_of_study} onChange={e=>setEducationForm({...educationForm,field_of_study:e.target.value})}/></label>
        <div className="cv-two">
          <label><span>{t({fr:"Début",ar:"البداية",en:"Start"})}</span>
            <input type="month" value={educationForm.started_on} onChange={e=>setEducationForm({...educationForm,started_on:e.target.value})}/></label>
          <label><span>{t({fr:"Fin",ar:"النهاية",en:"End"})}</span>
            <input type="month" value={educationForm.ended_on} onChange={e=>setEducationForm({...educationForm,ended_on:e.target.value})}/></label>
        </div>
        <label><span>{t({fr:"Description (facultatif)",ar:"الوصف (اختياري)",en:"Description (optional)"})}</span>
          <textarea maxLength={1000} rows={3} value={educationForm.description} onChange={e=>setEducationForm({...educationForm,description:e.target.value})}/></label>
        <label className="cv-public-checkbox"><input type="checkbox" checked={educationForm.is_public} onChange={e=>setEducationForm({...educationForm,is_public:e.target.checked})}/>
          {t({fr:"Afficher ce diplôme sur mon CV public",ar:"إظهار هذه الشهادة في سيرتي العامة",en:"Display this education on my public CV"})}</label>
        <div className="cv-save-actions"><button className="btn" disabled={saving} type="submit">{educationForm.id?t({fr:"Mettre à jour",ar:"تحديث",en:"Update"}):t({fr:"Ajouter le diplôme",ar:"إضافة الشهادة",en:"Add education"})}</button>
          {educationForm.id&&<button type="button" className="btn btn-ghost" onClick={()=>setEducationForm({...emptyEducation})}>{t({fr:"Annuler",ar:"إلغاء",en:"Cancel"})}</button>}</div>
      </form>
    </section>

    <section className="panel cv-editor-section" aria-labelledby="experience-heading">
      <div className="cv-editor-heading">
        <span className="eyebrow">02 / {t({fr:"Expérience",ar:"الخبرة",en:"Experience"})}</span>
        <h2 id="experience-heading">{t({fr:"Expériences professionnelles",ar:"الخبرات المهنية",en:"Work experience"})}</h2>
        <p>{t({
          fr:"Présentez vos postes, stages, missions freelance et réalisations professionnelles.",
          ar:"أضف الوظائف والتدريب والعمل الحر والإنجازات المهنية.",
          en:"Share jobs, internships, freelance projects and professional achievements."
        })}</p>
      </div>
      {experience.length>0&&<div className="cv-entry-list">
        {experience.map(item=><div className="cv-entry" key={item.id}>
          <div><strong>{item.job_title}</strong><small>{item.organization}{item.started_on?" · "+item.started_on.slice(0,4):""}</small>
            <span>{item.is_public?t({fr:"Visible sur le CV public",ar:"ظاهر في السيرة العامة",en:"Visible on public CV"}):t({fr:"Privé",ar:"خاص",en:"Private"})}</span></div>
          <div className="cv-entry-actions">
            <button type="button" disabled={saving} onClick={()=>experienceEdit(item)}>{t({fr:"Modifier",ar:"تعديل",en:"Edit"})}</button>
            <button type="button" disabled={saving} onClick={()=>void remove("student_experience",item.id)}>{t({fr:"Supprimer",ar:"حذف",en:"Delete"})}</button>
          </div>
        </div>)}
      </div>}
      <form id="cv-experience-form" className="cv-edit-form" onSubmit={e=>void saveExperience(e)}>
        <div className="cv-two">
          <label><span>{t({fr:"Poste occupé",ar:"المسمى الوظيفي",en:"Job title"})}</span>
            <input required minLength={2} maxLength={150} value={experienceForm.job_title} onChange={e=>setExperienceForm({...experienceForm,job_title:e.target.value})}/></label>
          <label><span>{t({fr:"Entreprise / organisation",ar:"الشركة / المؤسسة",en:"Organization"})}</span>
            <input required minLength={2} maxLength={150} value={experienceForm.organization} onChange={e=>setExperienceForm({...experienceForm,organization:e.target.value})}/></label>
        </div>
        <label><span>{t({fr:"Type d’expérience",ar:"نوع الخبرة",en:"Experience type"})}</span>
          <select value={experienceForm.employment_type} onChange={e=>setExperienceForm({...experienceForm,employment_type:e.target.value})}>
            <option value="">{t({fr:"Choisir (facultatif)",ar:"اختر (اختياري)",en:"Choose (optional)"})}</option>
            {[
              ["full_time",t({fr:"Temps plein",ar:"دوام كامل",en:"Full-time"})],
              ["part_time",t({fr:"Temps partiel",ar:"دوام جزئي",en:"Part-time"})],
              ["internship",t({fr:"Stage",ar:"تدريب",en:"Internship"})],
              ["freelance",t({fr:"Freelance",ar:"عمل حر",en:"Freelance"})],
              ["contract",t({fr:"Contrat",ar:"عقد",en:"Contract"})],
              ["volunteer",t({fr:"Bénévolat",ar:"تطوع",en:"Volunteer"})]
            ].map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <div className="cv-two">
          <label><span>{t({fr:"Début",ar:"البداية",en:"Start"})}</span>
            <input type="month" value={experienceForm.started_on} onChange={e=>setExperienceForm({...experienceForm,started_on:e.target.value})}/></label>
          <label><span>{t({fr:"Fin (vide si poste actuel)",ar:"النهاية (اتركها فارغة إذا استمر العمل)",en:"End (blank if current)"})}</span>
            <input type="month" value={experienceForm.ended_on} onChange={e=>setExperienceForm({...experienceForm,ended_on:e.target.value})}/></label>
        </div>
        <label><span>{t({fr:"Missions et réalisations",ar:"المهام والإنجازات",en:"Responsibilities and achievements"})}</span>
          <textarea rows={4} maxLength={1500} value={experienceForm.description} onChange={e=>setExperienceForm({...experienceForm,description:e.target.value})}/></label>
        <label className="cv-public-checkbox"><input type="checkbox" checked={experienceForm.is_public} onChange={e=>setExperienceForm({...experienceForm,is_public:e.target.checked})}/>
          {t({fr:"Afficher cette expérience sur mon CV public",ar:"إظهار هذه الخبرة في سيرتي العامة",en:"Display this experience on my public CV"})}</label>
        <div className="cv-save-actions"><button className="btn" disabled={saving} type="submit">{experienceForm.id?t({fr:"Mettre à jour",ar:"تحديث",en:"Update"}):t({fr:"Ajouter l’expérience",ar:"إضافة الخبرة",en:"Add experience"})}</button>
          {experienceForm.id&&<button type="button" className="btn btn-ghost" onClick={()=>setExperienceForm({...emptyExperience})}>{t({fr:"Annuler",ar:"إلغاء",en:"Cancel"})}</button>}</div>
      </form>
    </section>
    {loading&&<p role="status">{t({fr:"Chargement du CV…",ar:"جار تحميل السيرة...",en:"Loading CV…" })}</p>}
    {notice&&<p className="cv-notice" role="status">{notice}</p>}
  </div>;
}
