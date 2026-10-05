import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { LanguageProvider } from "../components/language-provider";

export const metadata: Metadata = {\n  metadataBase: new URL("https://www.vydys.com"),
  title: {
    default: "Vydys Academy — AI, Tech & Verified Skills",
    template: "%s · Vydys Academy",
  },
  description: "International AI & technology learning platform with courses, live Classrooms, practical labs, verified skills and career tools.",
  openGraph: {
    siteName: "Vydys Academy",
    type: "website",
    locale: "en_US",
    alternateLocale: ["fr_FR", "ar_MR"],
  },
  twitter: {
    card: "summary",
    site: "@vydys",
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
        </LanguageProvider>
      </body>
    </html>
  );
}
