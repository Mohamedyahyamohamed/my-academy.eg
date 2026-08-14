"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeClientLang, useClientLang } from "@/lib/i18n-client";

export function LanguageToggle() {
  const lang = useClientLang();
  const en = lang === "en";

  const toggle = () => {
    const next = en ? "ar" : "en";
    changeClientLang(next);
    window.location.reload();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="gap-1.5"
      title={en ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
      aria-label={en ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium">{en ? "ع" : "EN"}</span>
    </Button>
  );
}
