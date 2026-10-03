import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { LanguageProvider } from "../components/language-provider";

export const metadata: Metadata = {
  title: "Vydys Academy — Marketing Digital & IA",
  description: "Online training in digital marketing and artificial intelligence with live classrooms.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
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
