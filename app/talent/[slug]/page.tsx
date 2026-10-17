import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import TalentProfileClient from "../../../components/talent-profile-client";

export const revalidate=120;
type Props={params:Promise<{slug:string}>};

const fields="user_id,public_slug,display_name,headline,bio,avatar_url,github_url,linkedin_url,website_url,city,country,open_to_work,discoverable,self_reported_skills,is_public";

async function getProfile(slug:string){
  if(!/^[a-z0-9][a-z0-9-]{0,150}$/.test(slug))return null;
  const {data,error}=await supabase.from("student_profiles").select(fields)
    .eq("public_slug",slug).eq("is_public",true).maybeSingle();
  if(error)return null;
  return data;
}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {slug}=await params;
  const person=await getProfile(slug);
  if(!person)return {title:"Talent introuvable · Vydys",robots:{index:false,follow:false}};
  const name=person.display_name||"Vydys Talent";
  const title=name+" — CV et portfolio";
  const description=String(person.headline||person.bio||"Découvrez le CV, les projets et compétences de ce profil Vydys.")
    .replace(/\s+/g," ").slice(0,215);
  const canonical="/talent/"+encodeURIComponent(person.public_slug);
  // Shared portfolios can be visited via their link. Search engines only
  // index them when the owner opted in to discoverability.
  return {
    title,description,alternates:{canonical},
    robots:{index:person.discoverable===true,follow:person.discoverable===true},
    openGraph:{title,description,url:canonical,type:"profile"},
    twitter:{card:"summary",title,description}
  };
}

export default async function TalentPage({params}:Props){
  const {slug}=await params;
  const profile=await getProfile(slug);
  if(!profile)notFound();

  const id=profile.user_id;
  const [skillData,projectData,certData,educationData,experienceData]=await Promise.all([
    supabase.from("user_skills")
      .select("level,verification_status,skills:skill_id(name_fr,name_ar,name_en,category)")
      .eq("user_id",id).eq("verification_status","verified"),
    supabase.from("student_projects")
      .select("id,title,summary,tech_stack,github_url,demo_url")
      .eq("user_id",id).eq("status","approved").eq("is_public",true)
      .order("reviewed_at",{ascending:false}).limit(12),
    supabase.from("certificates")
      .select("certificate_code,issued_at,courses:course_id(title_fr,title_ar,title_en)")
      .eq("user_id",id).order("issued_at",{ascending:false}).limit(20),
    supabase.from("student_education")
      .select("id,institution,degree,field_of_study,started_on,ended_on,description")
      .eq("user_id",id).eq("is_public",true).order("started_on",{ascending:false}).limit(30),
    supabase.from("student_experience")
      .select("id,job_title,organization,employment_type,started_on,ended_on,description")
      .eq("user_id",id).eq("is_public",true).order("started_on",{ascending:false}).limit(30)
  ]);

  const safeProfile={
    public_slug:profile.public_slug,
    display_name:profile.display_name,
    headline:profile.headline,
    bio:profile.bio,
    avatar_url:profile.avatar_url,
    github_url:profile.github_url,
    linkedin_url:profile.linkedin_url,
    website_url:profile.website_url,
    city:profile.city,
    country:profile.country,
    open_to_work:profile.open_to_work===true,
    discoverable:profile.discoverable===true,
    self_reported_skills:profile.self_reported_skills||[]
  };

  return <TalentProfileClient
    profile={safeProfile}
    skills={(skillData.data||[]) as any}
    projects={(projectData.data||[]) as any}
    certs={(certData.data||[]) as any}
    education={(educationData.data||[]) as any}
    experience={(experienceData.data||[]) as any}
  />;
}
