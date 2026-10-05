"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function ClassroomDetailPage(){
  const {slug}=useParams<{slug:string}>();
  const {lang,t}=useLanguage();
  const [room,setRoom]=useState<any>(null);
  const [sessions,setSessions]=useState<any[]>([]);
  const [instructor,setInstructor]=useState<any>(null);
  const [methods,setMethods]=useState<any[]>([]);
  const [prices,setPrices]=useState<any[]>([]);
  const [stats,setStats]=useState<any>(null);
  const [enrolled,setEnrolled]=useState(false);
  const [resources,setResources]=useState<any[]>([]);
  const [assignments,setAssignments]=useState<any[]>([]);
  const [selectedMethod,setSelectedMethod]=useState("");
  const [checkoutCurrency,setCheckoutCurrency]=useState("");
  const [proof,setProof]=useState<File|null>(null);
  const [reference,setReference]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function load(){
    const {data:r}=await supabase.from("classrooms").select("*").eq("slug",slug).maybeSingle();
    if(!r){setRoom(false);return}
    setRoom(r);

    const [{data:s},{data:i},{data:m},{data:p},{data:st},{data:{user}}]=await Promise.all([
      supabase.from("classroom_sessions").select("*").eq("classroom_id",r.id).order("position"),
      supabase.from("instructor_profiles").select("*").eq("user_id",r.instructor_id).maybeSingle(),
      supabase.from("instructor_payment_methods").select("*").eq("instructor_id",r.instructor_id).eq("is_active",true),
      supabase.from("classroom_prices").select("currency,amount").eq("classroom_id",r.id).eq("is_active",true).order("currency"),
      supabase.rpc("get_public_classroom_stats",{p_classroom_id:r.id}),
      supabase.auth.getUser()
    ]);
    setSessions(s||[]);setInstructor(i||null);setMethods(m||[]);setPrices(p||[]);setStats(st||null);
    if(m?.[0])setSelectedMethod(m[0].id);
    const available=(p||[]).map((x:any)=>String(x.currency).toUpperCase());
    setCheckoutCurrency(available.includes(String(r.base_currency).toUpperCase())?String(r.base_currency).toUpperCase():(available[0]||String(r.base_currency).toUpperCase()));

    if(user){
      const {data:e}=await supabase.from("classroom_enrollments").select("id").eq("classroom_id",r.id).eq("user_id",user.id).eq("status","active").maybeSingle();
      const yes=Boolean(e);setEnrolled(yes);
      if(yes){
        const [{data:res},{data:ass}]=await Promise.all([
          supabase.from("classroom_resources").select("*").eq("classroom_id",r.id).order("created_at",{ascending:false}),
          supabase.from("classroom_assignments").select("*").eq("classroom_id",r.id).order("created_at",{ascending:false})
        ]);
        setResources(res||[]);setAssignments(ass||[]);
      }
    }
  }

  useEffect(()=>{load()},[slug]);

  const method=methods.find(m=>m.id===selectedMethod);
  const priceMap=useMemo(()=>Object.fromEntries(prices.map(p=>[String(p.currency).toUpperCase(),Number(p.amount)])),[prices]);
  const selectedCurrency=method?.payment_mode==="manual"?String(method.currency||"MRU").toUpperCase():(checkoutCurrency||String(room?.base_currency||"MRU").toUpperCase());
  const rawPrice=priceMap[selectedCurrency] ?? (String(room?.base_currency||"").toUpperCase()===selectedCurrency?Number(room?.base_price_amount||0):null);
  const payable=rawPrice==null?null:Math.round(rawPrice*(1-Number(method?.discount_percent||0)/100)*100)/100;
  const formatMoney=(amount:number,currency:string)=>new Intl.NumberFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{style:"currency",currency,maximumFractionDigits:2}).format(amount);
  const formatDate=(iso:string)=>new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:room?.timezone||"UTC"}).format(new Date(iso));

  async function enrollFree(){
    setMessage("");setBusy(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    if(stats?.is_full){setBusy(false);setMessage(t({fr:"Cette Classroom est complète.",ar:"هذا الفصل ممتلئ.",en:"This Classroom is full."}));return}
    const {error}=await supabase.rpc("enroll_free_classroom",{p_classroom_id:room.id});
    setBusy(false);
    if(error){setMessage(error.message);return}
    setEnrolled(true);await load();
  }

  async function enroll(e:FormEvent){
    e.preventDefault();setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    if(stats?.is_full){setMessage(t({fr:"Cette Classroom est complète.",ar:"هذا الفصل ممتلئ.",en:"This Classroom is full."}));return}
    if(!method){setMessage(t({fr:"Choisissez un moyen de paiement.",ar:"اختر وسيلة دفع.",en:"Choose a payment method."}));return}
    if(payable==null){setMessage(t({fr:"Aucun prix n’est configuré dans cette devise.",ar:"لا يوجد سعر بهذه العملة.",en:"No price is configured in this currency."}));return}

    if(method.payment_mode==="automatic"){
      setBusy(true);
      const {data,error}=await supabase.functions.invoke("vydys-payments",{body:{action:"create_checkout",classroom_id:room.id,payment_method_id:method.id,currency:selectedCurrency}});
      setBusy(false);
      if(error||data?.error){setMessage(data?.detail||data?.error||error?.message||"Checkout error");return}
      if(data?.url)window.location.href=data.url;
      return;
    }

    if(!proof){setMessage(t({fr:"Ajoutez la preuve de paiement.",ar:"أضف إثبات الدفع.",en:"Add payment proof."}));return}
    setBusy(true);
    const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${user.id}/classrooms/${room.id}/${crypto.randomUUID()}-${safe}`;
    const {error:uploadError}=await supabase.storage.from("payment-proofs").upload(path,proof,{contentType:proof.type});
    if(uploadError){setBusy(false);setMessage(uploadError.message);return}
    const {error}=await supabase.rpc("create_manual_classroom_order",{p_classroom_id:room.id,p_payment_method_id:method.id,p_transaction_reference:reference,p_proof_path:path});
    setBusy(false);
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Votre preuve a été envoyée au formateur. L’inscription sera activée après validation.",ar:"تم إرسال إثباتك للمدرب وسيتم تفعيل التسجيل بعد الاعتماد.",en:"Your proof was sent to the instructor. Enrollment activates after approval."}));
    setProof(null);setReference("");
  }

  if(room===null)return <section className="section page-top"><div className="container">...</div></section>;
  if(room===false)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Classroom introuvable",ar:"الفصل غير موجود",en:"Classroom not found"})}</h1></article></div></section>;

  const title=lang==="ar"?room.title_ar:lang==="en"?room.title_en:room.title_fr;
  const desc=lang==="ar"?room.description_ar:lang==="en"?room.description_en:room.description_fr;
  const next=sessions.find(s=>new Date(s.ends_at).getTime()>Date.now());
  const canJoin=(s:any)=>Date.now()>=new Date(s.starts_at).getTime()-30*60000&&Date.now()<=new Date(s.ends_at).getTime()+90*60000;

  return <section className="section page-top classroom-detail-page"><div className="container">
    <div className="classroom-detail-layout">
      <main>
        <div className="classroom-detail-hero"><div className="classroom-live-badge"><span></span> VYDYS CLASSROOM</div><h1>{title}</h1><p>{desc}</p><div className="classroom-detail-meta"><span>{room.session_count} {t({fr:"sessions live",ar:"حصص مباشرة",en:"live sessions"})}</span><span>{room.session_duration_minutes} min</span><span>{room.language.toUpperCase()}</span><span>{room.level}</span><span>{room.timezone}</span></div>
          {instructor&&<Link className="instructor-box" href={"/formateur/"+instructor.public_slug}><div className="avatar">{instructor.display_name?.slice(0,2).toUpperCase()}</div><div><small>{t({fr:"Formateur",ar:"المدرب",en:"Instructor"})}</small><strong>{instructor.display_name}</strong><span>{instructor.headline}</span></div></Link>}
        </div>

        <section className="classroom-schedule-public"><div className="section-head"><div><span className="eyebrow">{t({fr:"Programme live",ar:"البرنامج المباشر",en:"Live schedule"})}</span><h2>{t({fr:"Calendrier des séances",ar:"جدول الحصص",en:"Session calendar"})}</h2></div></div><div className="public-session-list">{sessions.map(s=><article key={s.id} className={next?.id===s.id?"next":""}><span>{String(s.position).padStart(2,"0")}</span><div><strong>{s.title||"Session "+s.position}</strong><small>{formatDate(s.starts_at)} · {room.session_duration_minutes} min</small></div>{enrolled&&<Link className={canJoin(s)?"btn btn-small":"btn btn-small btn-ghost"} href={"/classroom/"+room.slug+"/session/"+s.id}>{canJoin(s)?t({fr:"Rejoindre",ar:"دخول",en:"Join"}):t({fr:"Espace session",ar:"مساحة الحصة",en:"Session space"})}</Link>}</article>)}</div></section>

        {(room.program||room.prerequisites)&&<section className="classroom-info-grid">{room.program&&<article className="panel"><h2>{t({fr:"Programme",ar:"البرنامج",en:"Program"})}</h2><p className="preline">{room.program}</p></article>}{room.prerequisites&&<article className="panel"><h2>{t({fr:"Prérequis",ar:"المتطلبات",en:"Prerequisites"})}</h2><p className="preline">{room.prerequisites}</p></article>}</section>}

        {enrolled&&<section className="classroom-enrolled-content"><div className="section-head"><div><span className="eyebrow">{t({fr:"Votre espace",ar:"مساحتك",en:"Your space"})}</span><h2>{t({fr:"Ressources & devoirs",ar:"الموارد والواجبات",en:"Resources & assignments"})}</h2></div></div><div className="classroom-content-grid"><article className="panel"><h3>{t({fr:"Ressources",ar:"الموارد",en:"Resources"})}</h3><div className="classroom-resource-list">{resources.map(r=><a key={r.id} href={r.url||"#"} target="_blank" rel="noreferrer"><span>↗</span><strong>{r.title}</strong></a>)}{resources.length===0&&<p>{t({fr:"Aucune ressource pour le moment.",ar:"لا توجد موارد حالياً.",en:"No resources yet."})}</p>}</div></article><article className="panel"><h3>{t({fr:"Devoirs",ar:"الواجبات",en:"Assignments"})}</h3><div className="classroom-assignment-list">{assignments.map(a=><div key={a.id}><strong>{a.title}</strong><small>{a.due_at?formatDate(a.due_at):t({fr:"Sans échéance",ar:"بدون موعد",en:"No due date"})}</small></div>)}{assignments.length===0&&<p>{t({fr:"Aucun devoir.",ar:"لا توجد واجبات.",en:"No assignments yet."})}</p>}</div></article></div></section>}
      </main>

      <aside className="panel classroom-enroll-card">
        {enrolled?<><div className="enrolled-check">✓</div><h2>{t({fr:"Vous êtes inscrit",ar:"أنت مسجل",en:"You are enrolled"})}</h2>{next&&<><p>{t({fr:"Prochaine séance",ar:"الحصة القادمة",en:"Next session"})}</p><strong className="next-session-time">{formatDate(next.starts_at)}</strong><Link className="btn full" href={"/classroom/"+room.slug+"/session/"+next.id}>{canJoin(next)?t({fr:"Rejoindre maintenant",ar:"انضم الآن",en:"Join now"}):t({fr:"Ouvrir l’espace session",ar:"فتح مساحة الحصة",en:"Open session space"})}</Link></>}<Link className="btn btn-ghost full" href="/classroom">{t({fr:"Mes Classrooms",ar:"فصولي",en:"My Classrooms"})}</Link></>:<>
          <div className="classroom-price-head"><small>{t({fr:"Prix de la cohorte",ar:"سعر الدفعة",en:"Cohort price"})}</small><h2>{Number(room.base_price_amount)===0?t({fr:"GRATUIT",ar:"مجاني",en:"FREE"}):formatMoney(Number(room.base_price_amount),room.base_currency)}</h2></div>
          <div className="classroom-seats"><div><span>{t({fr:"Places disponibles",ar:"المقاعد المتاحة",en:"Available seats"})}</span><strong>{stats?.spots_left??room.capacity}/{room.capacity}</strong></div><div className="seat-bar"><span style={{width:`${Math.min(100,Math.max(0,((room.capacity-(stats?.spots_left??room.capacity))/room.capacity)*100))}%`}}></span></div></div>
          {stats?.is_full?<div className="classroom-full-state">{t({fr:"COMPLET",ar:"مكتمل",en:"FULL"})}</div>:Number(room.base_price_amount)===0?<button className="btn full" onClick={enrollFree} disabled={busy}>{busy?"...":t({fr:"S’inscrire gratuitement",ar:"التسجيل مجاناً",en:"Enroll for free"})}</button>:methods.length===0?<p className="manual-note">{t({fr:"Le formateur n’a pas encore configuré de moyen de paiement.",ar:"لم يضف المدرب وسيلة دفع بعد.",en:"The instructor has not configured a payment method yet."})}</p>:<form onSubmit={enroll}>
            <div className="checkout-methods">{methods.map(m=>{
              const cur=m.payment_mode==="automatic"?(checkoutCurrency||room.base_currency):String(m.currency||"MRU").toUpperCase();
              const p=priceMap[cur] ?? (String(room.base_currency).toUpperCase()===cur?Number(room.base_price_amount):null);
              return <button type="button" key={m.id} disabled={p==null} onClick={()=>setSelectedMethod(m.id)} className={selectedMethod===m.id?"checkout-method selected":"checkout-method"}><div><strong>{String(m.label||m.method).toUpperCase()}</strong><span>{m.payment_mode==="automatic"?t({fr:"Automatique",ar:"تلقائي",en:"Automatic"}):t({fr:"Validation manuelle",ar:"يدوي",en:"Manual approval"})}</span></div><b>{p!=null?formatMoney(Number(p)*(1-Number(m.discount_percent||0)/100),cur):"—"}</b></button>
            })}</div>
            {method?.payment_mode==="automatic"&&prices.length>1&&<label className="form-field"><span>{t({fr:"Devise du checkout",ar:"عملة الدفع",en:"Checkout currency"})}</span><select value={checkoutCurrency} onChange={e=>setCheckoutCurrency(e.target.value)}>{prices.map(p=><option key={p.currency} value={p.currency}>{p.currency} · {formatMoney(Number(p.amount),p.currency)}</option>)}</select></label>}
            {method&&payable!=null&&<><div className="amount-box"><span>{t({fr:"Montant exact",ar:"المبلغ المحدد",en:"Exact amount"})}</span><strong>{formatMoney(payable,selectedCurrency)}</strong></div>{method.payment_mode==="manual"?<>{method.instructions&&<p className="payment-instructor-instructions">{method.instructions}</p>}<label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Preuve de paiement",ar:"إثبات الدفع",en:"Payment proof"})}</strong></label><label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label><button className="btn full" disabled={busy}>{busy?"...":t({fr:"Envoyer au formateur",ar:"إرسال للمدرب",en:"Submit to instructor"})}</button></>:<button className="btn full international-pay-btn" disabled={busy}>{busy?"...":t({fr:"Payer & s’inscrire",ar:"الدفع والتسجيل",en:"Pay & enroll"})+" · "+String(method.provider_code).toUpperCase()}</button>}</>}
          </form>}
          <p className="classroom-payment-note">{t({fr:"L’argent de l’inscription va directement au formateur. Vydys ne prend aucune commission sur cette vente.",ar:"تذهب رسوم التسجيل مباشرة للمدرب ولا تأخذ Vydys عمولة من هذه العملية.",en:"Enrollment money goes directly to the instructor. Vydys takes no commission on this sale."})}</p>
        </>}
        {message&&<p className="manual-note">{message}</p>}
      </aside>
    </div>
  </div></section>
}
