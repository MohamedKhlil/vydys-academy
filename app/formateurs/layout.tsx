import type { Metadata } from "next";

export const metadata:Metadata={
  title:"Instructors",
  description:"Discover active Vydys Academy instructors and technology experts.",
  alternates:{canonical:"/formateurs"},
  openGraph:{
    title:"Instructors · Vydys Academy",
    description:"Discover active Vydys Academy instructors and technology experts.",
    url:"/formateurs",
    type:"website"
  },
  twitter:{
    card:"summary",
    title:"Instructors · Vydys Academy",
    description:"Discover active Vydys Academy instructors and technology experts."
  }
};

export default function PublicSectionLayout({children}:{children:React.ReactNode}){
  return children;
}
