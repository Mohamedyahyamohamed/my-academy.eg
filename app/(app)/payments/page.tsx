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
import { PaymentsService, StudentsService, GroupsService, requireRole } from "@/services";
import type { PaymentFilters } from "@/services/payments";
import { formatCurrency } from "@/lib/utils";
import type { PaymentStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  requireRole("ADMIN", "TEACHER");
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

  const result = await PaymentsService.listPayments(filters);
  const metrics = await PaymentsService.getPaymentMetrics();
  const students = (await StudentsService.listStudents({ pageSize: 500 })).items;
  const groups = await GroupsService.listGroups();

  const months = Array.from(new Set((await PaymentsService.listPayments({ pageSize: 500 })).items.map((p) => p.month))).sort().reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        title="المصاريف"
        description="Track tuition fees, record payments and follow up on outstanding balances."
      >
        <CreatePaymentDialog students={students} groups={groups} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected (this month)" value={formatCurrency(metrics.collectedThisMonth)} icon={Banknote} accent="success" />
        <StatCard label="Billed (this month)" value={formatCurrency(metrics.monthlyRevenue)} icon={Wallet} accent="primary" />
        <StatCard label='المتبقي' value={formatCurrency(metrics.outstanding)} icon={TrendingDown} accent="warning" />
      </div>

      <div className="card-surface p-4">
        <ToolbarRoot>
          <ToolbarSearch placeholder="Search by student name…" />
          <ToolbarSelect paramKey="status" label="تصفية بالحالة" options={[
            { value: "ALL", label: "كل الحالات" },
            { value: "PAID", label: "مدفوع" },
            { value: "PARTIAL", label: "Partially paid" },
            { value: "UNPAID", label: "غير مدفوع" },
          ]} />
          <ToolbarSelect paramKey="month" label="Filter by month" options={[
            { value: "ALL", label: "All months" },
            ...months.map((m) => ({ value: m, label: m })),
          ]} />
        </ToolbarRoot>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments found"
          description="Add a payment record to start tracking tuition."
          action={<CreatePaymentDialog students={students} groups={groups} />}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card-surface hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                    <TableCell>{formatCurrency(p.amount_due)}</TableCell>
                    <TableCell>{formatCurrency(p.amount_paid)}</TableCell>
                    <TableCell className={p.remaining > 0 ? "font-medium text-rose-600" : ""}>{formatCurrency(p.remaining)}</TableCell>
                    <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
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
                    <span className="text-muted-foreground">Remaining: <span className="font-medium text-rose-600">{formatCurrency(p.remaining)}</span></span>
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
