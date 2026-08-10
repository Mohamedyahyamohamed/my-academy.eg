"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Upload, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { importStudentsAction, type ImportRow } from "@/app/actions/import";

const HEADER = "first_name,last_name,phone,grade,school,parent_name,parent_phone";
const EXAMPLE = "first_name,last_name,phone,grade,school,parent_name,parent_phone\nأحمد,محمود,01012345678,الصف الثالث,النور,سارة محمود,01012345678\nمريم,علي,01098765432,الصف الثاني,السلام,فاطمة علي,01098765432";

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  let start = 0;
  if (lines[0].toLowerCase().includes("first_name")) start = 1;
  const rows: ImportRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const c = lines[i].split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    rows.push({ first_name: c[0]??"", last_name: c[1]??"", phone: c[2]??"", grade: c[3]??"", school: c[4]??"", parent_name: c[5]??"", parent_phone: c[6]??"" });
  }
  return rows;
}

export function ImportStudents() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<null | { created: number; errors: string[] }>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setText(await file.text());
  };
  const downloadTemplate = () => {
    const blob = new Blob([EXAMPLE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "students-template.csv"; a.click();
  };
  const doImport = async () => {
    const rows = parseCSV(text);
    if (!rows.length) { toast.error("مفيش بيانات."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await importStudentsAction(rows);
      if (res.ok === false) toast.error(res.error ?? "فشل");
      else { setResult({ created: res.created ?? 0, errors: res.errors ?? [] }); toast.success(`تم استيراد ${res.created} طالب 🎉`); router.refresh(); }
    } catch { toast.error("خطأ"); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileSpreadsheet className="h-4 w-4" /> {HEADER}</div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Upload className="mr-2 h-4 w-4" /> نزّل قالب</Button>
        </div>
        <div className="space-y-1.5">
          <Label>ارفع ملف CSV</Label>
          <input type="file" accept=".csv" onChange={onFile} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground" />
          <p className="text-xs text-muted-foreground">Excel: File → Save As → CSV</p>
        </div>
        <div className="space-y-1.5">
          <Label>أو الصق هنا</Label>
          <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} className="font-mono text-xs" dir="ltr" />
        </div>
        <div className="flex gap-2">
          <Button onClick={doImport} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} استيراد</Button>
          <Button variant="outline" asChild><Link href="/students"><ArrowLeft className="mr-2 h-4 w-4" /> رجوع</Link></Button>
        </div>
      </CardContent></Card>
      {result && (
        <Card><CardContent className="p-5 text-sm">
          <p className="font-semibold text-emerald-600">✅ تم استيراد {result.created} طالب</p>
          {result.errors.length > 0 && <p className="mt-1 text-xs text-destructive">صفوف مرفوضة: {result.errors.join("، ")}</p>}
        </CardContent></Card>
      )}
    </div>
  );
}