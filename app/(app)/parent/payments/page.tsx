import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { PaymentStatusBadge } from "@/components/shared/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getParentDashboard, PaymentsService, requireRole } from "@/services";
import { formatCurrency, fullName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParentPaymentsPage() {
  const user = requireRole("PARENT");
  const { children } = await getParentDashboard(user);

  // Pre-fetch each child's payments (can't await inside flatMap).
  const paymentsByChild = await Promise.all(
    children.map((c) => PaymentsService.listPayments({ studentId: c.id, pageSize: 100 })),
  );
  const allPayments = paymentsByChild.flatMap((r) => r.items);
  const outstanding = allPayments.reduce((s, p) => s + p.remaining, 0);
  const collected = allPayments.reduce((s, p) => s + p.amount_paid, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="المصاريف" description="سجلات الرسوم والأرصدة لأبنائك." />
      {children.length === 0 ? (
        <EmptyState icon={Wallet} title="No data" description="No children linked." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Paid (total)" value={formatCurrency(collected)} icon={Wallet} accent="success" />
            <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={Wallet} accent="warning" />
            <StatCard label="Records" value={allPayments.length} icon={Wallet} accent="primary" />
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
                      <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Due</TableHead><TableHead>Paid</TableHead><TableHead>Remaining</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
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
                        {pays.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No payments.</TableCell></TableRow>}
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
