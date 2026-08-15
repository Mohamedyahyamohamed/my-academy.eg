import { Wallet } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { PaymentStatusBadge } from "@/components/shared/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getParentDashboard, PaymentsService, requireScopedRole } from "@/services";
import { formatCurrency, fullName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParentPaymentsPage() {
  const user = await requireScopedRole("PARENT");
  const { children } = await getParentDashboard(user);
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";

  // Pre-fetch each child's payments (can't await inside flatMap).
  const paymentsByChild = await Promise.all(
    children.map((c) => PaymentsService.listPayments({ studentId: c.id, pageSize: 100 }, user.academy_id)),
  );
  const allPayments = paymentsByChild.flatMap((r) => r.items);
  const outstanding = allPayments.reduce((s, p) => s + p.remaining, 0);
  const collected = allPayments.reduce((s, p) => s + p.amount_paid, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={en ? "Payments" : "المصاريف"} description={en ? "Fee records and balances for your children." : "سجلات الرسوم والأرصدة لأبنائك."} />
      {children.length === 0 ? (
        <EmptyState icon={Wallet} title={en ? "No data" : "لا توجد بيانات"} description={en ? "No children are linked to this account." : "لا يوجد أبناء مرتبطون بالحساب."} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={en ? "Total paid" : "إجمالي المدفوع"} value={formatCurrency(collected)} icon={Wallet} accent="success" />
            <StatCard label={en ? "Outstanding" : "المتبقي"} value={formatCurrency(outstanding)} icon={Wallet} accent="warning" />
            <StatCard label={en ? "Records" : "السجلات"} value={allPayments.length} icon={Wallet} accent="primary" />
          </div>
          <div className="space-y-6">
            {children.map((c, idx) => {
              const pays = paymentsByChild[idx]?.items ?? [];
              return (
                <Card key={c.id}>
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <StudentAvatar name={fullName(c)} size="sm" />
                      <p className="font-semibold">{fullName(c)}</p>
                    </div>
                    <Table>
                      <TableHeader><TableRow><TableHead>{en ? "Month" : "الشهر"}</TableHead><TableHead>{en ? "Due" : "المستحق"}</TableHead><TableHead>{en ? "Paid" : "المدفوع"}</TableHead><TableHead>{en ? "Remaining" : "المتبقي"}</TableHead><TableHead>{en ? "Status" : "الحالة"}</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {pays.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.month}</TableCell>
                            <TableCell>{formatCurrency(p.amount_due)}</TableCell>
                            <TableCell>{formatCurrency(p.amount_paid)}</TableCell>
                            <TableCell className={p.remaining > 0 ? "text-rose-600" : ""}>{formatCurrency(p.remaining)}</TableCell>
                            <TableCell><PaymentStatusBadge status={p.status} /></TableCell>
                          </TableRow>
                        ))}
                        {pays.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">{en ? "No payment records." : "لا توجد مصروفات."}</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
