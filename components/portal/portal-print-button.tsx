"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortalPrintButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => window.print()}
      className="bg-white/15 text-white hover:bg-white/25 hover:text-white print:hidden"
    >
      <Printer className="me-2 h-4 w-4" aria-hidden="true" />
      طباعة / حفظ PDF
    </Button>
  );
}
