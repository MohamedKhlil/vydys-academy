"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../../components/language-provider";
import { supabase } from "../../../../lib/supabase";

const dayDefs=[
  {v:0,fr:"Dim",ar:"الأحد",en:"Sun"},
  {v:1,fr:"Lun",ar:"الاثنين",en:"Mon"},
  {v:2,fr:"Mar",ar:"الثلاثاء",en:"Tue"},
  {v:3,fr:"Mer",ar:"الأربعاء",en:"Wed"},
  {v:4,fr:"Jeu",ar:"الخميس",en:"Thu"},
  {v:5,fr:"Ven",ar:"الجمعة",en:"Fri"},
  {v:6,fr:"Sam",ar:"السبت",en:"Sat"}
];

export default function NewClassroomPage(){
  const {lang,t}=useLanguage();
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [currencies,setCurrencies]=useState<any[]>([]);
  const [titleFr,setTitleFr]=useState("");
  const [titleAr,setTitleAr]=useState("");
  const [titleEn,setTitleEn]=useState("");
  const [descFr,setDescFr]=useState("");
  const [descAr,setDescAr]=useState("");
  const [descEn,setDescEn]=useState("");
  const [visibility,setVisibility]=useState("public");
  const [language,setLanguage]=useState("fr");
  const [level,setLevel]=useState("all");
  const [timezone,setTimezone]=useState("Africa/Nouakchott");
  const [startDate,setStartDate]=useState("");
  const [sessionCount,setSessionCount]=useState("8");
  const [days,setDays]=useState<number[]>([2,4]);
  const [startTime,setStartTime]=useState("19:00");
  const [duration,setDuration]=useState("90");
  const [capacity,setCapacity]=useState("25");
  const [price,setPrice]=useState("60");
  const [currency,setCurrency]=useState("USD");
  const [certificate,setCertificate]=useState(true);
  const [recording,setRecording]=useState(false);
  const [replay,setReplay]=useState(false);
  const [prerequisites,setPrerequisites]=useState("");
  const [program,setProgram]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setAllowed(false);return}
    const [{data:p},{data:c}]=await Promise.all([
      supabase.from("profiles").select("role,timezone,preferred_currency").eq("id",user.id).maybeSingle(),
      supabase.from("currency_catalog").select("code,name").eq("enabled",true).order("code")
    ]);
    const ok=p?.role==="instructor";setAllowed(ok);if(!ok)return;
    setCurrencies(c||[]);
    if(p?.timezone)setTimezone(p.timezone);
    if(p?.preferred_currency){setCurrency(p.preferred_currency);setPrice(p.preferred_currency==="MRU"?"2500":"60")}
  })()},[]);

  const preview=useMemo(()=>{
    if(!startDate||days.length===0)return [];
    const out:Date[]=[];const d=new Date(startDate+"T12:00:00");
    let guard=0;
    while(out.length<Math.min(Number(sessionCount)||0,10)&&guard<400){
      if(days.includes(d.getDay()))out.push(new Date(d));
      d.setDate(d.getDate()+1);guard++;
    }
    return out;
  },[startDate,days,sessionCount]);

  function toggleDay(v:number){setDays(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v].sort())}

  async function submit(e:FormEvent){
    e.preventDefault();setMessage("");
    if(!startDate){setMessage(t({fr:"Choisissez une date de début.",ar:"اختر تاريخ البداية.",en:"Choose a start date."}));return}
    if(days.length===0){setMessage(t({fr:"Choisissez au moins un jour.",ar:"اختر يوماً واحداً على الأقل.",en:"Choose at least one weekday."}));return}
    setBusy(true);
    const {data,error}=await supabase.rpc("create_classroom_with_schedule",{
      p_title_fr:titleFr,p_title_ar:titleAr,p_title_en:titleEn,
      p_description_fr:descFr,p_description_ar:descAr,p_description_en:descEn,
      p_visibility:visibility,p_language:language,p_level:level,p_timezone:timezone,
      p_start_date:startDate,p_session_count:Number(sessionCount),p_weekly_days:days,
      p_start_time:startTime,p_duration_minutes:Number(duration),p_capacity:Number(capacity),
      p_price:Number(price),p_currency:currency,p_certificate:certificate,p_recording:recording,p_replay:replay,
      p_prerequisites:prerequisites,p_program:program
    });
    setBusy(false);
    if(error){setMessage(error.message);return}
    window.location.href="/formateur/classrooms/"+data;
  }

  if(allowed===null)return <section className="dashboard-shell"><div className="container">...</div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Accès formateur requis",ar:"يلزم حساب مدرب",en:"Instructor access required"})}</h1></article></div></section>;

  return <section className="dashboard-shell classroom-create-page"><div className="container">
    <div className="dash-header"><div><span className="eyebrow">Vydys Classroom Builder</span><h1>{t({fr:"Créer une cohorte live",ar:"إنشاء دفعة مباشرة",en:"Create a live cohort"})}</h1><p>{t({fr:"Définissez la date de début, les jours, l’heure et le nombre de séances : Vydys construit automatiquement le calendrier complet.",ar:"حدد تاريخ البداية والأيام والوقت وعدد الحصص وسيقوم Vydys بإنشاء الجدول كاملاً.",en:"Set the start date, weekdays, time and number of sessions. Vydys automatically builds the full schedule."})}</p></div></div>

    {message&&<p className="manual-note">{message}</p>}
    <form onSubmit={submit} className="classroom-builder-layout">
      <div className="classroom-builder-main">
        <article className="panel trainer-form"><span className="eyebrow">01 · {t({fr:"Identité",ar:"الهوية",en:"Identity"})}</span><h2>{t({fr:"Présentez la Classroom",ar:"عرّف الفصل",en:"Present the Classroom"})}</h2>
          <div className="form-grid">
            <label className="form-field"><span>Titre FR</span><input required value={titleFr} onChange={e=>setTitleFr(e.target.value)}/></label>
            <label className="form-field"><span>العنوان AR</span><input value={titleAr} onChange={e=>setTitleAr(e.target.value)}/></label>
            <label className="form-field"><span>Title EN</span><input value={titleEn} onChange={e=>setTitleEn(e.target.value)}/></label>
            <label className="form-field"><span>{t({fr:"Visibilité",ar:"الظهور",en:"Visibility"})}</span><select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">{t({fr:"Publique · marketplace",ar:"عام · السوق",en:"Public · marketplace"})}</option><option value="private">{t({fr:"Privée · invitation",ar:"خاص · دعوة",en:"Private · invitation"})}</option></select></label>
            <label className="form-field"><span>{t({fr:"Langue principale",ar:"اللغة الرئيسية",en:"Primary language"})}</span><select value={language} onChange={e=>setLanguage(e.target.value)}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></label>
            <label className="form-field"><span>{t({fr:"Niveau",ar:"المستوى",en:"Level"})}</span><select value={level} onChange={e=>setLevel(e.target.value)}><option value="all">{t({fr:"Tous niveaux",ar:"كل المستويات",en:"All levels"})}</option><option value="beginner">{t({fr:"Débutant",ar:"مبتدئ",en:"Beginner"})}</option><option value="intermediate">{t({fr:"Intermédiaire",ar:"متوسط",en:"Intermediate"})}</option><option value="advanced">{t({fr:"Avancé",ar:"متقدم",en:"Advanced"})}</option></select></label>
            <label className="form-field full-row"><span>Description FR</span><textarea rows={4} value={descFr} onChange={e=>setDescFr(e.target.value)}/></label>
            <label className="form-field full-row"><span>الوصف AR</span><textarea rows={4} value={descAr} onChange={e=>setDescAr(e.target.value)}/></label>
            <label className="form-field full-row"><span>Description EN</span><textarea rows={4} value={descEn} onChange={e=>setDescEn(e.target.value)}/></label>
          </div>
        </article>

        <article className="panel trainer-form"><span className="eyebrow">02 · {t({fr:"Calendrier",ar:"الجدول",en:"Schedule"})}</span><h2>{t({fr:"Planifiez les séances",ar:"برمج الحصص",en:"Schedule the sessions"})}</h2>
          <div className="form-grid">
            <label className="form-field"><span>{t({fr:"Date de début",ar:"تاريخ البداية",en:"Start date"})}</span><input type="date" required value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
            <label className="form-field"><span>{t({fr:"Nombre de séances",ar:"عدد الحصص",en:"Number of sessions"})}</span><input type="number" min="1" max="200" value={sessionCount} onChange={e=>setSessionCount(e.target.value)}/></label>
            <label className="form-field"><span>{t({fr:"Heure",ar:"الوقت",en:"Start time"})}</span><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}/></label>
            <label className="form-field"><span>{t({fr:"Durée (minutes)",ar:"المدة بالدقائق",en:"Duration (minutes)"})}</span><input type="number" min="15" max="480" value={duration} onChange={e=>setDuration(e.target.value)}/></label>
            <label className="form-field full-row"><span>{t({fr:"Fuseau horaire",ar:"المنطقة الزمنية",en:"Timezone"})}</span><input value={timezone} onChange={e=>setTimezone(e.target.value)} placeholder="Africa/Nouakchott"/></label>
          </div>
          <div className="classroom-weekdays">{dayDefs.map(d=><button type="button" key={d.v} className={days.includes(d.v)?"active":""} onClick={()=>toggleDay(d.v)}>{lang==="ar"?d.ar:lang==="en"?d.en:d.fr}</button>)}</div>
          <div className="schedule-preview"><strong>{t({fr:"Aperçu",ar:"معاينة",en:"Preview"})}</strong>{preview.length===0?<p>{t({fr:"Choisissez une date pour voir les premières séances.",ar:"اختر تاريخاً لرؤية الحصص الأولى.",en:"Choose a date to preview sessions."})}</p>:preview.map((d,i)=><span key={i}>#{i+1} · {new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}).format(d)} · {startTime}</span>)}</div>
        </article>

        <article className="panel trainer-form"><span className="eyebrow">03 · {t({fr:"Commerce & expérience",ar:"التجارة والتجربة",en:"Commerce & experience"})}</span><h2>{t({fr:"Places, prix et options pédagogiques",ar:"المقاعد والسعر وخيارات التعلم",en:"Seats, pricing and learning options"})}</h2>
          <div className="form-grid">
            <label className="form-field"><span>{t({fr:"Capacité maximale",ar:"السعة القصوى",en:"Maximum seats"})}</span><input type="number" min="1" max="5000" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label>
            <label className="form-field"><span>{t({fr:"Prix étudiant",ar:"سعر الطالب",en:"Student price"})}</span><input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label>
            <label className="form-field"><span>{t({fr:"Devise",ar:"العملة",en:"Currency"})}</span><select value={currency} onChange={e=>setCurrency(e.target.value)}>{currencies.map(c=><option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}</select></label>
            <label className="form-field full-row"><span>{t({fr:"Prérequis",ar:"المتطلبات",en:"Prerequisites"})}</span><textarea rows={3} value={prerequisites} onChange={e=>setPrerequisites(e.target.value)}/></label>
            <label className="form-field full-row"><span>{t({fr:"Programme",ar:"البرنامج",en:"Program"})}</span><textarea rows={6} value={program} onChange={e=>setProgram(e.target.value)} placeholder={t({fr:"Session 1 — ...\nSession 2 — ...",ar:"الحصة 1 — ...\nالحصة 2 — ...",en:"Session 1 — ...\nSession 2 — ..."})}/></label>
          </div>
          <div className="classroom-toggle-grid">
            <label><input type="checkbox" checked={certificate} onChange={e=>setCertificate(e.target.checked)}/><span>{t({fr:"Certificat de fin",ar:"شهادة إتمام",en:"Completion certificate"})}</span></label>
            <label><input type="checkbox" checked={recording} onChange={e=>setRecording(e.target.checked)}/><span>{t({fr:"Prévoir l’enregistrement",ar:"تفعيل التسجيل",en:"Enable recording workflow"})}</span></label>
            <label><input type="checkbox" checked={replay} onChange={e=>setReplay(e.target.checked)}/><span>{t({fr:"Replays pour les inscrits",ar:"إعادة المشاهدة للمسجلين",en:"Replays for enrolled learners"})}</span></label>
          </div>
        </article>
      </div>

      <aside className="classroom-builder-side">
        <article className="panel classroom-builder-summary"><span>LIVE</span><h2>{titleFr||t({fr:"Votre Classroom",ar:"فصلك المباشر",en:"Your Classroom"})}</h2><p>{sessionCount} {t({fr:"séances",ar:"حصة",en:"sessions"})} · {duration} min · {capacity} {t({fr:"places",ar:"مقعد",en:"seats"})}</p><strong>{Number(price||0).toLocaleString("fr-FR")} {currency}</strong><small>{t({fr:"Création gratuite. Après validation Admin, le frais de lancement Classroom sera demandé selon le tarif configuré par la Direction.",ar:"الإنشاء مجاني. بعد اعتماد الإدارة ستُطلب رسوم إطلاق الفصل حسب السعر الذي تحدده الإدارة.",en:"Creation is free. After Admin approval, the Classroom launch fee configured by Management will be requested."})}</small><button className="btn full" disabled={busy}>{busy?"...":t({fr:"Créer le brouillon",ar:"إنشاء المسودة",en:"Create draft"})}</button></article>
      </aside>
    </form>
  </div></section>
}
