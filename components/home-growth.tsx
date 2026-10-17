"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "./language-provider";

export type FeaturedCourse = {
  id: string;
  slug: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  description_fr: string | null;
  description_ar: string | null;
  description_en: string | null;
  currency: string;
  price: number;
  modules: number;
  registration_deadline: string | null;
};

type Goal = "start" | "practice" | "prove" | "teach";
const origin = "https://www.vydys.com";
const shareLink = origin + "/?utm_source=community&utm_medium=share&utm_campaign=discover_vydys";

export default function HomeGrowth({ courses }: { courses: FeaturedCourse[] }) {
  const { lang, t } = useLanguage();
  const [goal, setGoal] = useState<Goal>("start");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const options: Array<{
    key: Goal; badge: string; title: string; desc: string; href: string; action: string;
  }> = [
    {
      key: "start", badge: "01",
      title: t({fr: "Je débute avec l’IA", ar: "أبدأ تعلم الذكاء الاصطناعي", en: "I'm new to AI"}),
      desc: t({fr: "Explorez les programmes, les modules, les prix et les cours en direct avant de vous inscrire.", ar: "استكشف الدورات والوحدات والأسعار والحصص المباشرة قبل التسجيل.", en: "Explore courses, curricula, prices and live sessions before enrolling."}),
      href: "/formations",
      action: t({fr: "Trouver ma formation", ar: "ابحث عن دورتي", en: "Find my course"})
    },
    {
      key: "practice", badge: "02",
      title: t({fr: "Je veux pratiquer", ar: "أريد التدريب عملياً", en: "I want hands-on practice"}),
      desc: t({fr: "Code, SQL, API et exercices : ouvrez le Practice Hub et progressez à votre rythme.", ar: "البرمجة وSQL وAPI والتمارين: تدرب حسب وتيرتك في مركز التدريب.", en: "Code, SQL, APIs and challenges: practice at your own pace in the Practice Hub."}),
      href: "/practice",
      action: t({fr: "Découvrir les exercices", ar: "استكشف التمارين", en: "Explore practice challenges"})
    },
    {
      key: "prove", badge: "03",
      title: t({fr: "Je prépare mon avenir professionnel", ar: "أطور مساري المهني", en: "I'm building career skills"}),
      desc: t({fr: "Définissez un objectif, identifiez vos compétences à développer et construisez votre portfolio.", ar: "حدد هدفاً مهنياً واكتشف المهارات المطلوبة وأنشئ ملف إنجازاتك.", en: "Set a career goal, identify skills to grow and build a project portfolio."}),
      href: "/skill-engine",
      action: t({fr: "Créer mon parcours", ar: "أنشئ مساري", en: "Build my learning path"})
    },
    {
      key: "teach", badge: "04",
      title: t({fr: "Je veux enseigner", ar: "أريد تقديم دورات", en: "I want to teach"}),
      desc: t({fr: "Présentez vos formations, gérez vos Classroom et développez votre activité de formateur.", ar: "قدّم دوراتك وأدر فصولك وطور نشاطك كمدرب.", en: "Publish courses, manage Classrooms and grow your teaching activity."}),
      href: "/devenir-formateur",
      action: t({fr: "Découvrir l’espace formateur", ar: "استكشف مساحة المدرب", en: "Explore instructor tools"})
    }
  ];
  const active = options.find(option => option.key === goal) || options[0];

  const shareText = t({
    fr: "Découvre Vydys : formations en IA et technologie, cours en direct, exercices pratiques et portfolio de compétences.",
    ar: "اكتشف Vydys: دورات الذكاء الاصطناعي والتقنية، حصص مباشرة، تمارين عملية وملف مهارات.",
    en: "Discover Vydys: AI and technology courses, live Classrooms, practical challenges and a skills portfolio."
  });
  const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(shareText + "\n" + shareLink);

  async function share() {
    setCopyStatus("idle");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Vydys Academy", text: shareText, url: shareLink });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText + "\n" + shareLink);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const availableCourses = useMemo(() => courses.filter(course => Boolean(course.slug)).slice(0, 3), [courses]);
  const formatPrice = (course: FeaturedCourse) => {
    try {
      return new Intl.NumberFormat(lang === "ar" ? "ar-MR" : lang === "en" ? "en-US" : "fr-FR", {
        style: "currency", currency: course.currency || "MRU", maximumFractionDigits: 0
      }).format(course.price);
    } catch {
      return course.price.toLocaleString("fr-FR") + " " + course.currency;
    }
  };
  const formatDeadline = (deadline: string) => new Intl.DateTimeFormat(
    lang === "ar" ? "ar-MR" : lang === "en" ? "en-GB" : "fr-FR",
    {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"}
  ).format(new Date(deadline + "T12:00:00Z"));

  function localText(course: FeaturedCourse, field: "title" | "description") {
    const fr = course[(field + "_fr") as keyof FeaturedCourse] as string | null;
    const ar = course[(field + "_ar") as keyof FeaturedCourse] as string | null;
    const en = course[(field + "_en") as keyof FeaturedCourse] as string | null;
    return (lang === "ar" ? ar || fr || en : lang === "en" ? en || fr || ar : fr || en || ar) || "";
  }

  return <>
    <section className="growth-start section" aria-labelledby="growth-start-heading">
      <div className="container">
        <div className="growth-heading">
          <div>
            <span className="eyebrow">{t({fr:"Commencer avec Vydys",ar:"ابدأ مع Vydys",en:"Start with Vydys"})}</span>
            <h2 id="growth-start-heading">{t({fr:"Dites-nous ce que vous voulez accomplir.",ar:"ما الهدف الذي تريد تحقيقه؟",en:"What would you like to achieve?"})}</h2>
            <p>{t({fr:"Choisissez votre objectif. Nous vous orientons vers les outils et formations qui existent déjà sur Vydys.",ar:"اختر هدفك وسنوجهك إلى الأدوات والدورات المتاحة بالفعل على Vydys.",en:"Choose your goal. We'll guide you to the tools and courses already available on Vydys."})}</p>
          </div>
          <Link className="growth-free-link" href="/connexion?mode=register&utm_source=homepage&utm_medium=cta&utm_campaign=free_account">
            {t({fr:"Créer un compte gratuitement",ar:"إنشاء حساب مجاناً",en:"Create a free account"})} <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="growth-goal-options" role="group" aria-label={t({fr:"Choisissez votre objectif",ar:"اختر هدفك",en:"Choose your goal"})}>
          {options.map(option => <button
            type="button" key={option.key}
            onClick={() => setGoal(option.key)}
            aria-pressed={goal === option.key}
            className={"growth-goal-button" + (goal === option.key ? " active" : "")}
          ><span>{option.badge}</span>{option.title}</button>)}
        </div>

        <div className="growth-active-goal" aria-live="polite">
          <div className="growth-active-copy">
            <span className="growth-step-label">{t({fr:"Votre première étape",ar:"خطوتك الأولى",en:"Your next step"})}</span>
            <h3>{active.title}</h3>
            <p>{active.desc}</p>
            <small>{t({
              fr:"Parcourir Vydys est libre. Certaines fonctionnalités demandent un compte et certaines formations sont payantes.",
              ar:"يمكنك استكشاف Vydys بحرية. بعض الأدوات تتطلب حساباً وبعض الدورات مدفوعة.",
              en:"Browsing Vydys is open. Some tools require an account, and some courses are paid."
            })}</small>
          </div>
          <Link className="btn growth-goal-cta" href={active.href}>{active.action}<span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>

    {availableCourses.length > 0 && <section className="growth-featured section" aria-labelledby="growth-featured-heading">
      <div className="container">
        <div className="growth-heading">
          <div>
            <span className="eyebrow">{t({fr:"Formations ouvertes",ar:"الدورات المتاحة",en:"Explore learning"})}</span>
            <h2 id="growth-featured-heading">{t({fr:"Passez de la curiosité à une vraie compétence.",ar:"حوّل فضولك إلى مهارة حقيقية.",en:"Turn curiosity into real skills."})}</h2>
            <p>{t({fr:"Découvrez les programmes et les prix réels. Choisissez ensuite la formation qui vous convient.",ar:"اطلع على البرامج والأسعار الفعلية واختر الدورة المناسبة لك.",en:"See real course curricula and prices before choosing your program."})}</p>
          </div>
          <Link href="/formations" className="growth-section-link">{t({fr:"Toutes les formations",ar:"كل الدورات",en:"All courses"})} <span aria-hidden="true">→</span></Link>
        </div>
        <div className="growth-course-grid">
          {availableCourses.map((course, i) => <article className="growth-course-card" key={course.id}>
            <div className={"growth-course-cover growth-course-cover-" + (i % 3)}>
              <span className="growth-course-brand">VYDYS / ACADEMY</span>
              <span className="growth-course-mark" aria-hidden="true">{i === 0 ? "AI" : i === 1 ? "01" : "∞"}</span>
              <span className="growth-course-format">{t({fr:"Formation en ligne",ar:"دورة عبر الإنترنت",en:"Online course"})}</span>
            </div>
            <div className="growth-course-details">
              <div className="growth-course-meta">
                <span>{course.modules} {t({fr:"modules",ar:"وحدات",en:"modules"})}</span>
                {course.registration_deadline &&
                  <span>{t({fr:"Inscription jusqu’au",ar:"آخر أجل للتسجيل",en:"Enroll by"})} {formatDeadline(course.registration_deadline)}</span>}
              </div>
              <h3>{localText(course, "title")}</h3>
              <p>{localText(course, "description").replace(/\s+/g," ").slice(0, 145)}{localText(course, "description").length > 145 ? "…" : ""}</p>
              <div className="growth-course-bottom">
                <strong>{formatPrice(course)}</strong>
                <Link href={"/formation/" + encodeURIComponent(course.slug)} aria-label={t({fr:"Voir le programme :",ar:"عرض البرنامج:",en:"View curriculum:"}) + " " + localText(course, "title")}>
                  {t({fr:"Voir le programme",ar:"عرض البرنامج",en:"View curriculum"})} <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </article>)}
        </div>
      </div>
    </section>}

    <section className="growth-community" aria-labelledby="growth-community-heading">
      <div className="container growth-community-inner">
        <div>
          <span className="growth-community-kicker">{t({fr:"Apprendre ensemble",ar:"نتعلم معاً",en:"Learn together"})}</span>
          <h2 id="growth-community-heading">{t({
            fr:"Une personne de votre entourage pourrait en profiter.",
            ar:"قد يستفيد شخص تعرفه من Vydys.",
            en:"Someone you know could benefit from Vydys."
          })}</h2>
          <p>{t({
            fr:"Partagez Vydys avec un ami, un collègue ou un groupe d’étudiants. Aucun compte n'est nécessaire pour découvrir la plateforme.",
            ar:"شارك Vydys مع صديق أو زميل أو مجموعة طلاب. لا يلزم إنشاء حساب لاستكشاف المنصة.",
            en:"Share Vydys with a friend, colleague or student group. No account is needed to explore the platform."
          })}</p>
        </div>
        <div className="growth-community-actions">
          <button type="button" className="btn" onClick={share}>
            {copyStatus === "copied" ? t({fr:"Lien copié",ar:"تم نسخ الرابط",en:"Link copied"}) : t({fr:"Partager Vydys",ar:"مشاركة Vydys",en:"Share Vydys"})} <span aria-hidden="true">↗</span>
          </button>
          <a className="btn btn-ghost" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            WhatsApp <span aria-hidden="true">↗</span>
          </a>
          {copyStatus === "failed" &&
            <p className="growth-share-feedback" role="status">{t({fr:"Copiez ce lien :",ar:"انسخ الرابط:",en:"Copy this link:"})} <a href={shareLink}>{shareLink}</a></p>}
          {copyStatus === "copied" && <span className="growth-share-feedback" role="status">{t({fr:"Prêt à envoyer à vos contacts.",ar:"جاهز للمشاركة مع معارفك.",en:"Ready to send to your contacts."})}</span>}
        </div>
      </div>
    </section>
  </>;
}
