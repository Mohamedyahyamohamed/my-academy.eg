import Link from "next/link";
import { Wallet, TrendingDown, Banknote } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToolbarRoot, ToolbarSearch, ToolbarSelect, ToolbarActions } from "@/components/shared/toolbar";
import { PaginationBar } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { PaymentStatusBadge } from "@/components/shared/badges";
import { RecordPaymentDialog, CreatePaymentDialog } from "@/components/payments/payment-dialogs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentsService, StudentsService, GroupsService, requireScopedRole } from "@/services";
import type { PaymentFilters } from "@/services/payments";
import { formatCurrency } from "@/lib/utils";
import type { PaymentStatus } from "@/types";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PaymentsPage(
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

  const filters: PaymentFilters = {
    search: sp("search"),
    status: (sp("status") as PaymentStatus) ?? "ALL",
    month: sp("month") ?? "ALL",
    studentId: sp("student") ?? "ALL",
    page: sp("page") ? Number(sp("page")) : 1,
    pageSize: 10,
  };

  const result = await PaymentsService.listPayments(filters, user.academy_id);
  const metrics = await PaymentsService.getPaymentMetrics(6, user.academy_id);
  const students = (await StudentsService.listStudents({ pageSize: 500 }, user.academy_id)).items;
  const groups = await GroupsService.listGroups("", user.academy_id);

  const months = Array.from(new Set((await PaymentsService.listPayments({ pageSize: 500 }, user.academy_id)).items.map((p) => p.month))).sort().reverse();

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Payments" : "المصاريف"}
        description={en ? "Track school fees, record payments, and monitor outstanding balances." : "تابع المصاريف المدرسية، سجّل المدفوعات، وتابع المتأخرات."}
      >
        <CreatePaymentDialog students={students} groups={groups} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={en ? "Collected (this month)" : "المحصّل (الشهر الحالي)"} value={formatCurrency(metrics.collectedThisMonth, "EGP", en ? "en-EG" : "ar-EG")} icon={Banknote} accent="success" />
        <StatCard label={en ? "Due (this month)" : "المستحق (الشهر الحالي)"} value={formatCurrency(metrics.monthlyRevenue, "EGP", en ? "en-EG" : "ar-EG")} icon={Wallet} accent="primary" />
        <StatCard label={en ? "Outstanding" : "المتبقي (المتأخرات)"} value={formatCurrency(metrics.outstanding, "EGP", en ? "en-EG" : "ar-EG")} icon={TrendingDown} accent="warning" />
      </div>

      <div className="card-surface p-4">
        <ToolbarRoot>
          <ToolbarSearch placeholder={en ? "Search by student name…" : "ابحث باسم الطالب…"} />
          <ToolbarSelect paramKey="status" label={en ? "Filter by status" : "تصفية بالحالة"} options={[
            { value: "ALL", label: en ? "All statuses" : "كل الحالات" },
            { value: "PAID", label: en ? "Paid" : "مدفوع" },
            { value: "PARTIAL", label: en ? "Partially paid" : "مدفوع جزئيًا" },
            { value: "UNPAID", label: en ? "Unpaid" : "غير مدفوع" },
          ]} />
          <ToolbarSelect paramKey="month" label={en ? "Filter by month" : "تصفية بالشهر"} options={[
            { value: "ALL", label: en ? "All months" : "كل الشهور" },
            ...months.map((m) => ({ value: m, label: m })),
          ]} />
        </ToolbarRoot>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={en ? "No payments yet" : "لا توجد مدفوعات بعد"}
          description={en ? "Add a payment record to start tracking fees." : "أضف سجل دفعة لبدء تتبّع المصاريف."}
          action={<CreatePaymentDialog students={students} groups={groups} />}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card-surface hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{en ? "Student" : "الطالب"}</TableHead>
                  <TableHead>{en ? "Month" : "الشهر"}</TableHead>
                  <TableHead>{en ? "Due" : "المستحق"}</TableHead>
                  <TableHead>{en ? "Paid" : "المدفوع"}</TableHead>
                  <TableHead>{en ? "Outstanding" : "المتبقي"}</TableHead>
                  <TableHead>{en ? "Status" : "الحالة"}</TableHead>
                  <TableHead className="text-left">{en ? "Action" : "إجراء"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/students/${p.student_id}`} className="flex items-center gap-3">
                        <StudentAvatar name={p.student ? `${p.student.first_name} ${p.student.last_name}` : "?"} size="sm" />
                        <span className="font-medium">{p.student ? `${p.student.first_name} ${p.student.last_name}` : "—"}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{p.month}</TableCell>
                    <TableCell>{formatCurrency(p.amount_due, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell>{formatCurrency(p.amount_paid, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell className={p.remaining > 0 ? "font-medium text-rose-600" : ""}>{formatCurrency(p.remaining, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-left">
                      <RecordPaymentDialog payment={p} students={students} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {result.items.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/students/${p.student_id}`} className="flex items-center gap-2">
                      <StudentAvatar name={p.student ? `${p.student.first_name} ${p.student.last_name}` : "?"} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{p.student ? `${p.student.first_name} ${p.student.last_name}` : "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.month}</p>
                      </div>
                    </Link>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">{en ? "Outstanding: " : "المتبقي: "}<span className="font-medium text-rose-600">{formatCurrency(p.remaining, "EGP", en ? "en-EG" : "ar-EG")}</span></span>
                    <RecordPaymentDialog payment={p} students={students} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationBar pagination={result.pagination} />
        </>
      )}
    </div>
  );
}
