"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

export type Language = "fr" | "ar" | "en";
export type Localized = { fr: string; ar: string; en: string };

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (value: Localized) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => undefined,
  t: (value) => value.en,
});

function detectSystemLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const values=[...(navigator.languages||[]),navigator.language].filter(Boolean).map(v=>String(v).toLowerCase());
  if(values.some(v=>v.startsWith("ar"))) return "ar";
  if(values.some(v=>v.startsWith("fr"))) return "fr";
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const hydrated = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("vydys-language") as Language | null;
    const resolved = saved === "fr" || saved === "ar" || saved === "en" ? saved : detectSystemLanguage();
    setLangState(resolved);
    document.documentElement.lang = resolved;
    document.documentElement.dir = resolved === "ar" ? "rtl" : "ltr";
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if(!hydrated.current)return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  function setLang(next:Language){
    setLangState(next);
    if(typeof window!=="undefined"){
      window.localStorage.setItem("vydys-language",next);
      window.localStorage.setItem("vydys-language-source","manual");
    }
  }

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
