"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./language-provider";

const items=[
  {href:"/formateur",icon:"▦",fr:"Dashboard",ar:"لوحة التحكم",en:"Dashboard"},
  {href:"/formateur/nouvelle-formation",icon:"+",fr:"Créer",ar:"إنشاء",en:"Create"},
  {href:"/formateur/projets",icon:"◆",fr:"Projets",ar:"المشاريع",en:"Projects"},
  {href:"/formateur/copilote",icon:"AI",fr:"Copilote",ar:"المساعد",en:"Copilot"},
  {href:"/formateur/marketing",icon:"↗",fr:"Marketing",ar:"التسويق",en:"Marketing"},
  {href:"/formateur/paiements",icon:"MRU",fr:"Paiements",ar:"الدفع",en:"Payments"},
  {href:"/formateur/abonnement",icon:"◇",fr:"Abonnement",ar:"الاشتراك",en:"Subscription"}
];

export default function InstructorWorkspaceNav(){
  const pathname=usePathname();
  const {lang,t}=useLanguage();
  return <div className="workspace-nav-shell instructor-workspace-nav"><div className="container workspace-nav-wrap">
    <div className="workspace-nav-brand"><span>V</span><div><strong>Vydys Studio</strong><small>{t({fr:"Espace Formateur",ar:"مساحة المدرب",en:"Instructor Workspace"})}</small></div></div>
    <nav className="workspace-nav-links" aria-label="Instructor navigation">
      {items.map(item=>{
        const active=item.href==="/formateur"?pathname==="/formateur":pathname.startsWith(item.href);
        const label=lang==="ar"?item.ar:lang==="en"?item.en:item.fr;
        return <Link className={active?"active":""} href={item.href} key={item.href}><span>{item.icon}</span><b>{label}</b></Link>
      })}
    </nav>
  </div></div>
}
