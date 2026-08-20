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
import { useClientLang } from "@/lib/i18n-client";

const HEADER =
  "first_name,last_name,phone,grade,school,parent_name,parent_phone";
const EXAMPLE_AR =
  "first_name,last_name,phone,grade,school,parent_name,parent_phone\nأحمد,محمود,01012345678,الصف الثالث,النور,سارة محمود,01012345678\nمريم,علي,01098765432,الصف الثاني,السلام,فاطمة علي,01098765432";
const EXAMPLE_EN =
  "first_name,last_name,phone,grade,school,parent_name,parent_phone\nAhmed,Mahmoud,01012345678,Grade 3,Al Noor,Sara Mahmoud,01012345678\nMaryem,Ali,01098765432,Grade 2,Al Salam,Fatima Ali,01098765432";

type ImportAcademy = { id: string; name: string };

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  let start = 0;
  const detectDelim = (line: string) =>
    (line.match(/;/g) || []).length > (line.match(/,/g) || []).length ? ";" : ",";
  const parseLine = (line: string, delim: string) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i++; continue; }
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === delim && !quoted) { cells.push(cell.trim()); cell = ""; continue; }
      cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };
  if (lines[0].toLowerCase().includes("first_name")) start = 1;

  const rows: ImportRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const delim = detectDelim(lines[i]);
    const cells = parseLine(lines[i], delim);
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

export function ImportStudents({ academies = [], isPlatformOwner = false }: { academies?: ImportAcademy[]; isPlatformOwner?: boolean }) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [academyId, setAcademyId] = React.useState(academies[0]?.id ?? "");
  const [result, setResult] = React.useState<null | { created: number; skippedDup: number; errors: string[] }>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
  };

  const downloadTemplate = () => {
    const blob = new Blob([en ? EXAMPLE_EN : EXAMPLE_AR], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async () => {
    const rows = parseCSV(text);
    if (isPlatformOwner && !academyId) {
      toast.error(en ? "Select the target academy first." : "اختر الأكاديمية المستهدفة أولًا.");
      return;
    }
    if (rows.length === 0) {
      toast.error(en ? "No data. Paste students or upload a file." : "مفيش بيانات. الصق الطلاب أو ارفع ملف.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await importStudentsAction(rows, isPlatformOwner ? academyId : undefined);
      if (res.ok === false) {
        toast.error(res.error ?? (en ? "Import failed." : "فشل الاستيراد"));
      } else {
        setResult({ created: res.created ?? 0, skippedDup: res.skippedDup ?? 0, errors: res.errors ?? [] });
        toast.success(en ? `${res.created} student(s) imported.` : `تم استيراد ${res.created} طالب 🎉`);
        router.refresh();
      }
    } catch {
      toast.error(en ? "An error occurred during import." : "حصل خطأ أثناء الاستيراد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" dir={en ? "ltr" : "rtl"}>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              {en ? "Columns:" : "الأعمدة:"} {HEADER}
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Upload className="me-2 h-4 w-4" /> {en ? "Download CSV template" : "نزّل قالب CSV"}
            </Button>
          </div>

          {isPlatformOwner && (
            <div className="space-y-1.5">
              <Label htmlFor="import-academy">{en ? "Target academy" : "الأكاديمية المستهدفة"}</Label>
              <select
                id="import-academy"
                value={academyId}
                onChange={(event) => setAcademyId(event.target.value)}
                disabled={loading || academies.length === 0}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {academies.length === 0 ? (
                  <option value="">{en ? "No active academies found" : "لا توجد أكاديميات نشطة"}</option>
                ) : academies.map((academy) => (
                  <option key={academy.id} value={academy.id}>{academy.name || (en ? "Unnamed academy" : "أكاديمية بدون اسم")}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {en ? "Platform owners must choose a tenant explicitly before importing." : "يجب على مالك المنصة اختيار مستأجر صريح قبل الاستيراد."}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{en ? "Upload a CSV file" : "ارفع ملف CSV"}</Label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground">
              {en ? "CSV only for now. In Excel: File → Save As → CSV (Comma delimited) (*.csv). Maximum 1,000 students per import." : "الاستيراد يدعم CSV حاليًا. من Excel اختر File → Save As → CSV (Comma delimited) (*.csv). الحد الأقصى 1000 طالب في العملية الواحدة."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{en ? "Or paste data here" : "أو الصق البيانات هنا"}</Label>
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={en ? EXAMPLE_EN : EXAMPLE_AR}
              className="font-mono text-xs"
              dir="ltr"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={doImport} disabled={loading}>
              {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {en ? "Import students" : "استيراد الطلاب"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/students"><ArrowLeft className="me-2 h-4 w-4" /> {en ? "Back" : "رجوع"}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-5 text-sm">
            <p className="font-semibold text-emerald-600">✅ {en ? `${result.created} student(s) imported` : `تم استيراد ${result.created} طالب`}</p>
            {result.skippedDup > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">{en ? `${result.skippedDup} duplicate row(s) skipped.` : `تم تخطي ${result.skippedDup} صفوف مكررة.`}</p>
            )}
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-destructive">{en ? `Rows with errors (${result.errors.length}):` : `في صفوف مارضتش (${result.errors.length}):`}</p>
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
