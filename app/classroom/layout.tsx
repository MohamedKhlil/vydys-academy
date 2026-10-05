import type { Metadata } from "next";

export const metadata:Metadata={
  title:"Live Classrooms",
  description:"Join live technology cohorts with schedules, assignments and learning resources.",
  alternates:{canonical:"/classroom"},
  openGraph:{
    title:"Live Classrooms · Vydys Academy",
    description:"Join live technology cohorts with schedules, assignments and learning resources.",
    url:"/classroom",
    type:"website"
  },
  twitter:{
    card:"summary",
    title:"Live Classrooms · Vydys Academy",
    description:"Join live technology cohorts with schedules, assignments and learning resources."
  }
};

export default function PublicSectionLayout({children}:{children:React.ReactNode}){
  return children;
}
