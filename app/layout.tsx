import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { LanguageProvider } from "../components/language-provider";

export const metadata: Metadata = {
  title: {
    default: "Vydys Academy — AI, Tech & Verified Skills",
    template: "%s · Vydys Academy",
  },
  description: "International AI & technology learning platform with courses, live Classrooms, practical labs, verified skills and career tools.",
  icons: {
    icon: "/vydys-icon.svg",
    shortcut: "/vydys-icon.svg",
    apple: "/vydys-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#05070C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
