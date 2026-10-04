"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

const levelOrder=["none","beginner","intermediate","advanced","expert"];
const levelLabels={
  none:{fr:"À découvrir",ar:"غير مكتسب",en:"Not yet"},
  beginner:{fr:"Débutant",ar:"مبتدئ",en:"Beginner"},
  intermediate:{fr:"Intermédiaire",ar:"متوسط",en:"Intermediate"},
  advanced:{fr:"Avancé",ar:"متقدم",en:"Advanced"},
  expert:{fr:"Expert",ar:"خبير",en:"Expert"}
};

export default function SkillEnginePage(){
  const {t,lang}=useLanguage();
  const [loading,setLoading]=useState(true);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [userId,setUserId]=useState("");
  const [engine,setEngine]=useState<any>(null);
  const [editingGoal,setEditingGoal]=useState(false);
  const [selectedPath,setSelectedPath]=useState("");
  const [weeklyHours,setWeeklyHours]=useState(5);
  const [targetMonths,setTargetMonths]=useState(6);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");

  function textOf(x:any,key:string){
    if(lang==="ar")return x?.[key+"_ar"]||x?.[key+"_fr"]||"";
    if(lang==="en")return x?.[key+"_en"]||x?.[key+"_fr"]||"";
    return x?.[key+"_fr"]||"";
  }
  function levelLabel(level:string){return t((levelLabels as any)[level]||levelLabels.none)}

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    const ok=p?.role==="student";setAllowed(ok);
    if(!ok){setLoading(false);return}

    const {data,error}=await supabase.rpc("get_my_skill_engine");
    if(error){setNotice(error.message);setLoading(false);return}
    setEngine(data);
    if(data?.goal){
      setSelectedPath(data.goal.career_path_id);
      setWeeklyHours(data.goal.weekly_hours||5);
      setTargetMonths(data.goal.target_months||6);
    }else if(data?.career_paths?.length){
      setSelectedPath(data.career_paths[0].id);
    }
    setLoading(false);
  }

  useEffect(()=>{load()},[]);

  const priorities=useMemo(()=>((engine?.skills||[]) as any[]).filter(s=>Number(s.verified_gap)>0).slice(0,3),[engine]);
  const completedMissions=useMemo(()=>((engine?.missions||[]) as any[]).filter(m=>m.status==="completed").length,[engine]);
  const totalMissionMinutes=useMemo(()=>((engine?.missions||[]) as any[]).filter(m=>m.status!=="completed").reduce((a,m)=>a+Number(m.duration_minutes||0),0),[engine]);

  async function saveGoal(e:FormEvent){
    e.preventDefault();if(!selectedPath||!userId)return;
    setBusy(true);setNotice("");
    const {error}=await supabase.from("user_career_goals").upsert({
      user_id:userId,career_path_id:selectedPath,weekly_hours:weeklyHours,target_months:targetMonths,
      updated_at:new Date().toISOString()
    },{onConflict:"user_id"});
    setBusy(false);
    if(error){setNotice(error.message);return}
    setEditingGoal(false);
    setNotice(t({fr:"Objectif mis à jour. Vydys recalcule votre trajectoire.",ar:"تم تحديث الهدف. تعيد Vydys حساب مسارك.",en:"Goal updated. Vydys is recalculating your path."}));
    await load();
  }

  async function updateDiagnostic(skillId:string,selfLevel:string){
    if(!userId)return;
    setBusy(true);setNotice("");
    const {error}=await supabase.from("user_skill_diagnostics").upsert({
      user_id:userId,skill_id:skillId,self_level:selfLevel,assessed_at:new Date().toISOString()
    },{onConflict:"user_id,skill_id"});
    setBusy(false);
    if(error){setNotice(error.message);return}
    await load();
  }

  async function completeMission(id:string){
    setBusy(true);setNotice("");
    const {data,error}=await supabase.rpc("complete_skill_mission",{p_mission_id:id});
    setBusy(false);
    if(error){setNotice(error.message);return}
    setNotice(t({fr:`Mission terminée · +XP · Série ${data?.streak_days||1} jour(s)`,ar:`تمت المهمة · +XP · سلسلة ${data?.streak_days||1} يوم`,en:`Mission complete · +XP · ${data?.streak_days||1}-day streak`}));
    await load();
  }

  if(loading||allowed===null)return <section className="skill-engine-page"><div className="container"><div className="skill-engine-loading">Vydys Skill Engine...</div></div></section>;
  if(!allowed)return <section className="dashboard-shell"><div className="container"><article className="panel"><h1>{t({fr:"Skill Engine est réservé aux étudiants.",ar:"محرك المهارات مخصص للطلاب.",en:"Skill Engine is for students."})}</h1></article></div></section>;

  const paths=engine?.career_paths||[];
  const goal=engine?.goal;
  const verified=Math.round(Number(engine?.verified_readiness||0));
  const estimated=Math.round(Number(engine?.estimated_readiness||0));
  const stats=engine?.stats||{};

  if(!goal||editingGoal){
    return <section className="skill-engine-page"><div className="container">
      <div className="skill-engine-onboarding-hero">
        <div><span className="eyebrow">Vydys Skill Engine</span><h1>{goal?t({fr:"Changez votre objectif.",ar:"غيّر هدفك المهني.",en:"Change your goal."}):t({fr:"Où voulez-vous aller ?",ar:"إلى أين تريد الوصول؟",en:"Where do you want to go?"})}</h1><p>{t({fr:"Choisissez un objectif métier. Vydys compare vos preuves réelles aux compétences attendues et construit votre trajectoire.",ar:"اختر هدفاً مهنياً. تقارن Vydys أدلتك الحقيقية بالمهارات المطلوبة وتبني مسارك.",en:"Choose a career goal. Vydys compares your real evidence with the required skills and builds your path."})}</p></div>
        {goal&&<button className="btn btn-ghost" onClick={()=>setEditingGoal(false)}>{t({fr:"Annuler",ar:"إلغاء",en:"Cancel"})}</button>}
      </div>
      {notice&&<p className="manual-note">{notice}</p>}
      <form onSubmit={saveGoal}>
        <div className="career-path-grid">
          {paths.map((p:any)=><button type="button" className={selectedPath===p.id?"career-path-card selected":"career-path-card"} onClick={()=>setSelectedPath(p.id)} key={p.id}>
            <span className="career-path-icon">{p.icon}</span><div><strong>{textOf(p,"name")}</strong><p>{textOf(p,"description")}</p></div><i>{selectedPath===p.id?"✓":"→"}</i>
          </button>)}
        </div>
        <article className="panel skill-goal-config">
          <div><span>{t({fr:"Temps par semaine",ar:"الوقت أسبوعياً",en:"Time per week"})}</span><strong>{weeklyHours} h</strong><input type="range" min="1" max="20" value={weeklyHours} onChange={e=>setWeeklyHours(Number(e.target.value))}/></div>
          <div><span>{t({fr:"Horizon cible",ar:"المدة المستهدفة",en:"Target horizon"})}</span><strong>{targetMonths} {t({fr:"mois",ar:"أشهر",en:"months"})}</strong><input type="range" min="1" max="18" value={targetMonths} onChange={e=>setTargetMonths(Number(e.target.value))}/></div>
          <button className="btn skill-engine-start" disabled={busy||!selectedPath}>{busy?"...":t({fr:"Construire mon parcours",ar:"ابنِ مساري",en:"Build my path"})} →</button>
        </article>
      </form>
    </div></section>
  }

  return <section className="skill-engine-page"><div className="container">
    <div className="skill-engine-hero">
      <div className="skill-engine-goal">
        <span className="eyebrow">Vydys Skill Engine · Career OS</span>
        <div className="skill-goal-title"><span>{goal.icon}</span><div><small>{t({fr:"Objectif actuel",ar:"الهدف الحالي",en:"Current goal"})}</small><h1>{textOf(goal,"name")}</h1></div></div>
        <p>{textOf(goal,"description")}</p>
        <div className="skill-goal-meta"><span>◷ {goal.weekly_hours}h/{t({fr:"semaine",ar:"أسبوع",en:"week"})}</span><span>◎ {goal.target_months} {t({fr:"mois",ar:"أشهر",en:"months"})}</span><button onClick={()=>setEditingGoal(true)}>{t({fr:"Changer l’objectif",ar:"تغيير الهدف",en:"Change goal"})}</button></div>
      </div>
      <div className="readiness-zone">
        <div className="readiness-ring" style={{"--score":verified} as any}><div><strong>{verified}%</strong><span>{t({fr:"Verified",ar:"موثّق",en:"Verified"})}</span></div></div>
        <div className="readiness-copy"><span>{t({fr:"Career Readiness",ar:"الجاهزية المهنية",en:"Career Readiness"})}</span><strong>{estimated}% {t({fr:"estimé",ar:"تقديري",en:"estimated"})}</strong><small>{t({fr:"Le score Verified utilise uniquement les compétences prouvées dans Vydys.",ar:"تستخدم درجة Verified فقط المهارات المثبتة داخل Vydys.",en:"Verified score only uses skills proven inside Vydys."})}</small></div>
      </div>
    </div>

    {notice&&<p className="manual-note skill-engine-notice">{notice}</p>}

    <div className="skill-engine-stat-grid">
      <article><span>◆</span><div><small>{t({fr:"Compétences vérifiées",ar:"مهارات موثقة",en:"Verified skills"})}</small><strong>{stats.verified_skills||0}</strong></div></article>
      <article><span>⌘</span><div><small>{t({fr:"Projets validés",ar:"مشاريع معتمدة",en:"Approved projects"})}</small><strong>{stats.approved_projects||0}</strong></div></article>
      <article><span>✓</span><div><small>{t({fr:"Certificats",ar:"الشهادات",en:"Certificates"})}</small><strong>{stats.certificates||0}</strong></div></article>
      <article><span>XP</span><div><small>Vydys XP</small><strong>{stats.xp||0}</strong></div></article>
      <article><span>🔥</span><div><small>{t({fr:"Série",ar:"السلسلة",en:"Streak"})}</small><strong>{stats.streak_days||0}j</strong></div></article>
    </div>

    <div className="skill-engine-layout">
      <main>
        <section className="skill-engine-section">
          <div className="skill-section-head"><div><span className="eyebrow">{t({fr:"Aujourd’hui",ar:"اليوم",en:"Today"})}</span><h2>{t({fr:"Vos missions",ar:"مهامك",en:"Your missions"})}</h2></div><div className="mission-summary"><strong>{totalMissionMinutes} min</strong><span>{completedMissions}/{(engine?.missions||[]).length} {t({fr:"terminée(s)",ar:"مكتملة",en:"done"})}</span></div></div>
          <div className="mission-stack">
            {(engine?.missions||[]).length===0?<article className="panel"><p>{t({fr:"Aucune mission aujourd’hui.",ar:"لا توجد مهام اليوم.",en:"No missions today."})}</p></article>:(engine?.missions||[]).map((m:any,index:number)=><article className={m.status==="completed"?"mission-card completed":"mission-card"} key={m.id}>
              <div className="mission-index">{m.status==="completed"?"✓":String(index+1).padStart(2,"0")}</div>
              <div className="mission-main"><div className="mission-tags"><span>{m.mission_type}</span><span>{textOf(m,"skill")}</span></div><h3>{textOf(m,"title")}</h3><p>{textOf(m,"description")}</p><div className="mission-meta"><span>◷ {m.duration_minutes} min</span><span>+{m.xp} XP</span></div></div>
              <div className="mission-actions"><Link className="btn btn-small" href={m.target_url}>{m.status==="completed"?t({fr:"Revoir",ar:"مراجعة",en:"Review"}):t({fr:"Commencer",ar:"ابدأ",en:"Start"})}</Link>{m.status!=="completed"&&<button disabled={busy} onClick={()=>completeMission(m.id)}>{t({fr:"Marquer terminé",ar:"تم الإنجاز",en:"Mark done"})}</button>}</div>
            </article>)}
          </div>
        </section>

        <section className="skill-engine-section">
          <div className="skill-section-head"><div><span className="eyebrow">Skill Graph</span><h2>{t({fr:"Écart vers votre objectif",ar:"الفجوة نحو هدفك",en:"Gap to your goal"})}</h2></div><Link className="text-link" href="/competences">{t({fr:"Skills Passport",ar:"جواز المهارات",en:"Skills Passport"})} ↗</Link></div>
          <div className="skill-gap-list">
            {(engine?.skills||[]).map((s:any)=>{
              const verifiedPct=s.target_value?Math.min(100,Math.round(Number(s.verified_value)/Number(s.target_value)*100)):0;
              const estimatedPct=s.target_value?Math.min(100,Math.round(Number(s.estimated_value)/Number(s.target_value)*100)):0;
              return <article className="skill-gap-row" key={s.id}>
                <div className="skill-gap-name"><div><strong>{textOf(s,"name")}</strong><small>{s.category}</small></div><span className={s.verified_gap===0?"skill-ready":"skill-gap"}>{s.verified_gap===0?"✓ "+t({fr:"Cible atteinte",ar:"تم بلوغ الهدف",en:"Target reached"}):t({fr:"Cible",ar:"الهدف",en:"Target"})+": "+levelLabel(s.target_level)}</span></div>
                <div className="skill-bars">
                  <div><label><span>{t({fr:"Vérifié",ar:"موثّق",en:"Verified"})}</span><b>{levelLabel(s.verified_level)}</b></label><div className="skill-track"><i style={{width:verifiedPct+"%"}}/></div></div>
                  <div className="estimated"><label><span>{t({fr:"Estimé",ar:"تقديري",en:"Estimated"})}</span><b>{levelLabel(s.self_level==="none"?s.verified_level:s.self_level)}</b></label><div className="skill-track"><i style={{width:estimatedPct+"%"}}/></div></div>
                </div>
              </article>
            })}
          </div>
        </section>
      </main>

      <aside>
        <section className="panel skill-priority-card">
          <span className="eyebrow">{t({fr:"Priorités",ar:"الأولويات",en:"Priorities"})}</span><h2>{t({fr:"Vos 3 prochains leviers",ar:"أهم 3 أولويات",en:"Your next 3 levers"})}</h2>
          <div>{priorities.map((s:any,i:number)=><article key={s.id}><span>{i+1}</span><div><strong>{textOf(s,"name")}</strong><small>{t({fr:"Écart vérifié",ar:"الفجوة الموثقة",en:"Verified gap"})} · {s.verified_gap} pts</small></div></article>)}</div>
        </section>

        <section className="panel skill-diagnostic-card">
          <span className="eyebrow">{t({fr:"Diagnostic rapide",ar:"تشخيص سريع",en:"Quick diagnostic"})}</span><h2>{t({fr:"Où vous situez-vous ?",ar:"ما هو مستواك؟",en:"Where are you now?"})}</h2><p>{t({fr:"Votre auto-évaluation améliore le score Estimated, mais ne transforme jamais une compétence en compétence vérifiée.",ar:"يحسّن تقييمك الذاتي الدرجة التقديرية لكنه لا يحوّل المهارة إلى مهارة موثقة.",en:"Self-assessment improves Estimated readiness but never turns a skill into a verified skill."})}</p>
          <div className="diagnostic-list">
            {(engine?.skills||[]).map((s:any)=><label key={s.id}><span>{textOf(s,"name")}</span><select disabled={busy} value={s.self_level||"none"} onChange={e=>updateDiagnostic(s.id,e.target.value)}>{levelOrder.map(l=><option value={l} key={l}>{levelLabel(l)}</option>)}</select></label>)}
          </div>
        </section>

        <section className="panel skill-proof-card">
          <span>✓</span><div><strong>{t({fr:"Preuve > promesse",ar:"الدليل أهم من الادعاء",en:"Evidence > claims"})}</strong><p>{t({fr:"Les missions donnent de l’XP. Seuls projets, évaluations et certificats peuvent faire progresser votre score Verified.",ar:"تعطي المهام XP. فقط المشاريع والتقييمات والشهادات ترفع درجة Verified.",en:"Missions give XP. Only projects, assessments and certificates can increase Verified readiness."})}</p></div>
        </section>
      </aside>
    </div>
  </div></section>
}
