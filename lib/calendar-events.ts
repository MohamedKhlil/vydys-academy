/**
 * Calendar interoperability for Vydys Classroom.
 * Event data comes from the saved Classroom sessions, never from a predicted
 * weekly pattern. All timestamps are UTC in iCalendar and converted by the
 * user's own Google/Outlook/Apple Calendar settings.
 */
export type CalendarRoom = {
  id?: string;
  course_id?: string | null;
  slug: string;
  title_fr?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  status?: string | null;
  visibility?: string | null;
};
export type CalendarSession = {
  id: string;
  classroom_id?: string;
  position: number;
  title?: string | null;
  starts_at: string;
  ends_at: string;
  status?: string | null;
  updated_at?: string | null;
};
export type VydysCalendarEvent = {
  uid: string;
  summary: string;
  description: string;
  url: string;
  location: string;
  start: Date;
  end: Date;
  updated: Date;
  cancelled: boolean;
};

const baseUrl = "https://www.vydys.com";
const calendarTimezone = "Africa/Nouakchott";

export function buildClassroomCalendarEvents(room: CalendarRoom, sessions: CalendarSession[]): VydysCalendarEvent[] {
  const courseTitle = room.title_fr || room.title_en || room.title_ar || "Vydys Classroom";
  const result: VydysCalendarEvent[] = [];
  for (const session of sessions) {
    const start = new Date(session.starts_at);
    const end = new Date(session.ends_at);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end.getTime() <= start.getTime()) continue;
    const url = baseUrl + "/classroom/" + encodeURIComponent(room.slug) + "/session/" + encodeURIComponent(session.id);
    const label = (session.title || "").trim() || "Séance " + session.position;
    const updated = session.updated_at ? new Date(session.updated_at) : start;
    result.push({
      uid: session.id + "@vydys.com",
      summary: courseTitle + " — " + label,
      description: "Vydys Academy — séance en direct.\nAccès via votre compte Vydys (selon votre inscription) : " + url + "\nHoraire de référence : Nouakchott (UTC+0).",
      url,
      location: "En ligne — Vydys Classroom",
      start, end,
      updated: Number.isFinite(updated.getTime()) ? updated : start,
      cancelled: session.status === "cancelled",
    });
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

/* RFC 5545: fold long content lines at a maximum of 75 UTF-8 octets. */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  let out = "";
  let chunk = "";
  for (const char of line) {
    if (encoder.encode(chunk + char).length > 75 && chunk.length) {
      out += chunk + "\r\n";
      chunk = " ";
    }
    chunk += char;
  }
  return out + chunk;
}

export function buildIcs(events: VydysCalendarEvent[], calendarName = "Vydys Academy — Classrooms"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vydys Academy//Classroom Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + escapeIcs(calendarName),
    "X-WR-TIMEZONE:" + calendarTimezone,
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + escapeIcs(event.uid),
      "DTSTAMP:" + utcStamp(event.updated),
      "LAST-MODIFIED:" + utcStamp(event.updated),
      "DTSTART:" + utcStamp(event.start),
      "DTEND:" + utcStamp(event.end),
      "SUMMARY:" + escapeIcs(event.summary),
      "DESCRIPTION:" + escapeIcs(event.description),
      "LOCATION:" + escapeIcs(event.location),
      "URL:" + event.url,
      "STATUS:" + (event.cancelled ? "CANCELLED" : "CONFIRMED"),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export function downloadIcs(events: VydysCalendarEvent[], filename: string, calendarName: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([buildIcs(events, calendarName)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[^a-zA-Z0-9._-]/g, "-") + ".ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(event: VydysCalendarEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: event.summary,
    dates: utcStamp(event.start) + "/" + utcStamp(event.end),
    details: event.description,
    location: event.location,
    ctz: calendarTimezone,
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

export function outlookCalendarUrl(event: VydysCalendarEvent): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.summary,
    startdt: event.start.toISOString(),
    enddt: event.end.toISOString(),
    body: event.description,
    location: event.location,
  });
  return "https://outlook.live.com/calendar/0/deeplink/compose?" + p.toString();
}

export function publicCalendarFeedUrl(room: CalendarRoom): string {
  return baseUrl + "/api/calendrier/classroom/" + encodeURIComponent(room.slug);
}
