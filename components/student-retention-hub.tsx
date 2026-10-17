"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";
import type { VydysCalendarEvent } from "../lib/calendar-events";

type Preference = {
  classroom_reminders: boolean;
  study_reminders: boolean;
};
type CatalogCourse = {
  id: string;
  slug: string;
  category: string | null;
  title_fr: string;
  title_ar: string | null;
  title_en: string | null;
  description_fr: string | null;
  description_ar: string | null;
  description_en: string | null;
  base_currency: string;
  base_price_amount: number;
  registration_deadline: string | null;
  published_at: string | null;
};
type Profile = {
  learning_goal: string | null;
  learning_interests: string[];
  experience_level: string | null;
  onboarding_completed_at: string | null;
};

const interestTerms: Record<string, string[]> = {
  ai: ["intelligence artificielle", "artificial intelligence", "generative", "générative", "machine learning", "ai", "llm", "ia"],
  software: ["software", "web", "développement", "development", "python", "code", "javascript"],
  data: ["data", "données", "analytics", "sql", "statistics"],
  cloud: ["cloud", "devops", "infrastructure", "aws", "azure"],
  cybersecurity: ["security", "sécurité", "cyber", "hacking"],
  product: ["digital", "marketing", "product", "commerce", "entrepreneuriat"]
};

const defaultPreference: Preference = {
  classroom_reminders: false,
  study_reminders: false
};

function scoreCourse(course: CatalogCourse, interests: string[]) {
  const title=(course.title_fr+" "+(course.title_en||"")+" "+(course.category||"")).toLowerCase();
  const content=(
    (course.description_fr||"")+" "+(course.description_en||"")
  ).toLowerCase().slice(0,1500);

  let value=0;
  let matched="";
  for(const key of interests) {
    const terms=interestTerms[key]||[];
    const match=terms.some(term=>{
      const short=term.length<=2;
      const pattern=short ? new RegExp("(^|[^a-z])"+term+"([^a-z]|$)") : null;
      return short ? Boolean(pattern?.test(title)) : title.includes(term);
    });
    const descriptionMatches=terms.some(term=>term.length>3&&content.includes(term));
    if(match){value+=5;matched ||= key}
    else if(descriptionMatches){value+=2;matched ||= key}
  }
  return {value,matched};
}

const reasons:Record<string,{fr:string;ar:string;en:string}>={
  ai:{fr:"IA et automatisation",ar:"الذكاء الاصطناعي والأتمتة",en:"AI and automation"},
  software:{fr:"Développement logiciel",ar:"تطوير البرمجيات",en:"Software development"},
  data:{fr:"Données et analyse",ar:"البيانات والتحليل",en:"Data and analytics"},
  cloud:{fr:"Cloud et DevOps",ar:"الحوسبة السحابية وDevOps",en:"Cloud and DevOps"},
  cybersecurity:{fr:"Cybersécurité",ar:"الأمن السيبراني",en:"Cybersecurity"},
  product:{fr:"Marketing et produit",ar:"التسويق والمنتجات",en:"Marketing and product"}
};

