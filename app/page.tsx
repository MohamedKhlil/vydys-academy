import type { Metadata } from "next";
import HomePageClient from "../components/home-page-client";
import { supabase } from "../lib/supabase";
import type { PremiumCourse } from "../components/home-page-client";

export const revalidate = 60;

export const metadata:Metadata={
  title:"Vydys Academy — Learn AI & Tech, Build and Prove Skills",
  description:"Learn AI and technology through courses, live Classrooms, practical labs, verified skills and career tools on Vydys Academy.",
  alternates:{canonical:"/"},
  openGraph:{
    title:"Vydys Academy — Learn AI & Tech, Build and Prove Skills",
    description:"Courses, live Classrooms, practical labs, verified skills and career tools.",
    url:"/",
    type:"website"
  },
  twitter:{
    card:"summary_large_image",
    title:"Vydys Academy — AI, Tech & Verified Skills",
    description:"Learn, practice, build and prove real technology skills."
  }
};

/**
 * The public front page always shows real, currently published courses with
 * their active currency prices. ISR limits API traffic while keeping pricing
 * fresh, without inventing testimonials, cohorts or enrollment numbers.
 */
export default async function HomePage(){
  const { data: published, error } = await supabase.from("courses")
    .select("id,instructor_id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_amount,base_currency,registration_deadline")
    .eq("status","published")
    .order("published_at",{ascending:false})
    .limit(6);

  if(error)console.warn("Vydys homepage: unable to fetch published courses.");
  const rows=published||[];
  const ids=rows.map(course=>course.id);
  const [{data:prices},{data:modules},{data:teachers}]=ids.length
    ? await Promise.all([
        supabase.from("course_prices").select("course_id,currency,amount")
          .in("course_id",ids).eq("is_active",true),
        supabase.from("course_modules")
          .select("course_id,title_fr,title_ar,title_en,position").in("course_id",ids)
          .order("position",{ascending:true}),
        supabase.from("instructor_profiles")
          .select("user_id,display_name,public_slug")
          .in("user_id",Array.from(new Set(rows.map(course=>course.instructor_id).filter(Boolean))))
          .eq("is_public",true)
      ])
    : [{data:[]},{data:[]},{data:[]}];

  const activePrices=new Map((prices||[]).map(price=>[
    price.course_id+":"+String(price.currency||"").toUpperCase(),
    Number(price.amount)
  ]));
  const modulesCount=new Map<string,number>();
  const previews=new Map<string,Array<{fr:string;ar:string|null;en:string|null}>>();
  for(const module of modules||[]){
    modulesCount.set(module.course_id,(modulesCount.get(module.course_id)||0)+1);
    if((previews.get(module.course_id)||[]).length<3){
      const list=previews.get(module.course_id)||[];
      list.push({fr:module.title_fr||"",ar:module.title_ar||null,en:module.title_en||null});
      previews.set(module.course_id,list);
    }
  }
  const teacherById=new Map((teachers||[]).map(teacher=>[teacher.user_id,teacher]));

  const featured:PremiumCourse[]=rows.map(course=>{
    const currency=String(course.base_currency||"MRU").toUpperCase();
    return {
      id:course.id,slug:course.slug,
      title_fr:course.title_fr,title_ar:course.title_ar,title_en:course.title_en,
      description_fr:course.description_fr,description_ar:course.description_ar,
      description_en:course.description_en,
      currency,
      price:activePrices.get(course.id+":"+currency) ?? Number(course.base_price_amount||0),
      modules:modulesCount.get(course.id)||0,
      registration_deadline:course.registration_deadline,
      instructor_name:teacherById.get(course.instructor_id)?.display_name||null,
      instructor_slug:teacherById.get(course.instructor_id)?.public_slug||null,
      module_preview:previews.get(course.id)||[]
    };
  }).slice(0,3);

  return <HomePageClient featuredCourses={featured}/>;
}
