import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import FormationDetailClient from "./formation-client";

export const revalidate = 300;
type Props={params:Promise<{slug:string}>};
const origin="https://www.vydys.com";

async function getPublicCourse(slug:string){
  if(!/^[a-z0-9][a-z0-9-]{0,200}$/.test(slug))return {data:null,error:null};
  return supabase.from("courses")
    .select("id,slug,title_fr,title_ar,title_en,description_fr,description_ar,description_en,base_price_mru,base_price_amount,base_currency,category,instructor_id,registration_deadline,cover_url,status")
    .eq("slug",slug).eq("status","published").maybeSingle();
}

function cleanDescription(value?:string|null){
  return (value||"Découvrez cette formation professionnelle sur Vydys Academy.").replace(/\s+/g," ").trim().slice(0,240);
}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {slug}=await params;
  const {data:c,error}=await getPublicCourse(slug);
  if(!c) return {
    title:error?"Formation · Vydys Academy":"Formation introuvable",
    robots: error?undefined:{index:false,follow:false}
  };
  const name=c.title_fr||c.title_en||"Formation Vydys";
  const description=cleanDescription(c.description_fr||c.description_en);
  const url="/formation/"+encodeURIComponent(c.slug);
  const cover=c.cover_url&&(/^(https:\/\/|\/)/.test(c.cover_url))?c.cover_url:"/opengraph-image";
  return {
    title:name,
    description,
    alternates:{canonical:url},
    openGraph:{title:name,description,url,type:"website",images:[cover]},
    twitter:{card:"summary_large_image",title:name,description,images:[cover]}
  };
}

export default async function FormationPage({params}:Props){
  const {slug}=await params;
  const {data:course,error}=await getPublicCourse(slug);
  if(!course&&!error)notFound();
  const {data:courseModules}=course
    ? await supabase.from("course_modules")
        .select("id,title_fr,title_ar,title_en,position")
        .eq("course_id",course.id).order("position")
    : {data:[]};

  const jsonLd=course?{
    "@context":"https://schema.org",
    "@type":"Course",
    name:course.title_fr||course.title_en,
    description:cleanDescription(course.description_fr||course.description_en),
    url:origin+"/formation/"+encodeURIComponent(course.slug),
    provider:{"@type":"Organization",name:"Vydys Academy",url:origin}
  }:null;

  return <>
    {jsonLd&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}} />}
    <FormationDetailClient initialCourse={course||null} initialModules={courseModules||[]}/>
  </>;
}
