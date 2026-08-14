"use client";

import * as React from "react";
import type { Lang } from "@/lib/i18n";

export const LANGUAGE_EVENT = "myacademy:language-change";

export function readClientLang(): Lang {
  if (typeof window === "undefined") return "ar";
  return localStorage.getItem("ma_lang") === "en" ? "en" : "ar";
}

export function useClientLang(): Lang {
  const [lang, setLang] = React.useState<Lang>("ar");
  React.useEffect(() => {
    const sync = () => setLang(readClientLang());
    sync();
    window.addEventListener(LANGUAGE_EVENT, sync);
    return () => window.removeEventListener(LANGUAGE_EVENT, sync);
  }, []);
  return lang;
}

export function changeClientLang(lang: Lang) {
  localStorage.setItem("ma_lang", lang);
  document.cookie = `ma_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
}
