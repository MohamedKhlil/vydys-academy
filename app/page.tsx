import type { Metadata } from "next";
import HomePageClient from "../components/home-page-client";

export const metadata:Metadata={
  title:"Vydys Academy — Learn AI & Tech, Build and Prove Skills",
  description:"Learn AI and technology through courses, live Classrooms, practical labs, verified skills and career tools on Vydys Academy.",
  alternates:{canonical:"/"},
  openGraph:{
    title:"Vydys Academy — Learn AI & Tech, Build and Prove Skills",
    description:"Courses, live Classrooms, practical labs, verified skills and career tools.",
    url:"/",
    type:"website"
  },
  twitter:{
    card:"summary",
    title:"Vydys Academy — AI, Tech & Verified Skills",
    description:"Learn, practice, build and prove real technology skills."
  }
};

export default function HomePage(){
  return <HomePageClient/>;
}
