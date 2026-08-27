"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientLang } from "@/lib/i18n-client";

interface ExportExcelProps {
  /** One of the server-side export types: attendance | payments | reports. */
  type: "attendance" | "payments" | "reports";
  label?: string;
}

/**
 * زر تصدير البيانات إلى ملف Excel (xlsx) عبر المسار السيرفري /api/export/xlsx.
 * المسار محصور بالأكاديمية (academy-scoped) ويعمل في وضع العرض التجريبي والإنتاج.
 */
export function ExportExcel({ type, label }: ExportExcelProps) {
  const en = useClientLang() === "en";
  const resolvedLabel = label ?? (en ? "Export Excel" : "تصدير Excel");

  function handleExport() {
    const url = `/api/export/xlsx?type=${encodeURIComponent(type)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="me-2 h-4 w-4" /> {resolvedLabel}
    </Button>
  );
}
