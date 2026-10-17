import type { Metadata } from "next";
import { supabase } from "../../lib/supabase";
import CareerJobBoard from "../../components/career-job-board";

export const revalidate=60;
export const metadata:Metadata={
 title:"Offres d'emploi, stages et missions — Vydys Career Connect",
 description:"Découvrez les offres d'emploi, stages et missions proposées par des entreprises validées sur Vydys. Candidatez avec votre profil professionnel.",
 alternates:{canonical:"/carriere"},
 openGraph:{title:"Vydys Career Connect — Offres et stages",url:"/carriere",type:"website"}
};
export type CareerListing={
 id:string;title:string;description:string;required_skills:string[];
 city:string|null;country:string|null;remote_allowed:boolean;
 employment_type:string;created_at:string;expires_at:string|null;
 career_companies:{company_name:string;country:string|null}|null
};
export default async function CareerPage(){
 const {data,error}=await supabase.from("career_jobs")
  .select("id,title,description,required_skills,city,country,remote_allowed,employment_type,created_at,expires_at,career_companies:employer_user_id(company_name,country)")
  .eq("status","published").order("created_at",{ascending:false}).limit(100);
 return <CareerJobBoard jobs={(data||[]) as CareerListing[]} unavailable={Boolean(error)}/>;
}
