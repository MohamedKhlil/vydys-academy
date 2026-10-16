import type { MetadataRoute } from "next";
import { supabase } from "../lib/supabase";

const base = "https://www.vydys.com";
export const revalidate = 3600;

/**
 * All public content is discoverable without exposing draft, private,
 * restricted, or enrollment-only pages to search engines.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "", "/formations", "/classroom", "/formateurs", "/marketplace",
    "/forum", "/hub", "/practice", "/ai-lab", "/skill-engine",
    "/competences", "/projects", "/portfolio", "/recherche",
    "/devenir-formateur", "/support", "/conditions", "/confidentialite",
    "/remboursements", "/regles-contenu"
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path, i) => ({
    url: base + path,
    changeFrequency: i === 0 ? "daily" : "weekly",
    priority: i === 0 ? 1 : ["/formations", "/classroom", "/formateurs"].includes(path) ? .9 : .6
  }));

  try {
    const [courses, instructors, classrooms] = await Promise.all([
      supabase.from("courses").select("slug,published_at,created_at").eq("status", "published"),
      supabase.from("instructor_profiles").select("public_slug,updated_at,created_at").eq("is_public", true),
      supabase.from("classrooms").select("slug,updated_at,created_at").eq("status", "published").eq("visibility", "public").is("course_id", null)
    ]);
    const listed = new Set<string>();
    const dynamicEntries: MetadataRoute.Sitemap = [];
    const add = (path: string, modified?: string | null) => {
      if (listed.has(path)) return;
      listed.add(path);
      const date = modified ? new Date(modified) : undefined;
      dynamicEntries.push({
        url: base + path,
        ...(date && Number.isFinite(date.getTime()) ? { lastModified: date } : {}),
        changeFrequency: "weekly",
        priority: .8
      });
    };
    if (!courses.error) for (const course of courses.data ?? []) {
      if (course.slug) add("/formation/" + encodeURIComponent(course.slug), course.published_at || course.created_at);
    }
    if (!instructors.error) for (const trainer of instructors.data ?? []) {
      if (trainer.public_slug) add("/formateur/" + encodeURIComponent(trainer.public_slug), trainer.updated_at || trainer.created_at);
    }
    if (!classrooms.error) for (const room of classrooms.data ?? []) {
      if (room.slug) add("/classroom/" + encodeURIComponent(room.slug), room.updated_at || room.created_at);
    }
    if (courses.error || instructors.error || classrooms.error) {
      console.warn("Vydys sitemap: partial database response; retry on next revalidation.");
    }
    return [...staticEntries, ...dynamicEntries];
  } catch (error) {
    console.error("Vydys sitemap: public source temporarily unavailable.", error);
    return staticEntries;
  }
}
