import type { Metadata } from "next";

export const metadata:Metadata={
  title:"Marketplace",
  description:"Discover digital products and resources sold by the Vydys community.",
  alternates:{canonical:"/marketplace"},
  openGraph:{
    title:"Marketplace · Vydys Academy",
    description:"Discover digital products and resources sold by the Vydys community.",
    url:"/marketplace",
    type:"website"
  },
  twitter:{
    card:"summary",
    title:"Marketplace · Vydys Academy",
    description:"Discover digital products and resources sold by the Vydys community."
  }
};

export default function PublicSectionLayout({children}:{children:React.ReactNode}){
  return children;
}
