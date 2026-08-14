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
  AttendanceService, GroupsService, MiscService, requireRole,
} from "@/services";
import { collections } from "@/services/data/store";
import { APP_CONFIG, performanceLevel, performanceColor } from "@/lib/constants";
import { formatCurrency, formatDate, fullName, percentage } from "@/lib/utils";

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
  requireRole("ADMIN");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];
  const groupId = sp("group") ?? "ALL";

  const d = await DashboardService.getDashboardData();
  const groups = await GroupsService.listGroups();
  const academy = MiscService.getAcademy();

  const students = (await StudentsService.listStudents({ status: "ACTIVE", pageSize: 500 })).items
    .filter((s) => groupId === "ALL" || (s.groups ?? []).some((g) => g.id === groupId));

  const payments = (await PaymentsService.listPayments({ pageSize: 500 })).items
    .filter((p) => groupId === "ALL" || p.group_id === groupId);

  const grades = (await GradesService.listGrades({ pageSize: 500 })).items;

  const collected = payments.reduce((s, p) => s + p.amount_paid, 0);
  const outstanding = payments.reduce((s, p) => s + p.remaining, 0);

  // بيانات تصدير كشف الطلاب إلى Excel.
  const exportRows = students.map((s) => ({
    name: fullName(s),
    grade: s.grade ?? "",
    status: s.status,
    groups: (s.groups ?? []).map((g) => g.name.split(" — ")[0]).join("، ") || "",
  }));

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="التقارير"
          description="أنشئ واطبع تقارير الأكاديمية. استخدم الفلاتر للتركيز على مجموعة محددة."
        >
          <PrintButton label="طباعة التقرير" />
          <ExportCSV
            filename={`تقرير-الطلاب-${new Date().toISOString().slice(0, 10)}`}
            rows={exportRows}
            columns={[
              { key: "name", label: "الطالب" },
              { key: "grade", label: "الصف الدراسي" },
              { key: "status", label: "الحالة" },
              { key: "groups", label: "المجموعات" },
            ]}
            label="تصدير Excel"
          />
        </PageHeader>
        <div className="card-surface p-4">
          <ToolbarRoot>
            <ToolbarSelect paramKey="group" label="تصفية بمجموعة" options={[
              { value: "ALL", label: "كل المجموعات" },
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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{academy.name}</p>
                <CardTitle>تقرير الأكاديمية الشهري</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ReportStat label="الطلاب" value={String(students.length)} />
              <ReportStat label="المجموعات النشطة" value={String(d.totalGroups)} />
              <ReportStat label="المحصّل" value={formatCurrency(collected)} />
              <ReportStat label="المتبقي" value={formatCurrency(outstanding)} />
              <ReportStat label="نسبة الحضور" value={`${d.attendanceRate}%`} />
              <ReportStat label="متوسط الدرجات" value={`${d.averageGrade}%`} />
              <ReportStat label="الإيراد الشهري" value={formatCurrency(d.monthlyRevenue)} />
              <ReportStat label="الحصص القادمة" value={String(d.upcomingLessons.length)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">كشف الطلاب</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>الصف الدراسي</TableHead><TableHead>الحالة</TableHead><TableHead>المجموعات</TableHead></TableRow></TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{fullName(s)}</TableCell>
                    <TableCell className="text-sm">{s.grade ?? "—"}</TableCell>
                    <TableCell className="text-sm">{s.status}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(s.groups ?? []).map((g) => g.name.split(" — ")[0]).join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">ملخص المدفوعات</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>الشهر</TableHead><TableHead>المستحق</TableHead><TableHead>المحصّل</TableHead><TableHead>المتبقي</TableHead></TableRow></TableHeader>
                <TableBody>
                  {d.revenueByMonth.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell>{formatCurrency(r.revenue)}</TableCell>
                      <TableCell>{formatCurrency(r.collected)}</TableCell>
                      <TableCell>{formatCurrency(r.revenue - r.collected)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">أداء الدرجات</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>المستوى</TableHead><TableHead>العدد</TableHead></TableRow></TableHeader>
                <TableBody>
                  {d.gradePerformance.map((g) => (
                    <TableRow key={g.level}>
                      <TableCell className="font-medium">{GRADE_LEVEL_AR[g.level] ?? g.level}</TableCell>
                      <TableCell>{g.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          تم الإنشاء بواسطة {APP_CONFIG.name} · {formatDate(new Date())}
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
