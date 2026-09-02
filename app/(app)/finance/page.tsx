import Link from "next/link";
import { AlertTriangle, Banknote, CalendarDays, Receipt, Wallet } from "lucide-react";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/shared/badges";
import { PaymentsService, requireScopedRole } from "@/services";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireScopedRole("ADMIN");
  const metrics = await PaymentsService.getPaymentMetrics(12, user.academy_id);
  const payments = (await PaymentsService.listPayments({ page: 1, pageSize: 500 }, user.academy_id)).items;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = payments.filter((p) => p.remaining > 0 && p.due_date < today);
  const recent = payments.slice().sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)).slice(0, 12);
  const money = (value: number) => formatCurrency(value, "EGP", en ? "en-EG" : "ar-EG");

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Finance" : "المالية"}
        description={en ? "A clear view of collection, outstanding balances, and overdue payments." : "متابعة واضحة للتحصيل والمتبقي والمدفوعات المتأخرة."}
      >
        <Link href="/payments" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
          {en ? "Manage payments" : "إدارة المدفوعات"}
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={en ? "Due this month" : "المطلوب هذا الشهر"} value={money(metrics.monthlyRevenue)} icon={Wallet} accent="primary" href="/payments" />
        <StatCard label={en ? "Collected this month" : "المحصّل هذا الشهر"} value={money(metrics.collectedThisMonth)} icon={Banknote} accent="success" href="/payments" />
        <StatCard label={en ? "Outstanding" : "المتبقي"} value={money(metrics.outstanding)} icon={Wallet} accent="warning" href="/payments" />
        <StatCard label={en ? "Overdue payments" : "المدفوعات المتأخرة"} value={overdue.length} hint={en ? money(overdue.reduce((sum, p) => sum + p.remaining, 0)) : `إجمالي متأخر: ${money(overdue.reduce((sum, p) => sum + p.remaining, 0))}`} icon={AlertTriangle} accent="destructive" href="/payments?status=UNPAID" countUp />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />{en ? "Monthly collection" : "التحصيل الشهري"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {metrics.revenueByMonth.slice().reverse().map((row) => {
              const rate = row.revenue > 0 ? Math.min(100, Math.round((row.collected / row.revenue) * 100)) : 0;
              return <div key={row.month} className="space-y-1"><div className="flex justify-between text-sm"><span>{row.month}</span><span className="font-medium">{money(row.collected)} / {money(row.revenue)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} /></div></div>;
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />{en ? "Recent payments" : "آخر المدفوعات"}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {recent.length ? <Table><TableHeader><TableRow><TableHead>{en ? "Student" : "الطالب"}</TableHead><TableHead>{en ? "Date" : "التاريخ"}</TableHead><TableHead>{en ? "Paid" : "المدفوع"}</TableHead><TableHead>{en ? "Status" : "الحالة"}</TableHead></TableRow></TableHeader><TableBody>{recent.map((p) => <TableRow key={p.id}><TableCell>{p.student ? `${p.student.first_name} ${p.student.last_name}` : "—"}</TableCell><TableCell>{formatDate(p.updated_at)}</TableCell><TableCell className="nums">{money(p.amount_paid)}</TableCell><TableCell><PaymentStatusBadge status={p.status} /></TableCell></TableRow>)}</TableBody></Table> : <p className="p-6 text-center text-sm text-muted-foreground">{en ? "No payments yet." : "لا توجد مدفوعات بعد."}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
