import type { MetadataRoute } from "next";

/**
 * Do not block public instructor profile URLs: /formateur/[public_slug].
 * The private instructor studio uses explicit prefixes below.
 * Robots directives do not replace auth or row-level security.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/apprendre/",
        "/formateur$",
        "/formateur/classrooms",
        "/formateur/formation/",
        "/formateur/paiements",
        "/formateur/copilote",
        "/formateur/marketing",
        "/formateur/nouvelle-formation",
        "/formateur/projets",
        "/formateur/parametres",
        "/formateur/abonnements",
        "/api/",
        "/connexion",
        "/parametres",
        "/notifications",
        "/messages",
        "/onboarding",
        "/paiement"
      ]
    }],
    sitemap: "https://www.vydys.com/sitemap.xml",
    host: "https://www.vydys.com"
  };
}
