"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./language-provider";

const items=[
  {href:"/admin",icon:"▦",fr:"Vue d’ensemble",ar:"نظرة عامة",en:"Overview"},
  {href:"/admin/formateurs",icon:"◎",fr:"Formateurs",ar:"المدربون",en:"Instructors"},
  {href:"/admin/formations",icon:"▤",fr:"Formations",ar:"الدورات",en:"Courses"},
  {href:"/admin/classrooms",icon:"LIVE",fr:"Classrooms",ar:"الفصول المباشرة",en:"Classrooms"},
  {href:"/admin/abonnements",icon:"◇",fr:"Abonnements",ar:"الاشتراكات",en:"Subscriptions"},
  {href:"/admin/analytics",icon:"↗",fr:"Analytics",ar:"التحليلات",en:"Analytics"},
  {href:"/admin/support",icon:"?",fr:"Support",ar:"الدعم",en:"Support"},
  {href:"/admin/moderation",icon:"◉",fr:"Modération",ar:"الإشراف",en:"Moderation"},
  {href:"/admin/audit",icon:"≡",fr:"Audit",ar:"التدقيق",en:"Audit"},
  {href:"/admin/ai",icon:"AI",fr:"Vydys AI",ar:"Vydys AI",en:"Vydys AI"},
  {href:"/admin/tarifs",icon:"$",fr:"Tarifs",ar:"الأسعار",en:"Pricing"},
  {href:"/admin/export",icon:"↓",fr:"Exports",ar:"التقارير",en:"Exports"}
];

export default function AdminWorkspaceNav(){
  const pathname=usePathname();
  const {lang,t}=useLanguage();
  return <div className="workspace-nav-shell admin-workspace-nav"><div className="container workspace-nav-wrap">
    <div className="workspace-nav-brand"><img src="/vydys-icon.svg" alt="" className="workspace-brand-icon"/><div><strong>Vydys Control</strong><small>{t({fr:"Direction & Administration",ar:"الإدارة والتحكم",en:"Management & Administration"})}</small></div></div>
    <nav className="workspace-nav-links" aria-label="Admin navigation">
      {items.map(item=>{
        const active=item.href==="/admin"?pathname==="/admin":pathname.startsWith(item.href);
        const label=lang==="ar"?item.ar:lang==="en"?item.en:item.fr;
        return <Link className={active?"active":""} href={item.href} key={item.href}><span>{item.icon}</span><b>{label}</b></Link>
      })}
    </nav>
  </div></div>
}
