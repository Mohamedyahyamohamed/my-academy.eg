"use client";

import * as React from "react";
import type { Lang } from "@/lib/i18n";

export const LANGUAGE_EVENT = "myacademy:language-change";

export function readClientLang(): Lang {
  if (typeof window === "undefined") return "ar";
  // The cookie is the server-side source of truth. Prefer it over stale
  // localStorage so client components cannot render in a different language
  // from the page that was just loaded.
  const cookie = document.cookie.match(/(?:^|; )ma_lang=(en|ar)(?:;|$)/)?.[1];
  if (cookie === "en" || cookie === "ar") return cookie;
  const local = localStorage.getItem("ma_lang");
  return local === "en" ? "en" : "ar";
}

export function useClientLang(): Lang {
  const [lang, setLang] = React.useState<Lang>(() => readClientLang());
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
