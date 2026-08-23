"use client";

import { Printer, ArrowRight, QrCode } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { studentQrValue } from "@/lib/student-qr";

export type PrintableStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
};

export function QrPrintCards({
  groupId,
  groupName,
  students,
  en,
}: {
  groupId: string;
  groupName: string;
  students: PrintableStudent[];
  en: boolean;
}) {
  return (
    <main className="qr-print-page mx-auto max-w-6xl space-y-6 p-4 sm:p-6" dir={en ? "ltr" : "rtl"}>
      <div className="qr-print-toolbar flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <p className="text-sm text-muted-foreground">{en ? "Student ID cards" : "بطاقات تعريف الطلاب"}</p>
          <h1 className="text-2xl font-bold">{groupName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {en ? `${students.length} active student${students.length === 1 ? "" : "s"}` : `${students.length} طالبًا نشطًا`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/groups/${groupId}`}><ArrowRight className="h-4 w-4" /> {en ? "Back to group" : "العودة للمجموعة"}</Link>
          </Button>
          <Button type="button" onClick={() => window.print()} disabled={students.length === 0}>
            <Printer className="h-4 w-4" /> {en ? "Print cards" : "طباعة البطاقات"}
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {en ? "There are no active students in this group." : "لا يوجد طلاب نشطون في هذه المجموعة."}
        </div>
      ) : (
        <section className="qr-print-grid grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label={en ? "Printable student QR cards" : "بطاقات QR القابلة للطباعة"}>
          {students.map((student) => {
            const fullName = `${student.first_name} ${student.last_name}`.trim();
            return (
              <article className="qr-student-card flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm" key={student.id}>
                <div className="qr-card-copy min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    <QrCode className="h-4 w-4" /> MYAcademy
                  </div>
                  <h2 className="truncate text-lg font-bold" title={fullName}>{fullName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{student.grade || (en ? "Grade not set" : "الصف غير محدد")}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">{en ? "Show this code when recording attendance" : "أظهر هذا الكود عند تسجيل الحضور"}</p>
                </div>
                <div className="qr-code-wrap shrink-0 rounded-lg bg-white p-2">
                  <QRCodeSVG
                    value={studentQrValue(student.id)}
                    size={128}
                    level="M"
                    includeMargin
                    aria-label={en ? `QR code for ${fullName}` : `كود QR للطالب ${fullName}`}
                  />
                </div>
              </article>
            );
          })}
        </section>
      )}

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          html, body {
            background: #fff !important;
          }

          aside, nav, header, [data-sidebar], .qr-print-toolbar, .print-hidden {
            display: none !important;
          }

          .qr-print-page {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .qr-print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 3mm !important;
          }

          .qr-student-card {
            height: 52mm !important;
            min-height: 52mm !important;
            break-inside: avoid;
            page-break-inside: avoid;
            border: 0.3mm solid #cbd5e1 !important;
            border-radius: 3mm !important;
            box-shadow: none !important;
            padding: 4mm !important;
          }

          .qr-code-wrap {
            padding: 1.5mm !important;
          }

          .qr-code-wrap svg {
            width: 35mm !important;
            height: 35mm !important;
          }
        }
      `}</style>
    </main>
  );
}
