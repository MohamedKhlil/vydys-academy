"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import { supabase } from "../lib/supabase";

type Analytics={
  total_page_views:number;
  total_unique_visitors:number;
  total_sessions:number;
  visitors_today:number;
  page_views_today:number;
  visitors_7d:number;
  page_views_7d:number;
  visitors_30d:number;
  page_views_30d:number;
  logged_in_visitors_30d:number;
  anonymous_visitors_30d:number;
  top_pages:Array<{path:string;title?:string|null;views:number;visitors:number}>;
  sources:Array<{source:string;sessions:number;visitors:number}>;
  devices:Array<{device:string;views:number;visitors:number}>;
  browsers:Array<{browser:string;views:number;visitors:number}>;
  daily:Array<{day:string;views:number;visitors:number}>;
};

const empty:Analytics={
  total_page_views:0,total_unique_visitors:0,total_sessions:0,
  visitors_today:0,page_views_today:0,visitors_7d:0,page_views_7d:0,
  visitors_30d:0,page_views_30d:0,logged_in_visitors_30d:0,anonymous_visitors_30d:0,
  top_pages:[],sources:[],devices:[],browsers:[],daily:[]
};

export default function AdminVisitorAnalytics(){
  const {t}=useLanguage();
  const [days,setDays]=useState(30);
  const [data,setData]=useState<Analytics>(empty);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [campaigns,setCampaigns]=useState<Array<{source:string;medium:string;campaign:string;sessions:number;visitors:number;signed_in_visitors:number}>>([]);

  async function load(period=days){
    setLoading(true);setError("");
    const [{data:res,error:invokeError},{data:campaignData,error:campaignError}]=await Promise.all([
      supabase.functions.invoke("vydys-admin-analytics",{body:{days:period}}),
      supabase.from("vydys_acquisition_campaigns")
        .select("source,medium,campaign,sessions,visitors,signed_in_visitors")
        .order("sessions",{ascending:false})
        .limit(12)
    ]);
    if(!campaignError)setCampaigns((campaignData||[]) as Array<{source:string;medium:string;campaign:string;sessions:number;visitors:number;signed_in_visitors:number}>);
    if(invokeError||res?.error){
      setError(res?.detail||res?.error||invokeError?.message||"Analytics error");
      setLoading(false);return;
    }
    setData({...empty,...(res?.analytics||{})});
    setLoading(false);
  }

  useEffect(()=>{load(30)},[]);

  const maxViews=useMemo(()=>Math.max(1,...(data.daily||[]).map(x=>Number(x.views||0))),[data.daily]);
  const trackedSince=data.total_page_views>0;

  return <section className="admin-visitor-analytics">
    <div className="admin-data-section-head">
      <div>
        <span className="tag">{t({fr:"Audience",ar:"الجمهور",en:"Audience"})}</span>
        <h2>{t({fr:"Visiteurs & trafic",ar:"الزوار وحركة المرور",en:"Visitors & traffic"})}</h2>
      </div>
      <div className="analytics-period-switch">
        {[7,30,90].map(n=><button key={n} className={days===n?"active":""} onClick={()=>{setDays(n);load(n)}}>{n}j</button>)}
      </div>
    </div>

    {error&&<div className="manual-note">{error}</div>}

    <div className="metric-grid platform-metric-grid analytics-main-kpis">
      <article className="panel metric metric-primary">
        <span>{t({fr:"Visiteurs uniques",ar:"الزوار الفريدون",en:"Unique visitors"})}</span>
        <strong>{Number(data.total_unique_visitors||0).toLocaleString("fr-FR")}</strong>
        <small>{t({fr:"depuis le début du suivi",ar:"منذ بدء التتبع",en:"since tracking started"})}</small>
      </article>
      <article className="panel metric">
        <span>{t({fr:"Aujourd’hui",ar:"اليوم",en:"Today"})}</span>
        <strong>{Number(data.visitors_today||0).toLocaleString("fr-FR")}</strong>
        <small>{Number(data.page_views_today||0).toLocaleString("fr-FR")} {t({fr:"pages vues",ar:"مشاهدة صفحة",en:"page views"})}</small>
      </article>
      <article className="panel metric">
        <span>{t({fr:"7 derniers jours",ar:"آخر 7 أيام",en:"Last 7 days"})}</span>
        <strong>{Number(data.visitors_7d||0).toLocaleString("fr-FR")}</strong>
        <small>{Number(data.page_views_7d||0).toLocaleString("fr-FR")} {t({fr:"pages vues",ar:"مشاهدة صفحة",en:"page views"})}</small>
      </article>
      <article className="panel metric">
        <span>{t({fr:"30 derniers jours",ar:"آخر 30 يوماً",en:"Last 30 days"})}</span>
        <strong>{Number(data.visitors_30d||0).toLocaleString("fr-FR")}</strong>
        <small>{Number(data.page_views_30d||0).toLocaleString("fr-FR")} {t({fr:"pages vues",ar:"مشاهدة صفحة",en:"page views"})}</small>
      </article>
      <article className="panel metric">
        <span>{t({fr:"Sessions",ar:"الجلسات",en:"Sessions"})}</span>
        <strong>{Number(data.total_sessions||0).toLocaleString("fr-FR")}</strong>
        <small>{Number(data.total_page_views||0).toLocaleString("fr-FR")} {t({fr:"pages vues au total",ar:"إجمالي مشاهدات الصفحات",en:"total page views"})}</small>
      </article>
    </div>

    <div className="analytics-split-kpis">
      <article className="panel analytics-mini-card"><span>{t({fr:"Visiteurs connectés · 30j",ar:"زوار مسجلون · 30 يوم",en:"Signed-in visitors · 30d"})}</span><strong>{data.logged_in_visitors_30d||0}</strong></article>
      <article className="panel analytics-mini-card"><span>{t({fr:"Visiteurs anonymes · 30j",ar:"زوار مجهولون · 30 يوم",en:"Anonymous visitors · 30d"})}</span><strong>{data.anonymous_visitors_30d||0}</strong></article>
      <article className="panel analytics-mini-card"><span>{t({fr:"Pages / session",ar:"صفحات لكل جلسة",en:"Pages / session"})}</span><strong>{data.total_sessions?Number(data.total_page_views/data.total_sessions).toFixed(1):"0.0"}</strong></article>
    </div>

    <article className="panel analytics-chart-card">
      <div className="admin-section-head">
        <div><span className="eyebrow">{t({fr:"Évolution",ar:"التطور",en:"Trend"})}</span><h3>{t({fr:"Trafic quotidien",ar:"حركة المرور اليومية",en:"Daily traffic"})}</h3></div>
        <div className="analytics-legend"><span><i className="views"></i>{t({fr:"Pages vues",ar:"المشاهدات",en:"Views"})}</span><span><i className="visitors"></i>{t({fr:"Visiteurs",ar:"الزوار",en:"Visitors"})}</span></div>
      </div>
      {!trackedSince&&!loading?<div className="analytics-empty">{t({
        fr:"Le suivi vient d’être activé. Les premières données apparaîtront dès les prochaines visites.",
        ar:"تم تفعيل التتبع للتو. ستظهر البيانات مع الزيارات القادمة.",
        en:"Tracking has just been enabled. Data will appear with the next visits."
      })}</div>:<div className="analytics-bars">
        {(data.daily||[]).map((d,i)=><div className="analytics-bar-day" key={d.day} title={new Date(d.day).toLocaleDateString()+" · "+d.views+" vues · "+d.visitors+" visiteurs"}>
          <div className="analytics-bar-stack">
            <span className="analytics-bar views" style={{height:Math.max(3,Number(d.views||0)/maxViews*100)+"%"}}></span>
            <span className="analytics-bar visitors" style={{height:Math.max(2,Number(d.visitors||0)/maxViews*100)+"%"}}></span>
          </div>
          {(i===0||i===data.daily.length-1||i%Math.max(1,Math.floor(data.daily.length/6))===0)&&<small>{new Date(d.day).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</small>}
        </div>)}
      </div>}
    </article>

    <article className="panel analytics-chart-card growth-campaign-report">
      <div className="admin-section-head">
        <div>
          <span className="eyebrow">{t({fr:"Croissance",ar:"النمو",en:"Growth"})}</span>
          <h3>{t({fr:"Campagnes et partages Vydys",ar:"حملات وروابط مشاركة Vydys",en:"Campaigns and Vydys shares"})}</h3>
          <p>{t({
            fr:"Visites identifiées par les liens UTM (90 derniers jours). Les visites directes sans tag ne figurent pas ici.",
            ar:"زيارات الروابط التسويقية خلال آخر 90 يوماً. الزيارات المباشرة بدون وسم غير مدرجة.",
            en:"Visits attributed to campaign links in the last 90 days. Direct visits without UTM tags are excluded."
          })}</p>
        </div>
      </div>
      {campaigns.length===0
        ? <p className="analytics-empty">{t({fr:"Aucune campagne identifiée pour le moment. Les liens de partage Vydys sont désormais suivis.",ar:"لا توجد حملات مسجلة بعد. يتم الآن تتبع روابط المشاركة.",en:"No tagged campaigns yet. Vydys share links are now tracked."})}</p>
        : <div className="analytics-ranking compact">
          {campaigns.map((item,i)=><div key={item.source+"-"+item.medium+"-"+item.campaign}>
            <b>{i+1}</b>
            <span><strong>{item.campaign}</strong><small>{item.source} · {item.medium} · {item.visitors} {t({fr:"visiteurs",ar:"زوار",en:"visitors"})}</small></span>
            <em>{item.sessions} {t({fr:"sessions",ar:"جلسات",en:"sessions"})}</em>
          </div>)}
        </div>}
    </article>

    <div className="analytics-details-grid">
      <article className="panel analytics-list-card">
        <div className="admin-section-head"><div><span className="eyebrow">TOP</span><h3>{t({fr:"Pages les plus consultées",ar:"الصفحات الأكثر زيارة",en:"Top pages"})}</h3></div></div>
        <div className="analytics-ranking">
          {(data.top_pages||[]).length===0?<p>{t({fr:"Pas encore de données.",ar:"لا توجد بيانات بعد.",en:"No data yet."})}</p>:(data.top_pages||[]).map((x,i)=><div key={x.path}>
            <b>{i+1}</b><span><strong>{x.title||x.path}</strong><small>{x.path}</small></span><em>{x.views} {t({fr:"vues",ar:"مشاهدة",en:"views"})}</em>
          </div>)}
        </div>
      </article>

      <article className="panel analytics-list-card">
        <div className="admin-section-head"><div><span className="eyebrow">{t({fr:"Acquisition",ar:"الاكتساب",en:"Acquisition"})}</span><h3>{t({fr:"Sources de trafic",ar:"مصادر الزيارات",en:"Traffic sources"})}</h3></div></div>
        <div className="analytics-ranking compact">
          {(data.sources||[]).length===0?<p>{t({fr:"Pas encore de données.",ar:"لا توجد بيانات بعد.",en:"No data yet."})}</p>:(data.sources||[]).map((x,i)=><div key={x.source}>
            <b>{i+1}</b><span><strong>{x.source}</strong><small>{x.visitors} {t({fr:"visiteurs",ar:"زوار",en:"visitors"})}</small></span><em>{x.sessions}</em>
          </div>)}
        </div>
      </article>

      <article className="panel analytics-list-card">
        <div className="admin-section-head"><div><span className="eyebrow">{t({fr:"Technologie",ar:"التقنية",en:"Technology"})}</span><h3>{t({fr:"Appareils",ar:"الأجهزة",en:"Devices"})}</h3></div></div>
        <div className="analytics-tech-list">
          {(data.devices||[]).map(x=><div key={x.device}><span>{x.device==="mobile"?"▯":x.device==="tablet"?"▭":"▰"} {x.device}</span><strong>{x.visitors}</strong></div>)}
        </div>
      </article>

      <article className="panel analytics-list-card">
        <div className="admin-section-head"><div><span className="eyebrow">{t({fr:"Navigateurs",ar:"المتصفحات",en:"Browsers"})}</span><h3>{t({fr:"Navigateurs utilisés",ar:"المتصفحات المستخدمة",en:"Browser usage"})}</h3></div></div>
        <div className="analytics-tech-list">
          {(data.browsers||[]).map(x=><div key={x.browser}><span>{x.browser}</span><strong>{x.visitors}</strong></div>)}
        </div>
      </article>
    </div>
  </section>
}
