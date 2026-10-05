import type { Metadata } from "next";

export const metadata:Metadata={
  title:"Search",
  description:"Search courses, live Classrooms, instructors and marketplace products across Vydys.",
  alternates:{canonical:"/recherche"},
  openGraph:{
    title:"Search · Vydys Academy",
    description:"Search courses, live Classrooms, instructors and marketplace products across Vydys.",
    url:"/recherche",
    type:"website"
  },
  twitter:{
    card:"summary",
    title:"Search · Vydys Academy",
    description:"Search courses, live Classrooms, instructors and marketplace products across Vydys."
  }
};

export default function PublicSectionLayout({children}:{children:React.ReactNode}){
  return children;
}
