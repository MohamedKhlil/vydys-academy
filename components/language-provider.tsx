"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "fr" | "ar" | "en";
export type Localized = { fr: string; ar: string; en: string };

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (value: Localized) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "fr",
  setLang: () => undefined,
  t: (value) => value.fr,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("fr");

  useEffect(() => {
    const saved = window.localStorage.getItem("vydys-language") as Language | null;
    if (saved === "fr" || saved === "ar" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("vydys-language", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (copy: Localized) => copy[lang],
    }),
    [lang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