export default function StudentRetentionHub({
  userId,
  enrolledCourseIds,
  calendarEvents
}:{
  userId:string;
  enrolledCourseIds:string[];
  calendarEvents:VydysCalendarEvent[];
}){
  const {lang,t}=useLanguage();
  const [preferences,setPreferences]=useState<Preference>(defaultPreference);
  const [preferencesLoaded,setPreferencesLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  const [profile,setProfile]=useState<Profile|null>(null);
  const [courses,setCourses]=useState<CatalogCourse[]>([]);
  const [prices,setPrices]=useState<Record<string,number>>({});
  const [catalogError,setCatalogError]=useState(false);

  useEffect(()=>{
    if(!userId)return;
    let active=true;
    (async()=>{
      const [{data:pref,error:prefError},{data:student},{data:published,error:courseError}]=await Promise.all([
        supabase.from("student_reminder_preferences")
          .select("classroom_reminders,study_reminders").eq("user_id",userId).maybeSingle(),
        supabase.from("profiles")
          .select("learning_goal,learning_interests,experience_level,onboarding_completed_at")
          .eq("id",userId).maybeSingle(),
        supabase.from("courses")
          .select("id,slug,category,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_currency,base_price_amount,registration_deadline,published_at")
          .eq("status","published")
          .order("published_at",{ascending:false})
          .limit(100)
      ]);
      if(!active)return;
      if(!prefError){
        setPreferences(pref?{
          classroom_reminders:pref.classroom_reminders===true,
          study_reminders:pref.study_reminders===true
        }:defaultPreference);
      } else setNotice(t({fr:"Les préférences n’ont pas pu être chargées.",ar:"تعذر تحميل التفضيلات.",en:"Unable to load reminder settings."}));
      setPreferencesLoaded(!prefError);
      if(student)setProfile({
        learning_goal:student.learning_goal||null,
        learning_interests:Array.isArray(student.learning_interests)?student.learning_interests:[],
        experience_level:student.experience_level||null,
        onboarding_completed_at:student.onboarding_completed_at||null
      });
      setCatalogError(Boolean(courseError));
      const list=(published||[]) as CatalogCourse[];
      setCourses(list);
      if(list.length){
        const {data:priceRows}=await supabase.from("course_prices")
          .select("course_id,currency,amount").eq("is_active",true)
          .in("course_id",list.map(item=>item.id));
        if(!active)return;
        const lookup:Record<string,number>={};
        for(const row of priceRows||[])lookup[row.course_id+":"+row.currency.toUpperCase()]=Number(row.amount);
        setPrices(lookup);
      }
    })();
    return()=>{active=false};
  },[userId,t]);

  async function togglePreference(field:keyof Preference,checked:boolean){
    if(!userId||saving||!preferencesLoaded)return;
    setSaving(true);
    setNotice("");
    const values={...preferences,[field]:checked};
    const {data,error}=await supabase.from("student_reminder_preferences")
      .upsert({user_id:userId,...values,updated_at:new Date().toISOString()},{onConflict:"user_id"})
      .select("classroom_reminders,study_reminders").single();
    if(error){
      setNotice(t({fr:"Enregistrement impossible. Veuillez réessayer.",ar:"تعذر حفظ الإعدادات. حاول مرة أخرى.",en:"Could not save your settings. Try again."}));
    }else{
      setPreferences({classroom_reminders:data.classroom_reminders,study_reminders:data.study_reminders});
      setNotice(t({fr:"Préférences enregistrées.",ar:"تم حفظ التفضيلات.",en:"Preferences saved."}));
    }
    setSaving(false);
  }

  const upcoming=useMemo(()=>{
    const now=Date.now();
    return calendarEvents
      .filter(event=>!event.cancelled&&event.end.getTime()>now)
      .sort((a,b)=>a.start.getTime()-b.start.getTime())[0]||null;
  },[calendarEvents]);

  const recommendations=useMemo(()=>{
    const owned=new Set(enrolledCourseIds);
    const today=new Date().toISOString().slice(0,10);
    const interests=profile?.learning_interests||[];
    return courses
      .filter(course=>!owned.has(course.id) && (!course.registration_deadline||course.registration_deadline>=today))
      .map(course=>({...course,match:scoreCourse(course,interests)}))
      .sort((a,b)=>b.match.value-a.match.value ||
        Date.parse(b.published_at||"1970-01-01")-Date.parse(a.published_at||"1970-01-01"))
      .slice(0,3);
  },[courses,profile,enrolledCourseIds]);

  function localized(course:CatalogCourse,field:"title"|"description"){
    const fr=course[(field+"_fr") as keyof CatalogCourse] as string|null;
    const en=course[(field+"_en") as keyof CatalogCourse] as string|null;
    const ar=course[(field+"_ar") as keyof CatalogCourse] as string|null;
    return (lang==="ar"?ar||fr||en:lang==="en"?en||fr||ar:fr||en||ar)||"";
  }

  const locale=lang==="ar"?"ar-MR":lang==="en"?"en-GB":"fr-FR";

  return <div className="retention-hub">
    {upcoming&&<section className="retention-next-session panel">
      <div className="retention-section-copy">
        <span className="eyebrow">{t({fr:"Votre prochaine Classroom",ar:"حصتك المباشرة القادمة",en:"Your next live class"})}</span>
        <h2>{upcoming.summary}</h2>
        <p>{new Intl.DateTimeFormat(locale,{
          weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit",timeZone:"Africa/Nouakchott"
        }).format(upcoming.start)} · {t({fr:"Heure de Nouakchott",ar:"بتوقيت نواكشوط",en:"Nouakchott time"})}</p>
      </div>
      <Link className="btn" href={upcoming.url.replace("https://www.vydys.com","")}>
        {t({fr:"Voir la séance",ar:"عرض الحصة",en:"View session"})} →
      </Link>
    </section>}

    <section className="retention-recommendations panel" aria-labelledby="student-recs-heading">
      <div className="retention-header">
        <div>
          <span className="eyebrow">{t({fr:"Découvrir ensuite",ar:"ماذا تتعلم بعد ذلك",en:"Explore next"})}</span>
          <h2 id="student-recs-heading">{t({
            fr:"Des formations qui correspondent à vos intérêts",
            ar:"دورات تناسب اهتماماتك",
            en:"Courses that match your interests"
          })}</h2>
          <p>{(profile?.learning_interests||[]).length?
            t({fr:"Sélectionnées à partir des centres d’intérêt indiqués dans votre profil.",ar:"مختارة حسب اهتمامات ملفك الشخصي.",en:"Suggested from the learning interests in your profile."})
            :t({fr:"Choisissez vos intérêts pour obtenir des suggestions plus pertinentes.",ar:"حدد اهتماماتك للحصول على اقتراحات أفضل.",en:"Choose your interests to get more relevant suggestions."})}</p>
        </div>
        <Link className="retention-text-link" href="/onboarding">{t({
          fr:"Modifier mes intérêts",ar:"تعديل اهتماماتي",en:"Edit my interests"
        })} →</Link>
      </div>
      {catalogError&&<p role="status" className="retention-note">{t({
        fr:"Les recommandations sont temporairement indisponibles.",ar:"التوصيات غير متاحة مؤقتاً.",en:"Recommendations are temporarily unavailable."
      })}</p>}
      {recommendations.length>0?<div className="retention-course-grid">
        {recommendations.map(course=>{
          const currency=String(course.base_currency||"MRU").toUpperCase();
          const activePrice=prices[course.id+":"+currency];
          const price=Number.isFinite(activePrice)?activePrice:Number(course.base_price_amount||0);
          const reason=reasons[course.match.matched];
          return <article className="retention-course-card" key={course.id}>
            <div className="retention-course-meta">
              {course.match.value>0 && reason?<span>{t(reason)}</span>:
                <span>{t({fr:"À découvrir",ar:"للاستكشاف",en:"Explore"})}</span>}
            </div>
            <h3>{localized(course,"title")}</h3>
            <p>{localized(course,"description").replace(/\s+/g," ").slice(0,120)}</p>
            <div className="retention-course-footer">
              <strong>{new Intl.NumberFormat(locale,{
                style:"currency",currency,maximumFractionDigits:0
              }).format(price)}</strong>
              <Link href={"/formation/"+encodeURIComponent(course.slug)}>
                {t({fr:"Voir la formation",ar:"عرض الدورة",en:"View course"})} →
              </Link>
            </div>
          </article>;
        })}
      </div>:!catalogError&&<div className="retention-empty">
        <p>{t({
          fr:"Vous avez déjà exploré les formations disponibles, ou les inscriptions sont closes. Continuez avec nos outils pratiques.",
          ar:"لقد استكشفت الدورات المتاحة أو أُغلق التسجيل. واصل التعلم بالأدوات العملية.",
          en:"You've explored the available courses, or enrollment has closed. Keep going with the practice tools."
        })}</p>
        <Link href="/practice" className="btn btn-ghost">Practice Hub →</Link>
      </div>}
    </section>

    <section id="learning-reminders" className="retention-reminder-settings panel" aria-labelledby="student-reminders-heading">
      <div className="retention-header">
        <div>
          <span className="eyebrow">{t({fr:"Rester motivé",ar:"حافظ على حماسك",en:"Stay on track"})}</span>
          <h2 id="student-reminders-heading">{t({
            fr:"Mes rappels d’apprentissage",ar:"تذكيرات التعلم",en:"My learning reminders"
          })}</h2>
          <p>{t({
            fr:"Choisissez les rappels à afficher dans votre centre de notifications Vydys.",
            ar:"اختر التذكيرات التي ستظهر في مركز إشعارات Vydys.",
            en:"Choose which reminders appear in your Vydys notification center."
          })}</p>
        </div>
        <Link className="retention-text-link" href="/notifications">{t({
          fr:"Voir mes notifications",ar:"عرض إشعاراتي",en:"Open notifications"
        })} →</Link>
      </div>
      <div className="retention-settings-grid">
        <label className="retention-setting">
          <span>
            <strong>{t({fr:"Rappels de Classroom",ar:"تذكيرات الحصص المباشرة",en:"Classroom reminders"})}</strong>
            <small>{t({
              fr:"Un rappel environ 24 heures puis 1 heure avant une séance à laquelle vous avez accès.",
              ar:"تذكير قبل حصتك بنحو 24 ساعة ثم ساعة واحدة.",
              en:"A reminder around 24 hours and 1 hour before a class you can attend."
            })}</small>
          </span>
          <input type="checkbox" checked={preferences.classroom_reminders}
            disabled={!preferencesLoaded||saving}
            onChange={event=>{void togglePreference("classroom_reminders",event.target.checked)}}/>
        </label>
        <label className="retention-setting">
          <span>
            <strong>{t({fr:"Motivation et progression",ar:"التحفيز والتقدم",en:"Study motivation and progress"})}</strong>
            <small>{t({
              fr:"Au maximum un rappel par semaine si votre formation n’avance pas depuis sept jours, et des étapes de progression.",
              ar:"تذكير أسبوعي على الأكثر إذا لم تتقدم خلال سبعة أيام، مع إشعارات الإنجاز.",
              en:"At most one weekly nudge after seven days without lesson progress, plus progress milestones."
            })}</small>
          </span>
          <input type="checkbox" checked={preferences.study_reminders}
            disabled={!preferencesLoaded||saving}
            onChange={event=>{void togglePreference("study_reminders",event.target.checked)}}/>
        </label>
      </div>
      <p className="retention-privacy-note">{t({
        fr:"Ces options sont désactivées par défaut. Aucun e-mail, SMS ou message WhatsApp n’est envoyé. Désactivez-les à tout moment.",
        ar:"هذه الخيارات معطلة افتراضياً. لا تُرسل رسائل عبر البريد أو SMS أو WhatsApp. يمكنك تعطيلها في أي وقت.",
        en:"Off by default. No email, SMS or WhatsApp is sent. Turn them off whenever you wish."
      })}</p>
      {notice&&<p className="retention-note" role="status">{notice}</p>}
    </section>
  </div>;
}
