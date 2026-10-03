"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "../../../components/language-provider";
import { supabase } from "../../../lib/supabase";

export default function FormationDetailPage(){
  const params=useParams<{slug:string}>();
  const {lang,t}=useLanguage();
  const [course,setCourse]=useState<any>(null);
  const [instructor,setInstructor]=useState<any>(null);
  const [methods,setMethods]=useState<any[]>([]);
  const [ratings,setRatings]=useState<any>({average_rating:0,review_count:0});
  const [reviews,setReviews]=useState<any[]>([]);
  const [enrolled,setEnrolled]=useState(false);
  const [rating,setRating]=useState(5);
  const [reviewText,setReviewText]=useState("");
  const [selectedMethod,setSelectedMethod]=useState<string>("");
  const [proof,setProof]=useState<File|null>(null);
  const [reference,setReference]=useState("");
  const [message,setMessage]=useState("");

  async function load(){
    const {data:c}=await supabase.from("courses").select("*").eq("slug",params.slug).eq("status","published").single();
    if(!c){setCourse(false);return}
    setCourse(c);
    const [{data:rs},{data:rv}]=await Promise.all([
      supabase.from("course_rating_summary").select("*").eq("course_id",c.id).single(),
      supabase.from("course_reviews").select("id,rating,review_text,created_at").eq("course_id",c.id).order("created_at",{ascending:false})
    ]);
    if(rs)setRatings(rs);setReviews(rv||[]);
    if(c.instructor_id){
      const [{data:i},{data:m}]=await Promise.all([
        supabase.from("instructor_profiles").select("*").eq("user_id",c.instructor_id).single(),
        supabase.from("instructor_payment_methods").select("*").eq("instructor_id",c.instructor_id).eq("is_active",true)
      ]);
      setInstructor(i);setMethods(m||[]);if(m?.[0])setSelectedMethod(m[0].id);
    }
    const {data:{user}}=await supabase.auth.getUser();
    if(user){
      const {data:e}=await supabase.from("enrollments").select("id").eq("user_id",user.id).eq("course_id",c.id).in("status",["active","completed"]).maybeSingle();
      setEnrolled(Boolean(e));
      const {data:my}=await supabase.from("course_reviews").select("rating,review_text").eq("course_id",c.id).eq("user_id",user.id).maybeSingle();
      if(my){setRating(my.rating);setReviewText(my.review_text||"")}
    }
  }
  useEffect(()=>{load()},[params.slug]);

  const method=methods.find(m=>m.id===selectedMethod);
  const payable=useMemo(()=>course&&method?Math.round(course.base_price_mru*(1-Number(method.discount_percent||0)/100)):course?.base_price_mru||0,[course,method]);

  async function buy(e:FormEvent){
    e.preventDefault();setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/connexion";return}
    if(!course.instructor_id){window.location.href="/paiement";return}
    if(!method){setMessage(t({fr:"Choisissez un moyen de paiement.",ar:"اختر وسيلة دفع.",en:"Choose a payment method."}));return}
    if(!proof){setMessage(t({fr:"Ajoutez la capture du paiement.",ar:"أضف لقطة شاشة للدفع.",en:"Add the payment screenshot."}));return}
    const safe=proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${user.id}/${crypto.randomUUID()}-${safe}`;
    const {error:upErr}=await supabase.storage.from("payment-proofs").upload(path,proof,{contentType:proof.type});
    if(upErr){setMessage(upErr.message);return}
    const {error}=await supabase.rpc("submit_course_payment",{p_course_id:course.id,p_payment_method_id:method.id,p_transaction_reference:reference,p_proof_path:path});
    if(error){setMessage(error.message);return}
    setMessage(t({fr:"Paiement envoyé au formateur pour validation.",ar:"تم إرسال الدفع للمدرب للمراجعة.",en:"Payment submitted to the instructor for approval."}));
    setProof(null);setReference("");
  }

  async function submitReview(){
    const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/connexion";return}
    const {data:existing}=await supabase.from("course_reviews").select("id").eq("course_id",course.id).eq("user_id",user.id).maybeSingle();
    const res=existing
      ? await supabase.from("course_reviews").update({rating,review_text:reviewText,updated_at:new Date().toISOString()}).eq("id",existing.id)
      : await supabase.from("course_reviews").insert({course_id:course.id,user_id:user.id,rating,review_text:reviewText});
    if(res.error){setMessage(res.error.message);return}
    setMessage(t({fr:"Votre avis a été enregistré.",ar:"تم حفظ تقييمك.",en:"Your review has been saved."}));await load();
  }

  if(course===null)return <section className="section page-top"><div className="container">...</div></section>;
  if(course===false)return <section className="section page-top"><div className="container"><article className="panel"><h1>{t({fr:"Formation introuvable",ar:"الدورة غير موجودة",en:"Course not found"})}</h1></article></div></section>;

  const title=lang==="ar"?course.title_ar:lang==="en"?course.title_en:course.title_fr;
  const desc=lang==="ar"?course.description_ar:lang==="en"?course.description_en:course.description_fr;

  return <section className="section page-top"><div className="container">
    <div className="course-detail-grid"><div>
      <span className="tag">{course.category||t({fr:"Formation",ar:"دورة",en:"Course"})}</span><h1 className="course-detail-title">{title}</h1><p className="course-detail-copy">{desc}</p>
      <div className="rating-line big"><span className="stars">★★★★★</span><strong>{Number(ratings.average_rating||0).toFixed(1)}</strong><span>{ratings.review_count} {t({fr:"avis",ar:"تقييم",en:"reviews"})}</span></div>
      {instructor&&<Link href={"/formateur/"+instructor.public_slug} className="instructor-box"><div className="avatar">{instructor.display_name?.slice(0,2).toUpperCase()}</div><div><small>{t({fr:"Formateur",ar:"المدرب",en:"Instructor"})}</small><strong>{instructor.display_name}</strong><span>{instructor.headline}</span></div></Link>}

      <section className="reviews-section"><h2>{t({fr:"Avis des étudiants",ar:"آراء الطلاب",en:"Student reviews"})}</h2>
        {reviews.length===0?<p>{t({fr:"Pas encore d'avis.",ar:"لا توجد تقييمات بعد.",en:"No reviews yet."})}</p>:reviews.map(r=><article className="review-card" key={r.id}><div className="rating-line"><span className="stars">★★★★★</span><strong>{r.rating}/5</strong></div><p>{r.review_text}</p><small>{t({fr:"Étudiant vérifié",ar:"طالب مسجل",en:"Verified student"})}</small></article>)}
        {enrolled&&<article className="panel review-form"><h3>{t({fr:"Notez cette formation",ar:"قيّم هذه الدورة",en:"Rate this course"})}</h3><div className="rating-picker">{[1,2,3,4,5].map(n=><button key={n} className={n<=rating?"active":""} onClick={()=>setRating(n)}>★</button>)}</div><textarea rows={4} value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder={t({fr:"Votre avis...",ar:"رأيك...",en:"Your review..."})}/><button className="btn" onClick={submitReview}>{t({fr:"Publier mon avis",ar:"نشر التقييم",en:"Publish review"})}</button></article>}
      </section>
    </div>

    <aside className="panel course-checkout"><h2>{course.base_price_mru.toLocaleString("fr-FR")} MRU</h2>
      {!course.instructor_id?<><p>{t({fr:"Formation officielle Vydys Academy.",ar:"دورة رسمية من Vydys Academy.",en:"Official Vydys Academy course."})}</p><Link className="btn full" href="/paiement">{t({fr:"S'inscrire",ar:"سجّل",en:"Enroll"})}</Link></>:<>
        <p>{t({fr:"Payez directement au formateur puis envoyez votre capture.",ar:"ادفع مباشرة للمدرب ثم أرسل لقطة الشاشة.",en:"Pay the instructor directly, then upload your screenshot."})}</p>
        {methods.length===0?<p className="manual-note">{t({fr:"Le formateur n'a pas encore configuré de moyen de paiement.",ar:"لم يضف المدرب وسيلة دفع بعد.",en:"The instructor has not configured a payment method yet."})}</p>:<form onSubmit={buy}>
          <div className="checkout-methods">{methods.map(m=><button type="button" key={m.id} onClick={()=>setSelectedMethod(m.id)} className={selectedMethod===m.id?"checkout-method selected":"checkout-method"}><div><strong>{m.method.toUpperCase()}</strong><span>{m.account_number}</span></div><b>{Math.round(course.base_price_mru*(1-Number(m.discount_percent||0)/100)).toLocaleString("fr-FR")} MRU</b></button>)}</div>
          {method&&<><div className="amount-box"><span>{t({fr:"Montant exact",ar:"المبلغ المحدد",en:"Exact amount"})}</span><strong>{payable.toLocaleString("fr-FR")} MRU</strong>{Number(method.discount_percent)>0&&<small>-{method.discount_percent}%</small>}</div>
          <label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/><span>↑</span><strong>{proof?.name||t({fr:"Capture de paiement",ar:"لقطة الدفع",en:"Payment screenshot"})}</strong></label>
          <label className="form-field"><span>{t({fr:"Référence transaction",ar:"مرجع العملية",en:"Transaction reference"})}</span><input value={reference} onChange={e=>setReference(e.target.value)}/></label>
          <button className="btn full">{t({fr:"Envoyer au formateur",ar:"إرسال للمدرب",en:"Submit to instructor"})}</button></>}
        </form>}
      </>}
      {message&&<p className="manual-note">{message}</p>}
    </aside>
    </div>
  </div></section>
}
