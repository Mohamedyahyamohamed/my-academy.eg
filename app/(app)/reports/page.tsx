import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToolbarRoot, ToolbarSearch, ToolbarSelect, ToolbarActions } from "@/components/shared/toolbar";
import { PrintButton } from "@/components/shared/print-button";
import { ExportCSV } from "@/components/shared/export-csv";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DashboardService, StudentsService, PaymentsService, GradesService,
  AttendanceService, GroupsService, MiscService, requireScopedRole,
} from "@/services";
import { APP_CONFIG, performanceLevel, performanceColor } from "@/lib/constants";
import { formatCurrency, formatDate, fullName, percentage } from "@/lib/utils";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const GRADE_LEVEL_AR: Record<string, string> = {
  Excellent: "ممتاز",
  "Very Good": "جيد جدًا",
  Good: "جيد",
  "Needs Improvement": "يحتاج تحسين",
};

export default async function ReportsPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireScopedRole("ADMIN");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];
  const groupId = sp("group") ?? "ALL";

  const d = await DashboardService.getDashboardData("month", user.academy_id).catch(() => null);
  const groups = (await GroupsService.listGroups("", user.academy_id).catch(() => [])) ?? [];
  const academy = await MiscService.getAcademyAsync(user.academy_id).catch(() => null);
  const upcomingLessons = d?.upcomingLessons ?? [];
  const revenueByMonth = d?.revenueByMonth ?? [];
  const gradePerformance = d?.gradePerformance ?? [];

  const studentResult = await StudentsService.listStudents({ status: "ACTIVE", pageSize: 500 }, user.academy_id)
    .catch(() => ({ items: [] }));
  const students = (studentResult.items ?? [])
    .filter((s) => groupId === "ALL" || (s.groups ?? []).some((g) => g.id === groupId));

  const paymentResult = await PaymentsService.listPayments({ pageSize: 500 }, user.academy_id)
    .catch(() => ({ items: [] }));
  const payments = (paymentResult.items ?? [])
    .filter((p) => groupId === "ALL" || p.group_id === groupId);

  const collected = payments.reduce((s, p) => s + p.amount_paid, 0);
  const outstanding = payments.reduce((s, p) => s + p.remaining, 0);

  // بيانات تصدير كشف الطلاب إلى Excel.
  const exportRows = students.map((s) => ({
    name: fullName(s),
    grade: s.grade ?? "",
    status: en ? (s.status === "ACTIVE" ? "Active" : s.status === "INACTIVE" ? "Inactive" : "Archived") : (s.status === "ACTIVE" ? "نشط" : s.status === "INACTIVE" ? "غير نشط" : "مؤرشف"),
    groups: (s.groups ?? []).map((g) => g.name.split(" — ")[0]).join("، ") || "",
  }));

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <div className="no-print">
        <PageHeader
          title={en ? "Reports" : "التقارير"}
          description={en ? "Create and print academy reports. Use filters to focus on a specific group." : "أنشئ واطبع تقارير الأكاديمية. استخدم الفلاتر للتركيز على مجموعة محددة."}
        >
          <PrintButton label={en ? "Print report" : "طباعة التقرير"} />
          <ExportCSV
            filename={`${en ? "student-report" : "تقرير-الطلاب"}-${new Date().toISOString().slice(0, 10)}`}
            rows={exportRows}
            columns={[
              { key: "name", label: en ? "Student" : "الطالب" },
              { key: "grade", label: en ? "Grade" : "الصف الدراسي" },
              { key: "status", label: en ? "Status" : "الحالة" },
              { key: "groups", label: en ? "Groups" : "المجموعات" },
            ]}
            label={en ? "Export Excel" : "تصدير Excel"}
          />
        </PageHeader>
        <div className="card-surface p-4">
          <ToolbarRoot>
            <ToolbarSelect paramKey="group" label={en ? "Filter by group" : "تصفية بمجموعة"} options={[
              { value: "ALL", label: en ? "All groups" : "كل المجموعات" },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]} />
          </ToolbarRoot>
        </div>
      </div>

      {/* Printable report */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{academy?.name ?? APP_CONFIG.name}</p>
                <CardTitle>{en ? "Monthly academy report" : "تقرير الأكاديمية الشهري"}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(new Date(), undefined, en ? "en-EG" : "ar-EG")}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReportStat label={en ? "Students" : "الطلاب"} value={String(students.length)} />
              <ReportStat label={en ? "Active groups" : "المجموعات النشطة"} value={String(d?.totalGroups ?? 0)} />
              <ReportStat label={en ? "Collected" : "المحصّل"} value={formatCurrency(collected, "EGP", en ? "en-EG" : "ar-EG")} />
              <ReportStat label={en ? "Outstanding" : "المتبقي"} value={formatCurrency(outstanding, "EGP", en ? "en-EG" : "ar-EG")} />
              <ReportStat label={en ? "Attendance rate" : "نسبة الحضور"} value={d?.attendanceSessions ? `${d.attendanceRate}%` : (en ? "Not recorded" : "لم يُسجّل بعد")} />
              <ReportStat label={en ? "Average grade" : "متوسط الدرجات"} value={`${d?.averageGrade ?? 0}%`} />
              <ReportStat label={en ? "Monthly revenue" : "الإيراد الشهري"} value={formatCurrency(d?.monthlyRevenue ?? 0, "EGP", en ? "en-EG" : "ar-EG")} />
              <ReportStat label={en ? "Upcoming lessons" : "الحصص القادمة"} value={String(upcomingLessons.length)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{en ? "Student roster" : "كشف الطلاب"}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>{en ? "Student" : "الطالب"}</TableHead><TableHead>{en ? "Grade" : "الصف الدراسي"}</TableHead><TableHead>{en ? "Status" : "الحالة"}</TableHead><TableHead>{en ? "Groups" : "المجموعات"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{fullName(s)}</TableCell>
                    <TableCell className="text-sm">{s.grade ?? "—"}</TableCell>
                    <TableCell className="text-sm">{en ? (s.status === "ACTIVE" ? "Active" : s.status === "INACTIVE" ? "Inactive" : "Archived") : (s.status === "ACTIVE" ? "نشط" : s.status === "INACTIVE" ? "غير نشط" : "مؤرشف")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(s.groups ?? []).map((g) => g.name.split(" — ")[0]).join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">{en ? "Payment summary" : "ملخص المدفوعات"}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>{en ? "Month" : "الشهر"}</TableHead><TableHead>{en ? "Due" : "المستحق"}</TableHead><TableHead>{en ? "Collected" : "المحصّل"}</TableHead><TableHead>{en ? "Outstanding" : "المتبقي"}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {revenueByMonth.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell>{formatCurrency(r.revenue, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                      <TableCell>{formatCurrency(r.collected, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                      <TableCell>{formatCurrency(r.revenue - r.collected, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{en ? "Grade performance" : "أداء الدرجات"}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>{en ? "Level" : "المستوى"}</TableHead><TableHead>{en ? "Count" : "العدد"}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {gradePerformance.map((g) => (
                    <TableRow key={g.level}>
                      <TableCell className="font-medium">{en ? g.level : (GRADE_LEVEL_AR[g.level] ?? g.level)}</TableCell>
                      <TableCell>{g.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {en ? "Generated by" : "تم الإنشاء بواسطة"} {APP_CONFIG.name} · {formatDate(new Date(), undefined, en ? "en-EG" : "ar-EG")}
        </p>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
