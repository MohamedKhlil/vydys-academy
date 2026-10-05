import type { Metadata } from "next";

export const metadata:Metadata={
  title:"Community Forum",
  description:"Join the Vydys community to discuss technology, learning and projects.",
  alternates:{canonical:"/forum"},
  openGraph:{
    title:"Community Forum · Vydys Academy",
    description:"Join the Vydys community to discuss technology, learning and projects.",
    url:"/forum",
    type:"website"
  },
  twitter:{
    card:"summary",
    title:"Community Forum · Vydys Academy",
    description:"Join the Vydys community to discuss technology, learning and projects."
  }
};

export default function PublicSectionLayout({children}:{children:React.ReactNode}){
  return children;
}
