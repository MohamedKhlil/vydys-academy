"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "./language-provider";
import {
  buildClassroomCalendarEvents, downloadIcs,
  googleCalendarUrl, outlookCalendarUrl, publicCalendarFeedUrl,
  type CalendarRoom, type CalendarSession,
} from "../lib/calendar-events";

type Props = {
  room: CalendarRoom;
  sessions: CalendarSession[];
  compact?: boolean;
};

export default function ClassroomCalendarActions({ room, sessions, compact = false }: Props) {
  const { lang, t } = useLanguage();
  const events = useMemo(() => buildClassroomCalendarEvents(room, sessions), [room, sessions]);
  const activeEvents = useMemo(() => events.filter(event => !event.cancelled), [events]);
  const [selectedUid, setSelectedUid] = useState<string>("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [showHelp, setShowHelp] = useState(false);
  const selected = activeEvents.find(event => event.uid === selectedUid) || activeEvents[0];
  const canSubscribe = room.visibility === "public" && room.status === "published";
  const feedUrl = publicCalendarFeedUrl(room);

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
      setShowHelp(true);
    }
  }

  if (activeEvents.length === 0) return null;

  const dateLocale = lang === "ar" ? "ar-MR" : lang === "en" ? "en-GB" : "fr-FR";
  const label = room.title_fr || room.title_en || "Vydys Classroom";

  return <section className={"classroom-calendar-actions" + (compact ? " compact" : "")} aria-label={t({ fr: "Ajouter le planning à votre calendrier", ar: "إضافة الجدول إلى تقويمك", en: "Add your timetable to your calendar" })}
    style={{ border: "1px solid var(--border, #cbd5e1)", borderRadius: 16, padding: compact ? 14 : 20, margin: "16px 0", background: "var(--surface, transparent)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
      <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>📅</span>
      <div>
        <strong style={{ display: "block", fontSize: "1.03rem" }}>{t({ fr: "Ajouter à mon calendrier", ar: "أضف إلى تقويمي", en: "Add to my calendar" })}</strong>
        <small style={{ opacity: .75 }}>{activeEvents.length} {t({ fr: "séances", ar: "حصص", en: "sessions" })} · {t({ fr: "Heure de Nouakchott (UTC+0)", ar: "توقيت نواكشوط (UTC+0)", en: "Nouakchott time (UTC+0)" })}</small>
      </div>
    </div>

    <p style={{ margin: "6px 0 12px", fontSize: ".9rem" }}>{t({
      fr: "Retrouvez vos cours dans Google Agenda, Outlook ou le calendrier de votre téléphone.",
      ar: "اعرض مواعيد حصصك في تقويم Google أو Outlook أو تقويم هاتفك.",
      en: "Keep your sessions in Google Calendar, Outlook, or your phone calendar.",
    })}</p>

    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <button className="btn btn-small" type="button" onClick={() => downloadIcs(activeEvents, "vydys-" + room.slug, label)}>
        ↓ {t({ fr: "Toutes les séances (.ics)", ar: "كل الحصص (.ics)", en: "All sessions (.ics)" })}
      </button>
      {canSubscribe && <button className="btn btn-small btn-ghost" type="button" onClick={copyFeed}>
        {copyState === "copied" ? "✓ " + t({ fr: "Lien copié", ar: "تم نسخ الرابط", en: "Link copied" }) : t({ fr: "Copier le lien d'abonnement", ar: "نسخ رابط الاشتراك", en: "Copy subscription link" })}
      </button>}
      {canSubscribe && <button className="btn btn-small btn-ghost" type="button" aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)}>
        ? {t({ fr: "Comment synchroniser ?", ar: "كيف تتم المزامنة؟", en: "How to sync?" })}
      </button>}
    </div>

    {canSubscribe && showHelp && <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "var(--surface-elevated, rgba(120,120,120,.08))", fontSize: ".88rem" }}>
      <p>{t({
        fr: "Pour recevoir automatiquement les changements d’horaires : copiez le lien, puis dans Google Agenda sur ordinateur choisissez « Autres agendas » → « À partir de l’URL ». Dans Outlook, choisissez « Ajouter un calendrier » → « S’abonner à partir du web ».",
        ar: "لتلقي تحديثات المواعيد تلقائياً: انسخ الرابط. في تقويم Google على الحاسوب اختر «تقاويم أخرى» ثم «من عنوان URL». وفي Outlook اختر «إضافة تقويم» ثم «الاشتراك من الويب».",
        en: "For automatic schedule updates, copy the link. On desktop Google Calendar: Other calendars → From URL. In Outlook: Add calendar → Subscribe from web.",
      })}</p>
      <input readOnly aria-label={t({fr:"Lien du calendrier",ar:"رابط التقويم",en:"Calendar URL"})} value={feedUrl} onFocus={event => event.currentTarget.select()} style={{ display: "block", width: "100%", marginTop: 8, fontSize: ".77rem", padding: 8, borderRadius: 8 }} />
      <small style={{ opacity: .8 }}>{t({
        fr: "L’abonnement se met à jour suivant la fréquence de Google/Outlook. Le fichier .ics téléchargé est une copie fixe.",
        ar: "يتم تحديث الاشتراك بحسب وتيرة Google/Outlook. ملف .ics المحمّل نسخة ثابتة.",
        en: "Subscriptions refresh according to Google/Outlook's schedule. A downloaded .ics file is a fixed snapshot.",
      })}</small>
    </div>}
    {copyState === "error" && <p role="status" style={{ fontSize: ".82rem" }}>{t({fr:"Copie automatique impossible : sélectionnez le lien ci-dessus.",ar:"تعذر النسخ تلقائياً: حدد الرابط أعلاه.",en:"Unable to copy automatically: select the link above."})}</p>}

    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 10, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border, #cbd5e1)" }}>
      <label style={{ flex: "1 1 210px", minWidth: 180 }}>
        <small style={{ display: "block", marginBottom: 5 }}>{t({ fr: "Ajouter une séance individuellement", ar: "أضف حصة واحدة", en: "Add an individual session" })}</small>
        <select value={selected?.uid || ""} onChange={e => setSelectedUid(e.target.value)} style={{ width: "100%", padding: 9, borderRadius: 8 }}>
          {activeEvents.map((event, index) => <option key={event.uid} value={event.uid}>
            {index + 1}. {new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nouakchott" }).format(event.start)}
          </option>)}
        </select>
      </label>
      {selected && <a className="btn btn-small btn-ghost" href={googleCalendarUrl(selected)} target="_blank" rel="noopener noreferrer">
        Google Agenda ↗
      </a>}
      {selected && <a className="btn btn-small btn-ghost" href={outlookCalendarUrl(selected)} target="_blank" rel="noopener noreferrer">
        Outlook ↗
      </a>}
    </div>
  </section>;
}
