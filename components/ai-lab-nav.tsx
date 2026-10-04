"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./language-provider";

export function AILabNav(){
  const pathname=usePathname();
  const {t}=useLanguage();
  const items=[
    {href:"/ai-lab",icon:"✦",title:"AI Lab",subtitle:t({fr:"Agents & BYOK",ar:"الوكلاء و BYOK",en:"Agents & BYOK"})},
    {href:"/ai-lab/knowledge",icon:"◆",title:t({fr:"Knowledge Base",ar:"قاعدة المعرفة",en:"Knowledge Base"}),subtitle:"RAG · Documents"},
    {href:"/ai-lab/code",icon:"</>",title:"Code Lab",subtitle:"Python · JavaScript"},
    {href:"/ai-tutor",icon:"AI",title:"AI Tutor",subtitle:t({fr:"Tuteur Vydys",ar:"مدرس Vydys",en:"Vydys Tutor"})}
  ];
  return <nav className="lab-suite-nav" aria-label="Vydys AI Lab">
    <div className="lab-suite-brand"><span className="lab-suite-mark">V</span><div><strong>Vydys AI Lab <b>2</b></strong><small>{t({fr:"Build · Test · Learn",ar:"ابنِ · اختبر · تعلم",en:"Build · Test · Learn"})}</small></div></div>
    <div className="lab-suite-links">{items.map(item=>{
      const active=item.href==="/ai-lab"?pathname===item.href:pathname.startsWith(item.href);
      return <Link className={active?"lab-suite-link active":"lab-suite-link"} href={item.href} key={item.href}>
        <span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.subtitle}</small></div>
      </Link>
    })}</div>
  </nav>
}
