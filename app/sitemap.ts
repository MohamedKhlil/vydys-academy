import type { MetadataRoute } from "next";

const base="https://www.vydys.com";

export default function sitemap():MetadataRoute.Sitemap{
  const routes=[
    "",
    "/formations",
    "/classroom",
    "/formateurs",
    "/marketplace",
    "/forum",
    "/hub",
    "/practice",
    "/ai-lab",
    "/skill-engine",
    "/competences",
    "/projects",
    "/portfolio",
    "/recherche",
    "/devenir-formateur",
    "/support",
    "/conditions",
    "/confidentialite",
    "/remboursements",
    "/regles-contenu"
  ];

  return routes.map((route,index)=>({
    url:base+route,
    lastModified:new Date(),
    changeFrequency:index===0?"daily":"weekly",
    priority:index===0?1:route==="/formations"||route==="/classroom"||route==="/marketplace"?0.9:0.7
  }));
}
