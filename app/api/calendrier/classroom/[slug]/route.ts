import { supabase } from "../../../../../lib/supabase";
import { buildClassroomCalendarEvents, buildIcs } from "../../../../../lib/calendar-events";

// Public iCalendar subscription feed for published, publicly listed cohorts.
// It includes session times and titles only, never attendee information or
// secret joining tokens. Private Classrooms do not expose a feed.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9][a-z0-9-]{0,150}$/.test(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const { data: room, error: roomError } = await supabase
    .from("classrooms")
    .select("id,slug,title_fr,title_ar,title_en,status,visibility")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();

  if (roomError) return new Response("Calendar unavailable", { status: 503 });
  if (!room) return new Response("Not found", { status: 404 });

  const { data: sessions, error: sessionsError } = await supabase
    .from("classroom_sessions")
    .select("id,position,title,starts_at,ends_at,status,updated_at")
    .eq("classroom_id", room.id)
    .order("position", { ascending: true })
    .limit(200);

  if (sessionsError) return new Response("Calendar unavailable", { status: 503 });

  const ics = buildIcs(
    buildClassroomCalendarEvents(room, sessions || []),
    "Vydys Academy — " + room.title_fr
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="vydys-' + room.slug + '.ics"',
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
