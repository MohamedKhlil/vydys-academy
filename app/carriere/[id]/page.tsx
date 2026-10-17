import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import CareerApplyForm from "../../../components/career-apply-form";
export const revalidate=60;
type Props={params:Promise<{id:string}>};
const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

async function getJob(id:string){
 if(!uuidPattern.test(id))return null;
 const {data,error}=await supabase.from("career_jobs")
   .select("id,title,description,required_skills,city,country,remote_allowed,employment_type,created_at,expires_at,career_companies:employer_user_id(company_name,website,country)")
   .eq("id",id).eq("status","published").maybeSingle();
 return error?null:data;
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id}=await params;const job=await getJob(id);
 if(!job)return {title:"Offre introuvable — Vydys Career Connect",robots:{index:false}};
 return {
  title:job.title+" — Vydys Career Connect",
  description:job.description.replace(/\s+/g," ").slice(0,175),
  alternates:{canonical:"/carriere/"+id},
  openGraph:{title:job.title,description:job.description.replace(/\s+/g," ").slice(0,175),type:"article",url:"/carriere/"+id}
 };
}
export default async function JobDetail({params}:Props){
 const {id}=await params;const job=await getJob(id);if(!job)notFound();
 const company=Array.isArray(job.career_companies)?job.career_companies[0]:job.career_companies;
 const jsonld={
  "@context":"https://schema.org","@type":"JobPosting",
  title:job.title,description:job.description,datePosted:job.created_at,
  ...(job.expires_at?{validThrough:job.expires_at}:{}),
  hiringOrganization:{"@type":"Organization",name:company?.company_name||"Employer"},
  ...(job.country?{jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",addressLocality:job.city||undefined,addressCountry:job.country}}}:{}),
  ...(job.remote_allowed?{jobLocationType:"TELECOMMUTE"}:{})
 };
 return <div className="career-public career-detail-shell">
  <div className="container career-detail">
    <a href="/carriere" className="career-back">← Vydys Career Connect</a>
    <div className="career-detail-grid">
      <article className="panel career-detail-main">
        <span className="eyebrow">VYDYS CAREER CONNECT</span>
        <h1>{job.title}</h1>
        <p className="career-detail-company">{company?.company_name||"Vydys Employer"} · {[job.city,job.country].filter(Boolean).join(", ")}</p>
        <div className="career-tags"><span>{job.employment_type.replaceAll("_"," ")}</span>{job.remote_allowed&&<span>Remote possible</span>}</div>
        <h2>About this opportunity</h2>
        <p className="career-job-description">{job.description}</p>
        {(job.required_skills||[]).length>0&&<><h2>Relevant skills</h2>
        <div className="career-skills">{job.required_skills.map((s:string)=><span key={s}>{s}</span>)}</div></>}
      </article>
      <aside className="panel career-application-aside">
        <CareerApplyForm jobId={job.id} jobTitle={job.title}/>
      </aside>
    </div>
  </div>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonld).replace(/</g,"\\u003c")}}/>
 </div>;
}
