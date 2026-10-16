import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import PublicTrainerClient from "./formateur-client";

export const revalidate=300;
type Props={params:Promise<{slug:string}>};
const base="https://www.vydys.com";

async function fetchPublicTrainer(slug:string){
  if(!/^[a-z0-9][a-z0-9-]{0,180}$/.test(slug))return {trainer:null,courses:[] as any[],error:false};
  const {data:instructor,error}=await supabase.from("instructor_profiles")
    .select("user_id,public_slug,display_name,headline,bio,expertise,is_public")
    .eq("public_slug",slug).eq("is_public",true).maybeSingle();
  if(!instructor)return {trainer:null,courses:[] as any[],error:!!error};

  const [{data:profile},{data:courses}]=await Promise.all([
    supabase.from("public_profiles").select("full_name,username,avatar_url,bio,reputation_score,followers_count")
      .eq("user_id",instructor.user_id).maybeSingle(),
    supabase.from("courses")
      .select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,category")
      .eq("instructor_id",instructor.user_id).eq("status","published")
  ]);
  return {trainer:{...instructor,...(profile||{})},courses:courses||[],error:false};
}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {slug}=await params;
  const {trainer,error}=await fetchPublicTrainer(slug);
  if(!trainer)return {title:error?"Formateur · Vydys":"Formateur introuvable",robots:error?undefined:{index:false,follow:false}};
  const title=trainer.display_name||trainer.full_name||"Formateur Vydys";
  const description=String(trainer.headline||trainer.bio||"Découvrez ses formations et séances sur Vydys Academy.").replace(/\s+/g," ").slice(0,240);
  const url="/formateur/"+encodeURIComponent(slug);
  return {
    title,
    description,
    alternates:{canonical:url},
    openGraph:{title,description,url,type:"profile"},
    twitter:{card:"summary_large_image",title,description}
  };
}

export default async function PublicTrainerPage({params}:Props){
  const {slug}=await params;
  const {trainer,courses,error}=await fetchPublicTrainer(slug);
  if(!trainer&&!error)notFound();
  const person=trainer?{
    "@context":"https://schema.org","@type":"Person",
    name:trainer.display_name||trainer.full_name,
    url:base+"/formateur/"+encodeURIComponent(slug),
    description:String(trainer.headline||trainer.bio||"").slice(0,400)
  }:null;
  return <>
    {person&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(person).replace(/</g,"\\u003c")}} />}
    <PublicTrainerClient initialTrainer={trainer||null} initialCourses={courses}/>
  </>;
}
