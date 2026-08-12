"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportCSVProps {
  filename: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string }[];
  label?: string;
}

/**
 * زر تصدير البيانات إلى ملف CSV.
 * - يضيف BOM (UTF-8) لكي تظهر العربية بشكل صحيح في Excel.
 * - استخدم الفاصلة كفاصل (مع اقتباس الحقول التي تحتوي فواصل).
 */
export function ExportCSV({ filename, rows, columns, label = "تصدير Excel" }: ExportCSVProps) {
  function handleExport() {
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = columns.map((c) => escape(c.label)).join(",");
    const body = rows
      .map((r) => columns.map((c) => escape(r[c.key])).join(","))
      .join("\n");
    // \uFEFF = BOM لضمان ظهور العربية في Excel
    const csv = "\uFEFF" + header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
