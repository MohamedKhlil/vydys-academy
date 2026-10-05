"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../components/language-provider";
import { supabase } from "../../lib/supabase";

const interestOptions=[
  ["ai","AI & Automation"],
  ["software","Software Development"],
  ["data","Data"],
  ["cloud","Cloud & DevOps"],
  ["cybersecurity","Cybersecurity"],
  ["product","Product & Digital"]
] as const;

export default function OnboardingPage(){
  const {t}=useLanguage();
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [step,setStep]=useState(0);
  const [notice,setNotice]=useState("");
  const [userId,setUserId]=useState("");
  const [form,setForm]=useState({
    learning_goal:"",
    experience_level:"",
    target_role:"",
    learning_interests:[] as string[]
  });

  useEffect(()=>{(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    setUserId(user.id);

    const {data}=await supabase
      .from("profiles")
      .select("role,learning_goal,experience_level,target_role,learning_interests,onboarding_completed_at")
      .eq("id",user.id)
      .maybeSingle();

    if(data?.role==="admin"||data?.role==="direction"){window.location.href="/admin";return}
    if(data?.role==="instructor"){window.location.href="/formateur";return}

    setForm({
      learning_goal:data?.learning_goal||"",
      experience_level:data?.experience_level||"",
      target_role:data?.target_role||"",
      learning_interests:Array.isArray(data?.learning_interests)?data.learning_interests:[]
    });
    setLoading(false);
  })()},[]);

  const canContinue=useMemo(()=>{
    if(step===0)return Boolean(form.learning_goal);
    if(step===1)return Boolean(form.experience_level);
    return form.learning_interests.length>0;
  },[step,form]);

  function toggleInterest(value:string){
    setForm(v=>({
      ...v,
      learning_interests:v.learning_interests.includes(value)
        ?v.learning_interests.filter(x=>x!==value)
        :[...v.learning_interests,value].slice(0,6)
    }));
  }

  async function finish(){
    if(!userId||!form.learning_goal||!form.experience_level||form.learning_interests.length===0)return;
    setSaving(true);setNotice("");

    const {error}=await supabase
      .from("profiles")
      .update({
        learning_goal:form.learning_goal,
        experience_level:form.experience_level,
        target_role:form.target_role.trim().slice(0,120)||null,
        learning_interests:form.learning_interests,
        onboarding_completed_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      })
      .eq("id",userId);

    setSaving(false);
    if(error){
      setNotice(t({
        fr:"Impossible d'enregistrer votre parcours. Réessayez.",
        ar:"تعذر حفظ مسارك. حاول مرة أخرى.",
        en:"We could not save your onboarding. Please try again."
      }));
      return;
    }
    window.location.href="/dashboard";
  }

  if(loading)return <section className="dashboard-shell"><div className="container">...</div></section>;

  return <section className="dashboard-shell"><div className="container" style={{maxWidth:860}}>
    <div className="page-hero">
      <span className="eyebrow">{t({fr:"Bienvenue sur Vydys",ar:"مرحباً بك في Vydys",en:"Welcome to Vydys"})}</span>
      <h1>{t({
        fr:"Personnalisez votre parcours en 3 étapes.",
        ar:"خصص مسارك في 3 خطوات.",
        en:"Personalize your path in 3 steps."
      })}</h1>
      <p>{t({
        fr:"Ces réponses servent uniquement à prioriser les contenus et actions utiles dans votre espace étudiant.",
        ar:"تُستخدم هذه الإجابات فقط لترتيب المحتوى والإجراءات المناسبة لك.",
        en:"These answers only help prioritize useful content and actions in your student workspace."
      })}</p>
    </div>

    <div className="panel" style={{marginBottom:18}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {[0,1,2].map(i=><span key={i} aria-hidden="true" style={{
          height:6,flex:1,borderRadius:999,
          background:i<=step?"currentColor":"rgba(127,127,127,.25)"
        }}/>)}
      </div>
    </div>

    <article className="panel">
      {step===0&&<>
        <span className="eyebrow">1 / 3</span>
        <h2>{t({fr:"Quel est votre objectif principal ?",ar:"ما هو هدفك الرئيسي؟",en:"What is your main goal?"})}</h2>
        <div className="vydys-tools-grid">
          {[
            ["career",t({fr:"Progresser dans ma carrière",ar:"التقدم في مسيرتي المهنية",en:"Grow my career"})],
            ["job",t({fr:"Trouver un emploi",ar:"العثور على وظيفة",en:"Get a job"})],
            ["projects",t({fr:"Construire des projets",ar:"بناء مشاريع",en:"Build projects"})],
            ["skills",t({fr:"Développer mes compétences",ar:"تطوير مهاراتي",en:"Build skills"})]
          ].map(([value,label])=><button
            key={value}
            type="button"
            className={form.learning_goal===value?"panel vydys-tool-card":"panel vydys-tool-card"}
            onClick={()=>setForm(v=>({...v,learning_goal:value}))}
            aria-pressed={form.learning_goal===value}
            style={form.learning_goal===value?{outline:"2px solid currentColor"}:undefined}
          ><strong>{label}</strong></button>)}
        </div>
        <label style={{display:"block",marginTop:18}}>
          <span>{t({fr:"Métier ou rôle visé (optionnel)",ar:"الدور أو الوظيفة المستهدفة (اختياري)",en:"Target role (optional)"})}</span>
          <input
            value={form.target_role}
            maxLength={120}
            onChange={e=>setForm(v=>({...v,target_role:e.target.value}))}
            placeholder={t({fr:"Ex. Data Analyst",ar:"مثال: محلل بيانات",en:"e.g. Data Analyst"})}
          />
        </label>
      </>}

      {step===1&&<>
        <span className="eyebrow">2 / 3</span>
        <h2>{t({fr:"Quel est votre niveau actuel ?",ar:"ما هو مستواك الحالي؟",en:"What is your current level?"})}</h2>
        <div className="vydys-tools-grid">
          {[
            ["beginner",t({fr:"Débutant",ar:"مبتدئ",en:"Beginner"})],
            ["intermediate",t({fr:"Intermédiaire",ar:"متوسط",en:"Intermediate"})],
            ["advanced",t({fr:"Avancé",ar:"متقدم",en:"Advanced"})]
          ].map(([value,label])=><button
            key={value}
            type="button"
            className="panel vydys-tool-card"
            onClick={()=>setForm(v=>({...v,experience_level:value}))}
            aria-pressed={form.experience_level===value}
            style={form.experience_level===value?{outline:"2px solid currentColor"}:undefined}
          ><strong>{label}</strong></button>)}
        </div>
      </>}

      {step===2&&<>
        <span className="eyebrow">3 / 3</span>
        <h2>{t({fr:"Que voulez-vous apprendre ?",ar:"ماذا تريد أن تتعلم؟",en:"What do you want to learn?"})}</h2>
        <p>{t({fr:"Choisissez une ou plusieurs thématiques.",ar:"اختر مجالاً واحداً أو أكثر.",en:"Choose one or more topics."})}</p>
        <div className="vydys-tools-grid">
          {interestOptions.map(([value,label])=><button
            key={value}
            type="button"
            className="panel vydys-tool-card"
            onClick={()=>toggleInterest(value)}
            aria-pressed={form.learning_interests.includes(value)}
            style={form.learning_interests.includes(value)?{outline:"2px solid currentColor"}:undefined}
          ><strong>{label}</strong></button>)}
        </div>
      </>}

      {notice&&<p className="manual-note">{notice}</p>}

      <div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:24,flexWrap:"wrap"}}>
        <div>
          {step>0&&<button className="btn btn-ghost" type="button" onClick={()=>setStep(v=>v-1)}>
            {t({fr:"Retour",ar:"رجوع",en:"Back"})}
          </button>}
        </div>
        <div style={{display:"flex",gap:10}}>
          <Link className="btn btn-ghost" href="/dashboard">
            {t({fr:"Plus tard",ar:"لاحقاً",en:"Later"})}
          </Link>
          {step<2
            ?<button className="btn" type="button" disabled={!canContinue} onClick={()=>setStep(v=>v+1)}>
              {t({fr:"Continuer",ar:"متابعة",en:"Continue"})}
            </button>
            :<button className="btn" type="button" disabled={!canContinue||saving} onClick={finish}>
              {saving?"...":t({fr:"Terminer",ar:"إنهاء",en:"Finish"})}
            </button>}
        </div>
      </div>
    </article>
  </div></section>
}
