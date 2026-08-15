"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientLang } from "@/lib/i18n-client";

export function PrintReportButton() {
  const en = useClientLang() === "en";
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="me-2 h-4 w-4" />
      {en ? "Print or save PDF" : "طباعة أو حفظ PDF"}
    </Button>
  );
}
