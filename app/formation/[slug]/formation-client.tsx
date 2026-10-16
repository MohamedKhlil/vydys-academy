"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";
import WhatsAppBubble from "../../../components/whatsapp-bubble";
import CourseShare from "../../../components/course-share";
import ClassroomCalendarActions from "../../../components/classroom-calendar-actions";

// Mauritania uses UTC throughout the year: enrollment stays open until 23:59 on the deadline day.
const isRegistrationClosed=(deadline?:string|null)=>Boolean(deadline && new Date().toISOString().slice(0,10)>deadline);
const displayDeadline=(deadline:string,lang:string)=>new Intl.DateTimeFormat(lang==="ar"?"ar-MR":lang==="en"?"en-GB":"fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(deadline+"T12:00:00Z"));

export default function FormationDetailClient({ initialCourse }: { initialCourse: any }){
  const params=useParams<{slug:string}>();
  const {lang,t}=useLanguage();
  const [course,setCourse]=useState<any>(initialCourse);
  const [instructor,setInstructor]=useState<any>(null);
  const [methods,setMethods]=useState<any[]>([]);
  const [prices,setPrices]=useState<any[]>([]);
  const [ratings,setRatings]=useState<any>({average_rating:0,review_count:0});
  const [reviews,setReviews]=useState<any[]>([]);
  const [modules,setModules]=useState<any[]>([]);
  const [linkedClassroom,setLinkedClassroom]=useState<any>(null);
  const [linkedClassroomSessions,setLinkedClassroomSessions]=useState<any[]>([]);
  const [hybridSummary,setHybridSummary]=useState<any>(null);
  const [enrolled,setEnrolled]=useState(false);
  const [rating,setRating]=useState(5);
  const [reviewText,setReviewText]=useState("");
  const [selectedMethod,setSelectedMethod]=useState<string>("");
  const [checkoutCurrency,setCheckoutCurrency]=useState("");
  const [proof,setProof]=useState<File|null>(null);
  const [reference,setReference]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [userId,setUserId]=useState<string|null>(null);
  const [favorite,setFavorite]=useState(false);
  const [couponCode,setCouponCode]=useState("");
  const [coupon,setCoupon]=useState<any>(null);

  async function load(){
    const {data:c}=await supabase.from("courses").select("*").eq("slug",params.slug).eq("status","published").single();
    if(!c){setCourse(false);return}
    setCourse(c);
    const [{data:rs},{data:rv},{data:cp},{data:mods}]=await Promise.all([
      supabase.from("course_rating_summary").select("*").eq("course_id",c.id).single(),
      supabase.from("course_reviews").select("id,rating,review_text,created_at").eq("course_id",c.id).eq("moderation_status","visible").order("created_at",{ascending:false}),
      supabase.from("course_prices").select("currency,amount").eq("course_id",c.id).eq("is_active",true).order("currency"),
      supabase.from("course_modules").select("id,title_fr,title_ar,title_en,position").eq("course_id",c.id).order("position")
    ]);
    if(rs)setRatings(rs);setReviews(rv||[]);setPrices(cp||[]);setModules(mods||[]);
    const [{data:linkedRoom},{data:liveSummary}]=await Promise.all([
      supabase.from("classrooms").select("id,slug,course_id,title_fr,title_ar,title_en,status,visibility,start_date,session_count,session_duration_minutes,timezone").eq("course_id",c.id).maybeSingle(),
      supabase.rpc("get_public_course_live_summary",{p_course_id:c.id})
    ]);
    setLinkedClassroom(linkedRoom||null);
    if(linkedRoom){
      const {data:linkedSessions}=await supabase.from("classroom_sessions").select("id,position,title,starts_at,ends_at,status,updated_at").eq("classroom_id",linkedRoom.id).order("position");
      setLinkedClassroomSessions(linkedSessions||[]);
    }else setLinkedClassroomSessions([]);
    setHybridSummary(liveSummary||null);
    if(c.instructor_id){
      const [{data:i},{data:m}]=await Promise.all([
        supabase.from("instructor_profiles").select("*").eq("user_id",c.instructor_id).single(),
        supabase.from("instructor_payment_methods").select("*").eq("instructor_id",c.instructor_id).eq("is_active",true)
      ]);
      setInstructor(i);setMethods(m||[]);if(m?.[0])setSelectedMethod(m[0].id);
    }
    const {data:{user}}=await supabase.auth.getUser();
    setUserId(user?.id||null);
    if(user){
      const [{data:e},{data:my},{data:fav},{data:p}]=await Promise.all([
        supabase.from("enrollments").select("id").eq("user_id",user.id).eq("course_id",c.id).in("status",["active","completed"]).maybeSingle(),
        supabase.from("course_reviews").select("rating,review_text").eq("course_id",c.id).eq("user_id",user.id).maybeSingle(),
        supabase.from("course_favorites").select("course_id").eq("user_id",user.id).eq("course_id",c.id).maybeSingle(),
        supabase.from("profiles").select("preferred_currency").eq("id",user.id).maybeSingle()
      ]);
      setEnrolled(Boolean(e));setFavorite(Boolean(fav));
      if(my){setRating(my.rating);setReviewText(my.review_text||"")}
      const preferred=String(p?.preferred_currency||"").toUpperCase();
      const available=(cp||[]).map((x:any)=>String(x.currency).toUpperCase());
      setCheckoutCurrency(available.includes(preferred)?preferred:String(c.base_currency||"MRU").toUpperCase());
    }else setCheckoutCurrency(String(c.base_currency||"MRU").toUpperCase());
  }
  useEffect(()=>{load()},[params.slug]);

  const method=methods.find(m=>m.id===selectedMethod);
  const priceMap=useMemo(()=>Object.fromEntries(prices.map(p=>[String(p.currency).toUpperCase(),Number(p.amount)])),[prices]);
  const formatMoney=(amount:number,currency:string)=>new Intl.NumberFormat(lang==="ar"?"ar-MR":lang==="en"?"en-US":"fr-FR",{style:"currency",currency,maximumFractionDigits:2}).format(amount);
  const priceFor=(currency:string)=>priceMap[String(currency).toUpperCase()] ?? (String(course?.base_currency||"").toUpperCase()===String(currency).toUpperCase()?Number(course?.base_price_amount||0):null);
  const selectedCurrency=method?.payment_mode==="manual"?String(method.currency||"MRU").toUpperCase():(checkoutCurrency||String(course?.base_currency||"MRU").toUpperCase());
  const rawPrice=priceFor(selectedCurrency);
  const methodDiscount=Number(method?.discount_percent||0);
  const methodPrice=rawPrice==null?null:Math.round(rawPrice*(1-methodDiscount/100)*100)/100;
  const payable=methodPrice==null?null:(coupon?.valid?Math.max(0,Math.round(methodPrice*(1-Number(coupon.discount_percent||0)/100)*100)/100):methodPrice);

  async function toggleFavorite(){
    if(!userId){window.location.href="/connexion";return}
    if(favorite){await supabase.from("course_favorites").delete().eq("user_id",userId).eq("course_id",course.id);setFavorite(false)}
    else{await supabase.from("course_favorites").insert({user_id:userId,course_id:course.id});setFavorite(true)}
  }

  async function applyCoupon(){
    setMessage("");
    if(!couponCode.trim()){setCoupon(null);return}
    const {data,error}=await supabase.rpc("preview_course_coupon",{p_course_id:course.id,p_code:couponCode.trim()});
    if(error){setMessage(error.message);return}
    setCoupon(data);
    if(!data?.valid)setMessage(t({fr:"Coupon invalide ou expiré.",ar:"القسيمة غير صالحة أو منتهية.",en:"Invalid or expired coupon."}));
  }

  async function enrollFree(){
    if(isRegistrationClosed(course?.registration_deadline)){
      setMessage(t({fr:"Les inscriptions pour cette formation sont clôturées.",ar:"أُغلق التسجيل في هذه الدورة.",en:"Enrollment for this course is closed."}));return;
    }
    setMessage("");setBusy(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    const {error}=await supabase.rpc("enroll_free_course",{p_course_id:course.id});
    setBusy(false);
    if(error){setMessage(error.message);return}
    setEnrolled(true);
    setMessage(t({fr:"Inscription gratuite activée.",ar:"تم تفعيل التسجيل المجاني.",en:"Free enrollment activated."}));
  }

  async function buy(e:FormEvent){
    e.preventDefault();setMessage("");
    if(isRegistrationClosed(course?.registration_deadline)){
      setMessage(t({fr:"Les inscriptions pour cette formation sont clôturées.",ar:"أُغلق التسجيل في هذه الدورة.",en:"Enrollment for this course is closed."}));return;
    }
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    if(!course.instructor_id){window.location.href="/paiement";return}
    if(!method){setMessage(t({fr:"Choisissez un moyen de paiement.",ar:"اختر وسيلة دفع.",en:"Choose a payment method."}));return}
    if(payable==null){setMessage(t({fr:"Le formateur n’a pas configuré de prix dans la devise de cette méthode.",ar:"لم يحدد المدرب سعراً بعملة وسيلة الدفع هذه.",en:"The instructor has not configured a price in this payment method's currency."}));return}

    if(method.payment_mode==="automatic"){
      setBusy(true);
      const {data,error}=await supabase.functions.invoke("vydys-payments",{body:{
        action:"create_checkout",course_id:course.id,payment_method_id:method.id,currency:selectedCurrency,
        coupon_code:coupon?.valid?couponCode.trim():""
      }});
      setBusy(false);
      if(error||data?.error){setMessage(data?.detail||data?.error||error?.message||"Checkout error");return}
      if(data?.url)window.location.href=data.url;
      return;
    }

    if(!proof){setMessage(t({fr:"Ajoutez la preuve du paiement.",ar:"أضف إثبات الدفع.",en:"Add the payment proof."}));return}
    const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${user.id}/${crypto.randomUUID()}-${safe}`;
    const {error:upErr}=await supabase.storage.from("payment-proofs").upload(path,proof,{contentType:proof.type});
    if(upErr){setMessage(upErr.message);return}
    const {error}=await supabase.rpc("create_manual_course_order",{p_course_id:course.id,p_payment_method_id:method.id,p_transaction_reference:reference,p_proof_path:path,p_coupon_code:coupon?.valid?couponCode.trim():""});
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Paiement envoyé directement au formateur pour validation.",ar:"تم إرسال إثبات الدفع مباشرة للمدرب للمراجعة.",en:"Payment proof sent directly to the instructor for approval."}));
    setProof(null);setReference("");setCoupon(null);setCouponCode("");
  }

  async function submitReview(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:existing}=await supabase.from("course_reviews").select("id").eq("course_id",course.id).eq("user_id",user.id).maybeSingle();
    const res=existing?await supabase.from("course_reviews").update({rating,review_text:reviewText,updated_at:new Date().toISOString()}).eq("id",existing.id):await supabase.from("course_reviews").insert({course_id:course.id,user_id:user.id,rating,review_text:reviewText});
    if(res.error){setMessage(res.error.message);return}
    setMessage(t({fr:"Votre avis a été enregistré.",ar:"تم حفظ تقييمك.",en:"Your review has been saved."}));await load();
  }

  if(course===null)return <section className="section page-top"><div className="container">...</div></section>;
  if(course===false)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Formation introuvable",ar:"الدورة غير موجودة",en:"Course not found"})}</h1></article></div></section>;

  const title=lang==="ar"?course.title_ar:lang==="en"?course.title_en:course.title_fr;
  const desc=lang==="ar"?course.description_ar:lang==="en"?course.description_en:course.description_fr;
  const baseCurrency=String(course.base_currency||"MRU").toUpperCase();
  const baseAmount=Number(course.base_price_amount??course.base_price_mru??0);
  const registrationClosed=isRegistrationClosed(course.registration_deadline);

  return <section className="section page-top"><div className="container">
    <div className="course-detail-grid"><div>
      <div className="course-title-row"><span className="tag">{course.category||t({fr:"Formation",ar:"دورة",en:"Course"})}</span><div className="course-title-actions"><CourseShare title={title} slug={course.slug}/><button className={favorite?"favorite-inline active":"favorite-inline"} onClick={toggleFavorite}>♥ {favorite?t({fr:"Favori",ar:"مفضلة",en:"Saved"}):t({fr:"Ajouter aux favoris",ar:"إضافة للمفضلة",en:"Save"})}</button></div></div>
      <h1 className="course-detail-title">{title}</h1>
      {course.registration_deadline&&<p className="status" style={{fontWeight:700,margin:"0.75rem 0"}}>◷ {registrationClosed?t({fr:"Inscriptions clôturées depuis le ",ar:"أُغلق التسجيل منذ ",en:"Enrollment closed on "}):t({fr:"Date limite d’inscription : ",ar:"آخر أجل للتسجيل: ",en:"Enrollment deadline: "})}{displayDeadline(course.registration_deadline,lang)}{!registrationClosed&&t({fr:" inclus · 23h59 (Mauritanie)",ar:" شاملاً · الساعة 23:59 بتوقيت موريتانيا",en:" inclusive · 11:59 PM (Mauritania)"})}</p>}
      <p className="course-detail-copy">{desc}</p>
      {Number(ratings.review_count||0)>0?<div className="rating-line big"><span className="stars">{[1,2,3,4,5].map(n=><span key={n} className={n<=Math.round(Number(ratings.average_rating||0))?"on":"off"}>★</span>)}</span><strong>{Number(ratings.average_rating||0).toFixed(1)}/5</strong><span>{ratings.review_count} {t({fr:"avis",ar:"تقييم",en:"reviews"})}</span></div>:<div className="course-new-badge">✦ {t({fr:"Nouvelle formation · pas encore notée",ar:"دورة جديدة · لم يتم تقييمها بعد",en:"New course · not rated yet"})}</div>}
      {instructor&&<Link href={"/formateur/"+instructor.public_slug} className="instructor-box"><div className="avatar">{instructor.display_name?.slice(0,2).toUpperCase()}</div><div><small>{t({fr:"Formateur",ar:"المدرب",en:"Instructor"})}</small><strong>{instructor.display_name}</strong><span>{instructor.headline}</span></div></Link>}
      {(linkedClassroom||hybridSummary?.has_live_classroom)&&<article className="course-linked-classroom panel">
        <div><span className="eyebrow">{t({fr:"Formation hybride · 1 seul paiement",ar:"دورة هجينة · دفعة واحدة",en:"Hybrid course · one payment"})}</span><h3>{lang==="ar"?((linkedClassroom||hybridSummary)?.title_ar||(linkedClassroom||hybridSummary)?.title_fr):lang==="en"?((linkedClassroom||hybridSummary)?.title_en||(linkedClassroom||hybridSummary)?.title_fr):(linkedClassroom||hybridSummary)?.title_fr}</h3><p><strong>{(linkedClassroom||hybridSummary)?.session_count} {t({fr:"séances live incluses",ar:"حصص مباشرة مشمولة",en:"live sessions included"})}</strong> · {(linkedClassroom||hybridSummary)?.session_duration_minutes} min · {t({fr:"cours, supports et exercices inclus",ar:"الدروس والموارد والتمارين مشمولة",en:"lessons, resources and assignments included"})}</p></div>
        {enrolled&&linkedClassroom?<Link className="btn btn-ghost" href={"/classroom/"+linkedClassroom.slug}>{t({fr:"Ouvrir ma Classroom",ar:"فتح فصلي",en:"Open my Classroom"})}</Link>:<span className="hybrid-included-chip">{t({fr:"Inclus avec l’inscription",ar:"مشمول مع التسجيل",en:"Included with enrollment"})}</span>}
      </article>}

      {linkedClassroom&&linkedClassroomSessions.length>0&&<ClassroomCalendarActions room={linkedClassroom} sessions={linkedClassroomSessions} compact />}

      {modules.length>0&&<section className="course-public-curriculum">
        <div className="course-curriculum-head">
          <div><span className="eyebrow">{t({fr:"Programme de la formation",ar:"برنامج الدورة",en:"Course curriculum"})}</span><h2>{t({fr:"Ce que vous allez apprendre",ar:"ما الذي ستتعلمه",en:"What you will learn"})}</h2></div>
          <div className="course-curriculum-summary"><strong>{modules.length}</strong><span>{t({fr:"modules structurés",ar:"وحدات منظمة",en:"structured modules"})}</span></div>
        </div>
        <div className="course-public-module-grid">
          {modules.map((m:any,idx:number)=>{
            const moduleTitle=lang==="ar"?(m.title_ar||m.title_fr):lang==="en"?(m.title_en||m.title_fr):m.title_fr;
            return <article className="course-public-module" key={m.id}>
              <div className="course-module-number">{String(idx+1).padStart(2,"0")}</div>
              <div><small>{t({fr:"Module",ar:"الوحدة",en:"Module"})} {idx+1}</small><h3>{moduleTitle}</h3><p>{t({fr:"Leçon complète, support pédagogique et exercice pratique.",ar:"درس كامل ومواد تعليمية وتمرين تطبيقي.",en:"Complete lesson, learning material and practical exercise."})}</p></div>
              <span className="course-module-arrow">→</span>
            </article>
          })}
        </div>
        <div className="course-curriculum-includes">
          <span>✓ {t({fr:"Leçons complètes",ar:"دروس كاملة",en:"Complete lessons"})}</span>
          <span>✓ {t({fr:"Exercices pratiques",ar:"تمارين تطبيقية",en:"Practical assignments"})}</span>
          <span>✓ {t({fr:"Supports pédagogiques",ar:"مواد تعليمية",en:"Learning resources"})}</span>
          {(linkedClassroom||hybridSummary?.has_live_classroom)&&<span>✓ {hybridSummary?.session_count||linkedClassroom?.session_count} {t({fr:"séances live",ar:"حصص مباشرة",en:"live sessions"})}</span>}
        </div>
      </section>}

      <section className="reviews-section"><h2>{t({fr:"Avis des étudiants",ar:"آراء الطلاب",en:"Student reviews"})}</h2>
        {reviews.length===0?<p>{t({fr:"Pas encore d'avis. Soyez le premier étudiant inscrit à donner une note.",ar:"لا توجد تقييمات بعد. كن أول طالب مسجل يضيف تقييماً.",en:"No reviews yet. Be the first enrolled student to rate it."})}</p>:reviews.map(r=><article className="review-card" key={r.id}><div className="rating-line"><span className="stars">{[1,2,3,4,5].map(n=><span key={n} className={n<=Number(r.rating)?"on":"off"}>★</span>)}</span><strong>{r.rating}/5</strong></div>{r.review_text&&<p>{r.review_text}</p>}<small>✓ {t({fr:"Étudiant inscrit vérifié",ar:"طالب مسجل موثّق",en:"Verified enrolled student"})}</small></article>)}
        {enrolled?<article className="panel review-form"><h3>{t({fr:"Notez cette formation",ar:"قيّم هذه الدورة",en:"Rate this course"})}</h3><p className="review-form-copy">{t({fr:"Choisissez de 1 à 5 étoiles et ajoutez un commentaire si vous le souhaitez.",ar:"اختر من نجمة إلى خمس نجوم وأضف تعليقاً إذا رغبت.",en:"Choose 1 to 5 stars and add a comment if you want."})}</p><div className="rating-picker" aria-label={t({fr:"Votre note",ar:"تقييمك",en:"Your rating"})}>{[1,2,3,4,5].map(n=><button type="button" aria-label={n+"/5"} key={n} className={n<=rating?"active":""} onClick={()=>setRating(n)}>★</button>)}</div><strong className="selected-rating">{rating}/5</strong><textarea rows={4} value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder={t({fr:"Votre avis (facultatif)...",ar:"رأيك (اختياري)...",en:"Your review (optional)..."})}/><button className="btn" onClick={submitReview}>{t({fr:"Publier ma note",ar:"نشر تقييمي",en:"Publish my rating"})}</button></article>:<div className="review-eligibility-note">✓ {t({fr:"Les notes sont réservées aux étudiants inscrits à cette formation afin de garantir des avis fiables.",ar:"التقييم متاح فقط للطلاب المسجلين في الدورة لضمان تقييمات موثوقة.",en:"Ratings are limited to enrolled students to keep reviews trustworthy."})}</div>}
      </section>
    </div>

    <aside className="panel course-checkout"><div className="international-course-price"><small>{t({fr:"Prix unique du parcours",ar:"السعر الموحد للمسار",en:"Single pathway price"})}</small><h2>{baseAmount===0?t({fr:"GRATUIT",ar:"مجاني",en:"FREE"}):formatMoney(baseAmount,baseCurrency)}</h2>{hybridSummary?.has_live_classroom&&<span className="hybrid-price-note">✓ {t({fr:"Formation complète + Classroom live incluses",ar:"الدورة كاملة + الفصل المباشر مشمولان",en:"Full course + live Classroom included"})}</span>}{prices.length>1&&<span>{prices.length} {t({fr:"devises configurées",ar:"عملات مهيأة",en:"currencies configured"})}</span>}</div>
      {enrolled?<><p className="status">{t({fr:"Vous êtes inscrit à cette formation.",ar:"أنت مسجل في هذه الدورة.",en:"You are enrolled in this course."})}</p><Link className="btn full" href={"/apprendre/"+course.slug}>{t({fr:"Accéder à ma formation",ar:"الدخول إلى الدورة",en:"Go to my course"})}</Link>{linkedClassroom&&<Link className="btn btn-ghost full" href={"/classroom/"+linkedClassroom.slug}>◉ {t({fr:"Accéder à la Classroom live",ar:"الدخول إلى الفصل المباشر",en:"Open live Classroom"})}</Link>}</>:registrationClosed?<p className="manual-note" role="status">{t({fr:"Les inscriptions à cette formation sont désormais clôturées. Les étudiants déjà inscrits conservent leur accès.",ar:"أُغلق التسجيل في هذه الدورة. يحتفظ الطلاب المسجلون مسبقاً بحق الوصول.",en:"Enrollment for this course is closed. Previously enrolled students keep their access."})}</p>:baseAmount===0?<><p>{t({fr:"Cette formation est gratuite. Aucun moyen de paiement n’est nécessaire.",ar:"هذه الدورة مجانية ولا تحتاج إلى وسيلة دفع.",en:"This course is free. No payment method is required."})}</p><button className="btn full" onClick={enrollFree} disabled={busy}>{busy?"...":t({fr:"S’inscrire gratuitement",ar:"التسجيل مجاناً",en:"Enroll for free"})}</button></>:!course.instructor_id?<><p>{t({fr:"Formation officielle Vydys Academy.",ar:"دورة رسمية من Vydys Academy.",en:"Official Vydys Academy course."})}</p><Link className="btn full" href="/paiement">{t({fr:"S'inscrire",ar:"سجّل",en:"Enroll"})}</Link></>:<>
        <p>{hybridSummary?.has_live_classroom?t({fr:"Un seul paiement de la formation donne accès aux modules, leçons, supports, exercices et aux 10 séances live de la Classroom. Aucun second paiement Classroom.",ar:"دفعة واحدة للدورة تمنح الوصول إلى الوحدات والدروس والموارد والتمارين والحصص المباشرة، دون دفع ثانٍ للفصل.",en:"One course payment unlocks modules, lessons, resources, assignments and the live Classroom sessions. No second Classroom payment."}):t({fr:"Votre paiement va directement au formateur. Les méthodes mauritaniennes sont validées manuellement ; les providers internationaux sont confirmés automatiquement.",ar:"يذهب الدفع مباشرة إلى المدرب. الطرق الموريتانية تُراجع يدوياً والمزودون الدوليون يؤكدون الدفع تلقائياً.",en:"Your payment goes directly to the instructor. Mauritanian methods are reviewed manually; international providers confirm automatically."})}</p>
        {methods.length===0?<p className="manual-note">{t({fr:"Le formateur n'a pas encore configuré de moyen de paiement.",ar:"لم يضف المدرب وسيلة دفع بعد.",en:"The instructor has not configured a payment method yet."})}</p>:<form onSubmit={buy}>
          <div className="checkout-methods">{methods.map(m=>{
            const cur=m.payment_mode==="automatic"?(checkoutCurrency||baseCurrency):String(m.currency||"MRU").toUpperCase();
            const p=priceFor(cur);const available=p!=null;
            return <button type="button" disabled={!available} key={m.id} onClick={()=>setSelectedMethod(m.id)} className={selectedMethod===m.id?"checkout-method selected":"checkout-method"}><div><strong>{(m.label||m.method).toUpperCase()}</strong><span>{m.payment_mode==="automatic"?t({fr:"Automatique",ar:"تلقائي",en:"Automatic"}):t({fr:"Validation manuelle",ar:"مراجعة يدوية",en:"Manual approval"})}{m.account_number&&m.payment_mode!=="automatic"?" · "+m.account_number:""}</span></div><b>{available?formatMoney(Number(p)*(1-Number(m.discount_percent||0)/100),cur):t({fr:"Prix non configuré",ar:"السعر غير مهيأ",en:"Price unavailable"})}</b></button>
          })}</div>

          {method?.payment_mode==="automatic"&&prices.length>1&&<label className="form-field"><span>{t({fr:"Devise du checkout",ar:"عملة الدفع",en:"Checkout currency"})}</span><select value={checkoutCurrency} onChange={e=>setCheckoutCurrency(e.target.value)}>{prices.map(p=><option key={p.currency} value={p.currency}>{p.currency} · {formatMoney(Number(p.amount),p.currency)}</option>)}</select></label>}

          {method&&payable!=null&&<>{method.payment_mode==="manual"?<div className="settlement-highlight">
            <div className="settlement-account">
              <span>{t({fr:"Compte de règlement",ar:"حساب الدفع",en:"Payment account"})}</span>
              <strong>{method.account_number||"—"}</strong>
              <small>{String(method.label||method.method).toUpperCase()}</small>
            </div>
            <div className="settlement-amount">
              <span>{t({fr:"Montant exact à envoyer",ar:"المبلغ الدقيق للإرسال",en:"Exact amount to send"})}</span>
              <strong>{formatMoney(payable,selectedCurrency)}</strong>
            </div>
          </div>:<div className="amount-box"><span>{t({fr:"Montant exact",ar:"المبلغ المحدد",en:"Exact amount"})}</span><strong>{formatMoney(payable,selectedCurrency)}</strong></div>}
          {(methodDiscount>0||coupon?.valid)&&<div className="payment-discount-summary">{methodDiscount>0&&<small>{t({fr:"Réduction moyen de paiement",ar:"خصم وسيلة الدفع",en:"Payment method discount"})}: -{methodDiscount}%</small>}{coupon?.valid&&<small>{t({fr:"Coupon",ar:"قسيمة",en:"Coupon"})} {coupon.code}: -{coupon.discount_percent}%</small>}</div>}
          <div className="coupon-box"><input value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} placeholder={t({fr:"Code promo",ar:"رمز الخصم",en:"Promo code"})}/><button type="button" onClick={applyCoupon}>{t({fr:"Appliquer",ar:"تطبيق",en:"Apply"})}</button></div>
          {method.payment_mode==="manual"?<>
            {method.instructions&&<p className="payment-instructor-instructions">{method.instructions}</p>}
            <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Preuve de paiement",ar:"إثبات الدفع",en:"Payment proof"})}</strong></label>
            <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
            <button className="btn full" disabled={busy}>{t({fr:"Envoyer au formateur",ar:"إرسال للمدرب",en:"Submit to instructor"})}</button>
          </>:<button className="btn full international-pay-btn" disabled={busy}>{busy?"...":t({fr:"Payer automatiquement",ar:"الدفع تلقائياً",en:"Pay automatically"})+" · "+(method.provider_code==="stripe"?"Stripe":"PayPal")}</button>}
          </>}
        </form>}
      </>}
      {message&&<p className="manual-note">{message}</p>}
    </aside>
    </div>
  </div><WhatsAppBubble number={instructor?.whatsapp_number} message={"Bonjour, je souhaite plus d'informations sur la formation "+title+"."}/></section>
}