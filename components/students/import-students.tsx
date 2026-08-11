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

const HEADER =
  "first_name,last_name,phone,grade,school,parent_name,parent_phone";
const EXAMPLE =
  "first_name,last_name,phone,grade,school,parent_name,parent_phone\nأحمد,محمود,01012345678,الصف الثالث,النور,سارة محمود,01012345678\nمريم,علي,01098765432,الصف الثاني,السلام,فاطمة علي,01098765432";

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  // شيل صف العناوين لو موجود
  let start = 0;
  // كشف الفاصل: بعض نسخ Excel (عربي) بتحفظ CSV بفاصلة منقوطة ;
  const detectDelim = (line: string) =>
    (line.match(/;/g) || []).length > (line.match(/,/g) || []).length ? ";" : ",";
  if (lines[0].toLowerCase().includes("first_name")) start = 1;

  const rows: ImportRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const delim = detectDelim(lines[i]);
    const cells = lines[i].split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    rows.push({
      first_name: cells[0] ?? "",
      last_name: cells[1] ?? "",
      phone: cells[2] ?? "",
      grade: cells[3] ?? "",
      school: cells[4] ?? "",
      parent_name: cells[5] ?? "",
      parent_phone: cells[6] ?? "",
    });
  }
  return rows;
}

export function ImportStudents() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<null | { created: number; errors: string[] }>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
  };

  const downloadTemplate = () => {
    const blob = new Blob([EXAMPLE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async () => {
    const rows = parseCSV(text);
    if (rows.length === 0) {
      toast.error("مفيش بيانات. الصق الطلاب أو ارفع ملف.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await importStudentsAction(rows);
      if (res.ok === false) {
        toast.error(res.error ?? "فشل الاستيراد");
      } else {
        setResult({ created: res.created ?? 0, errors: res.errors ?? [] });
        toast.success(`تم استيراد ${res.created} طالب 🎉`);
        router.refresh();
      }
    } catch {
      toast.error("حصل خطأ أثناء الاستيراد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              الأعمدة: {HEADER}
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Upload className="mr-2 h-4 w-4" /> نزّل قالب Excel
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>ارفع ملف CSV</Label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground">
              في Excel: File → Save As → CSV (Comma delimited) (*.csv)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>أو الصق البيانات هنا</Label>
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              className="font-mono text-xs"
              dir="ltr"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={doImport} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              استيراد الطلاب
            </Button>
            <Button variant="outline" asChild>
              <Link href="/students"><ArrowLeft className="mr-2 h-4 w-4" /> رجوع</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-5 text-sm">
            <p className="font-semibold text-emerald-600">✅ تم استيراد {result.created} طالب</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-destructive">في صفوف مارضتش ({result.errors.length}):</p>
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
