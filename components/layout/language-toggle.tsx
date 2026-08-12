"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const [lang, setLang] = React.useState<"ar" | "en">("ar");

  React.useEffect(() => {
    const stored = localStorage.getItem("ma_lang") || "ar";
    setLang(stored as "ar" | "en");
  }, []);

  const toggle = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    localStorage.setItem("ma_lang", next);
    document.cookie = `ma_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    // reload para reflejar cambios del servidor
    window.location.reload();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="gap-1.5"
      title={lang === "ar" ? "Switch to English" : "تبديل للعربية"}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium">{lang === "ar" ? "EN" : "ع"}</span>
    </Button>
  );
}
