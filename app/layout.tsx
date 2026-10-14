import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { LanguageProvider } from "../components/language-provider";
import MobileInstallPrompt from "../components/mobile-install-prompt";
import SiteAnalyticsTracker from "../components/site-analytics-tracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vydys.com"),
  title: {
    default: "Vydys Academy — AI, Tech & Verified Skills",
    template: "%s · Vydys Academy",
  },
  description: "International AI & technology learning platform with courses, live Classrooms, practical labs, verified skills and career tools.",
  openGraph: {
    siteName: "Vydys Academy",
    type: "website",
    locale: "fr_FR",
    alternateLocale: ["en_US", "ar_MR"],
    title: "Vydys Academy — Apprenez l’IA & la Tech",
    description: "Formations, Classroom, AI Lab, Auto Learner et parcours pratiques pour développer des compétences réelles en IA et technologie.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vydys Academy — IA, Tech et compétences vérifiées"
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@vydys",
    title: "Vydys Academy — Apprenez l’IA & la Tech",
    description: "Formations, Classroom, AI Lab, Auto Learner et parcours pratiques.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=4", type: "image/x-icon" },
      { url: "/vydys-icon.svg?v=4", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.ico?v=4",
    apple: [
      { url: "/apple-touch-icon.png?v=4", sizes: "180x180", type: "image/png" }
    ],
  },
  manifest: "/manifest.webmanifest",
  applicationName: "Vydys",
  appleWebApp: {
    capable: true,
    title: "Vydys",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05070C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{__html:JSON.stringify({
            "@context":"https://schema.org",
            "@graph":[
              {
                "@type":"Organization",
                "@id":"https://www.vydys.com/#organization",
                name:"Vydys Academy",
                url:"https://www.vydys.com/",
                logo:"https://www.vydys.com/vydys-icon.svg"
              },
              {
                "@type":"WebSite",
                "@id":"https://www.vydys.com/#website",
                url:"https://www.vydys.com/",
                name:"Vydys Academy",
                publisher:{"@id":"https://www.vydys.com/#organization"},
                potentialAction:{
                  "@type":"SearchAction",
                  target:"https://www.vydys.com/recherche?q={search_term_string}",
                  "query-input":"required name=search_term_string"
                }
              }
            ]
          })}}
        />
        <LanguageProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <MobileInstallPrompt />
          <SiteAnalyticsTracker />
        </LanguageProvider>
      </body>
    </html>
  );
}
