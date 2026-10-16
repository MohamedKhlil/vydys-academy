import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";
import FormationsClient from "./formations-client";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Formations IA et technologies — Catalogue",
  description: "Parcourez les formations Vydys en intelligence artificielle, marketing digital et technologie : programmes, modules, formateurs, prix et séances live.",
  alternates: { canonical: "/formations" },
  openGraph: { title: "Formations IA et technologie · Vydys", url: "/formations", type: "website" }
};

/**
 * The public catalog is populated on the server for fast first paint and SEO.
 * Login, favorites, filters and user currency remain in the client component.
 */
export default async function FormationsPage(){
  const [{data:courses,error:courseError},{data:modules,error:moduleError}]=await Promise.all([
    supabase.from("courses")
      .select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,base_price_amount,base_currency,category,instructor_id,cover_url,registration_deadline")
      .eq("status","published"),
    supabase.from("course_modules")
      .select("id,course_id,title_fr,title_ar,title_en,position")
      .order("position")
  ]);
  if(courseError || moduleError) console.warn("Vydys catalog: public initial data unavailable; the browser will retry.");
  return <FormationsClient initialCourses={courses||[]} initialModules={modules||[]} />;
}
