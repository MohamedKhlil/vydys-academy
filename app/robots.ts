import type { MetadataRoute } from "next";

export default function robots():MetadataRoute.Robots{
  return {
    rules:[
      {
        userAgent:"*",
        allow:"/",
        disallow:[
          "/admin/",
          "/dashboard/",
          "/formateur/",
          "/parametres",
          "/notifications",
          "/messages",
          "/onboarding",
          "/paiement/"
        ]
      }
    ],
    sitemap:"https://www.vydys.com/sitemap.xml",
    host:"https://www.vydys.com"
  };
}
