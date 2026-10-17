import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";
import TalentsDirectory from "../../components/talents-directory";

export const revalidate=60;
export const metadata:Metadata={
  title:"Vydys Talents — Découvrez les profils et portfolios professionnels",
  description:"Découvrez les profils professionnels volontaires de la communauté Vydys : compétences, diplômes, expériences, projets et certifications, accessibles aux recruteurs.",
  alternates:{canonical:"/talents"},
  openGraph:{
    title:"Vydys Talents — Découvrez les profils professionnels",
    description:"Profils publics, parcours, diplômes et projets de talents inscrits sur Vydys.",
    url:"/talents",type:"website"
  }
};

export type PublicTalentRow={
  public_slug:string;
  display_name:string;
  headline:string|null;
  bio:string|null;
  avatar_url:string|null;
  city:string|null;
  country:string|null;
  open_to_work:boolean;
  self_reported_skills:string[];
  updated_at:string;
};

export default async function TalentsPage(){
  const {data,error}=await supabase.from("vydys_public_talent_directory")
    .select("public_slug,display_name,headline,bio,avatar_url,city,country,open_to_work,self_reported_skills,updated_at")
    .order("updated_at",{ascending:false})
    .limit(100);
  return <TalentsDirectory rows={(data||[]) as PublicTalentRow[]} unavailable={Boolean(error)}/>;
}
