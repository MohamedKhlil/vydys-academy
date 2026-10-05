import type { Metadata } from "next";

export const metadata:Metadata={
  title:"Courses & Training",
  description:"Browse practical AI and technology courses on Vydys Academy.",
  alternates:{canonical:"/formations"},
  openGraph:{
    title:"Courses & Training · Vydys Academy",
    description:"Browse practical AI and technology courses on Vydys Academy.",
    url:"/formations",
    type:"website"
  },
  twitter:{
    card:"summary",
    title:"Courses & Training · Vydys Academy",
    description:"Browse practical AI and technology courses on Vydys Academy."
  }
};

export default function PublicSectionLayout({children}:{children:React.ReactNode}){
  return children;
}
