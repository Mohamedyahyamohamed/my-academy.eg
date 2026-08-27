import { FileSpreadsheet, Download, Users, CalendarCheck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExportExcel } from "@/components/shared/export-excel";
import { requireScopedRole } from "@/services";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireScopedRole("ADMIN", "SUPER_ADMIN", "TEACHER");
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";

  const items = [
    {
      key: "reports" as const,
      icon: Users,
      titleAr: "تقرير الطلاب",
      titleEn: "Student reports",
      descAr: "أسماء الطلاب، المجموعات، البريد، وبيانات أولياء الأمور.",
      descEn: "Student names, groups, emails, and parent contacts.",
    },
    {
      key: "attendance" as const,
      icon: CalendarCheck,
      titleAr: "الحضور",
      titleEn: "Attendance",
      descAr: "سجل الحضور لكل طالب لكل حصة وتاريخ وحالة.",
      descEn: "Per-student, per-lesson attendance with date and status.",
    },
    {
      key: "payments" as const,
      icon: Wallet,
      titleAr: "المدفوعات",
      titleEn: "Payments",
      descAr: "المدفوعات المستحقة والمدفوعة والمتبقية لكل طالب لكل شهر.",
      descEn: "Due, paid, and remaining amounts per student per month.",
    },
  ];

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Export data" : "تصدير البيانات"}
        description={en ? "Download academy-scoped Excel files for accounting and management." : "نزّل ملفات Excel محصورة بالأكاديمية للمحاسبة ومشاركة الإدارة."}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-300" />
                  </div>
                  <CardTitle>{en ? item.titleEn : item.titleAr}</CardTitle>
                </div>
                <CardDescription>{en ? item.descEn : item.descAr}</CardDescription>
              </CardHeader>
              <CardContent>
                <ExportExcel type={item.key} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {en
          ? "Files are scoped to your academy only — no other academy's data is included."
          : "الملفات محصورة بأكاديميتك فقط — لا يتم تضمين بيانات أي أكاديمية أخرى."}
      </p>
    </div>
  );
}
