"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";

type Period = 7 | 30 | 90;
type Series = "new_students" | "active_students" | "courses_completed";

type Day = {
  day:string;
  new_students:number;
  active_students:number;
  lessons_completed:number;
  courses_completed:number;
};

type Summary = {
  new_accounts:number;
  new_students:number;
  active_users:number;
  active_students:number;
  returning_students:number;
  new_enrollments:number;
  lessons_completed:number;
  courses_completed:number;
  certificates_issued:number;
  onboarded_students:number;
};

type Report = {
  period_days:number;
  period_start:string;
  period_end:string;
  tracking_started_at:string|null;
  summary:Summary;
  daily:Day[];
};

const empty:Summary = {
  new_accounts:0, new_students:0, active_users:0, active_students:0,
  returning_students:0, new_enrollments:0, lessons_completed:0,
  courses_completed:0, certificates_issued:0, onboarded_students:0
};

function numeric(value:unknown):number {
  const n=Number(value);
  return Number.isFinite(n)&&n>0 ? n : 0;
}

export default function AdminGrowthRetention(){
  const {t,lang}=useLanguage();
  const [days,setDays]=useState<Period>(30);
  const [series,setSeries]=useState<Series>("new_students");
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [refresh,setRefresh]=useState(0);

  useEffect(()=>{
    let active=true;
    setLoading(true);
    setError("");
    (async()=>{
      const {data,error:queryError}=await supabase.rpc("vydys_admin_growth_metrics",{p_days:days});
      if(!active)return;
      if(queryError){
        setError(t({
          fr:"Impossible de charger les indicateurs. Vérifiez votre accès administrateur.",
          ar:"تعذر تحميل المؤشرات. تحقق من صلاحيات الإدارة.",
          en:"Unable to load metrics. Check your administrator access."
        })+" "+queryError.message);
        setLoading(false);
        return;
      }
      if(!data||!Array.isArray(data.daily)||!data.summary){
        setError(t({fr:"Réponse statistique incomplète.",ar:"بيانات إحصائية غير مكتملة.",en:"Incomplete analytics response."}));
        setLoading(false);
        return;
      }
      setReport(data as Report);
      setLoading(false);
    })();
    return()=>{active=false};
  },[days,refresh]);

  const locale=lang==="ar"?"ar-MR":lang==="en"?"en-GB":"fr-FR";
  const fmt=(value:unknown)=>numeric(value).toLocaleString(locale);
  const summary=report?.summary||empty;
  const returningRate=summary.active_students
    ? Math.round(100*numeric(summary.returning_students)/numeric(summary.active_students))
    : null;

  const indicators=[
    {
      key:"accounts",value:summary.new_accounts,
      title:t({fr:"Nouveaux comptes",ar:"حسابات جديدة",en:"New accounts"}),
      note:t({fr:"Tous les rôles · période sélectionnée",ar:"جميع الأدوار · الفترة المحددة",en:"All roles · selected period"})
    },
    {
      key:"students",value:summary.new_students,
      title:t({fr:"Nouveaux étudiants",ar:"طلاب جدد",en:"New students"}),
      note:t({fr:"Profils étudiants créés",ar:"ملفات طلاب جديدة",en:"New student profiles"})
    },
    {
      key:"active",value:summary.active_users,
      title:t({fr:"Utilisateurs actifs",ar:"مستخدمون نشطون",en:"Active users"}),
      note:t({fr:"Comptes connectés ayant visité une page",ar:"حسابات دخلت وتصفحت صفحة",en:"Signed-in accounts that visited a page"})
    },
    {
      key:"active-students",value:summary.active_students,
      title:t({fr:"Étudiants actifs",ar:"طلاب نشطون",en:"Active students"}),
      note:t({fr:"Étudiants connectés identifiés",ar:"طلاب متصلون تم التعرف عليهم",en:"Identified signed-in students"})
    },
    {
      key:"returning",value:summary.returning_students,
      title:t({fr:"Étudiants qui reviennent",ar:"طلاب عادوا مجدداً",en:"Returning students"}),
      note:returningRate===null
        ? t({fr:"Taux de retour non calculable",ar:"تعذر حساب معدل العودة",en:"Return rate unavailable"})
        : returningRate+" % · "+t({
          fr:"actifs au moins deux jours distincts",
          ar:"نشطون في يومين مختلفين على الأقل",
          en:"active on at least two different days"
        })
    },
    {
      key:"enrolled",value:summary.new_enrollments,
      title:t({fr:"Inscriptions aux formations",ar:"تسجيلات الدورات",en:"Course enrollments"}),
      note:t({fr:"Accès aux formations activés",ar:"تم تفعيل الالتحاق بالدورات",en:"Course accesses activated"})
    },
    {
      key:"lessons",value:summary.lessons_completed,
      title:t({fr:"Leçons terminées",ar:"دروس مكتملة",en:"Lessons completed"}),
      note:t({fr:"Progressions enregistrées",ar:"إنجازات دراسية مسجلة",en:"Recorded lesson completions"})
    },
    {
      key:"completed",value:summary.courses_completed,
      title:t({fr:"Formations terminées",ar:"دورات مكتملة",en:"Courses completed"}),
      note:t({fr:"Toutes les leçons achevées par un étudiant inscrit",ar:"إكمال جميع دروس دورة من طرف طالب مسجل",en:"All lessons completed by an enrolled student"})
    },
    {
      key:"certificates",value:summary.certificates_issued,
      title:t({fr:"Certificats délivrés",ar:"شهادات صادرة",en:"Certificates issued"}),
      note:t({fr:"Émis durant la période",ar:"صادرة خلال الفترة",en:"Issued during the selected period"})
    }
  ];

  const byDay=useMemo(()=>{
    const rows=(report?.daily||[]).map(row=>({
      day:String(row.day),
      new_students:numeric(row.new_students),
      active_students:numeric(row.active_students),
      courses_completed:numeric(row.courses_completed),
      lessons_completed:numeric(row.lessons_completed)
    }));
    if(days!==90)return rows.map(row=>({...row,shortLabel:row.day.slice(5)}));
    const result:Array<typeof rows[number] & {shortLabel:string}>=[];
    for(let i=0;i<rows.length;i+=7){
      const part=rows.slice(i,i+7);
      if(!part.length)continue;
      result.push({
        day:part[0].day,
        shortLabel:part[0].day.slice(5)+"–"+part[part.length-1].day.slice(5),
        new_students:part.reduce((acc,row)=>acc+row.new_students,0),
        // Active students are deduplicated per day, not across the week.
        // Label this as daily-unique activity summed over the 7 days.
        active_students:part.reduce((acc,row)=>acc+row.active_students,0),
        courses_completed:part.reduce((acc,row)=>acc+row.courses_completed,0),
        lessons_completed:part.reduce((acc,row)=>acc+row.lessons_completed,0)
      });
    }
    return result;
  },[report,days]);

  const seriesLabels:Record<Series,string>={
    new_students:t({fr:"Nouveaux étudiants",ar:"طلاب جدد",en:"New students"}),
    active_students:t({fr:"Étudiants actifs",ar:"طلاب نشطون",en:"Active students"}),
    courses_completed:t({fr:"Formations terminées",ar:"دورات مكتملة",en:"Completed courses"})
  };
  const chartValues=byDay.map(row=>row[series]);
  const chartMax=Math.max(1,...chartValues);
  const chartTotal=chartValues.reduce((sum,item)=>sum+item,0);

  return <section id="growth-retention" className="vydys-growth-panel" aria-labelledby="vydys-growth-title">
    <div className="admin-data-section-head">
      <div>
        <span className="tag">{t({fr:"Croissance & fidélisation",ar:"النمو والاحتفاظ",en:"Growth & retention"})}</span>
        <h2 id="vydys-growth-title">{t({
          fr:"Les inscriptions et les étudiants qui reviennent",
          ar:"التسجيلات والطلاب العائدون",
          en:"Sign-ups and returning learners"
        })}</h2>
        <p>{t({
          fr:"Suivi à partir des comptes, visites connectées et leçons réellement achevées.",
          ar:"مؤشرات مستندة إلى الحسابات والزيارات المسجلة والدروس المكتملة فعلاً.",
          en:"Measured from real accounts, signed-in visits and completed lessons."
        })}</p>
      </div>
      <div className="growth-period-picker" role="group" aria-label={t({fr:"Période du rapport",ar:"فترة التقرير",en:"Report period"})}>
        {([7,30,90] as const).map(period=><button type="button" key={period}
          aria-pressed={period===days} className={period===days?"active":""}
          onClick={()=>setDays(period)}>{period} {t({fr:"j",ar:"ي",en:"d"})}</button>)}
      </div>
    </div>

    {error&&<div className="panel growth-report-error" role="alert">
      <p>{error}</p><button className="btn btn-small" type="button" onClick={()=>setRefresh(n=>n+1)}>
        {t({fr:"Réessayer",ar:"إعادة المحاولة",en:"Retry"})}
      </button>
    </div>}

    {loading&&<div role="status" className="panel growth-report-loading">
      {t({fr:"Calcul des indicateurs de croissance...",ar:"جار حساب مؤشرات النمو...",en:"Calculating growth metrics..."})}
    </div>}

    {!loading&&report&&!error&&<>
      <div className="growth-kpi-grid">
        {indicators.map((item,index)=><article key={item.key}
          className={"panel growth-kpi"+(index===2?" growth-kpi-highlight":"")}>
          <span>{item.title}</span>
          <strong>{fmt(item.value)}</strong>
          <small>{item.note}</small>
        </article>)}
      </div>

      <div className="panel growth-trends">
        <div className="growth-chart-heading">
          <div>
            <h3>{t({fr:"Évolution sur la période",ar:"تطور الأداء خلال الفترة",en:"Trend over the period"})}</h3>
            <p>{seriesLabels[series]} · {chartTotal.toLocaleString(locale)} {t({
              fr:days===90&&series==="active_students"?"activités journalières (cumulées)":"événements représentés",
              ar:days===90&&series==="active_students"?"نشاطات يومية مجمعة":"أحداث ممثلة",
              en:days===90&&series==="active_students"?"daily-unique activity summed across weeks":"events represented"
            })}</p>
          </div>
          <div className="growth-series-switch">
            {(["new_students","active_students","courses_completed"] as const).map(kind=>
              <button type="button" key={kind} aria-pressed={series===kind}
                className={series===kind?"active":""} onClick={()=>setSeries(kind)}>
                {seriesLabels[kind]}
              </button>)}
          </div>
        </div>
        <div className="growth-plot-scroller">
          <div className="growth-bar-plot" role="img" aria-label={seriesLabels[series]+". "+chartTotal.toLocaleString(locale)}>
            {byDay.map((day,i)=>{
              const val=day[series];
              const height=val===0?0:Math.max(4,Math.round((val/chartMax)*150));
              return <div className="growth-bar-column" key={day.day} title={day.shortLabel+" · "+val}>
                <div className="growth-bar-top">
                  <span className="growth-bar-value">{val||""}</span>
                  <div className="growth-bar" style={{height:height+"px"}} aria-hidden="true"/>
                </div>
                <small>{days===90?day.shortLabel:(i%Math.max(1,Math.ceil(byDay.length/10))===0?day.shortLabel:"")}</small>
              </div>;
            })}
          </div>
        </div>
        {!chartTotal&&<p className="growth-no-events">{t({
          fr:"Aucun événement enregistré pour cet indicateur pendant la période.",
          ar:"لم يتم تسجيل أحداث لهذا المؤشر خلال الفترة.",
          en:"No recorded events for this metric in this period."
        })}</p>}
        <details className="growth-data-details">
          <summary>{t({fr:"Afficher les données journalières",ar:"عرض البيانات اليومية",en:"Show daily data"})}</summary>
          <div className="growth-data-scroller">
            <table>
              <thead><tr>
                <th>{t({fr:"Date",ar:"التاريخ",en:"Date"})}</th>
                <th>{t({fr:"Nouveaux étudiants",ar:"طلاب جدد",en:"New students"})}</th>
                <th>{t({fr:"Étudiants actifs",ar:"طلاب نشطون",en:"Active students"})}</th>
                <th>{t({fr:"Formations terminées",ar:"دورات مكتملة",en:"Courses completed"})}</th>
              </tr></thead>
              <tbody>{(report.daily||[]).map(row=><tr key={row.day}>
                <td>{row.day}</td>
                <td>{fmt(row.new_students)}</td>
                <td>{fmt(row.active_students)}</td>
                <td>{fmt(row.courses_completed)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="panel growth-methodology">
        <strong>{t({fr:"Comment lire ces chiffres",ar:"كيفية قراءة هذه الأرقام",en:"How these numbers are measured"})}</strong>
        <p>{t({
          fr:"Actif = compte identifié ayant ouvert une page. Retour = étudiant actif au moins deux jours distincts. Une formation n'est terminée que lorsque toutes ses leçons sont validées par un étudiant inscrit. Les visites anonymes ne comptent pas dans ces indicateurs.",
          ar:"النشط هو حساب معروف زار صفحة. العائد هو طالب نشط في يومين مختلفين على الأقل. لا تُعد الدورة مكتملة إلا إذا أتم الطالب المسجل جميع دروسها. الزيارات المجهولة ليست ضمن هذه المؤشرات.",
          en:"Active = an identified signed-in account that visited a page. Returning = a student active on at least two different days. A course is completed only when an enrolled learner finishes every lesson. Anonymous visits are excluded."
        })}</p>
        <p>{t({
          fr:"Les périodes correspondent aux jours civils de Nouakchott (UTC+0). La somme des actifs journaliers ne représente pas les utilisateurs uniques de toute la période.",
          ar:"الفترات محسوبة بالأيام المحلية لنواكشوط (UTC+0). مجموع النشاط اليومي لا يساوي عدد المستخدمين الفريدين للفترة.",
          en:"Periods use Nouakchott calendar days (UTC+0). Summed daily active users do not equal period-wide unique users."
        })}</p>
        {report.tracking_started_at&&<small>{t({
          fr:"Suivi des visites disponible depuis le ",
          ar:"بيانات زيارات الموقع متاحة منذ ",
          en:"Page-view tracking available since "
        })}{new Date(report.tracking_started_at).toLocaleDateString(locale,{
          day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Nouakchott"
        })}. {t({
          fr:"Les chiffres d'activité antérieurs à cette date ne sont pas disponibles.",
          ar:"لا تتوفر بيانات النشاط قبل ذلك التاريخ.",
          en:"Activity before this date is not available."
        })}</small>}
      </div>
    </>}
  </section>;
}
