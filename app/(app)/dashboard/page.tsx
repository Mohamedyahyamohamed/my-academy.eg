import Link from "next/link";
import {
  Users,
  UserCheck,
  UsersRound,
  Wallet,
  TrendingDown,
  CalendarCheck,
  GraduationCap,
  ArrowRight,
  Clock,
  AlertTriangle,
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PaymentStatusBadge } from "@/components/shared/badges";
import { TrendArea, Donut, LineTrend } from "@/components/charts";
import { DashboardService, MiscService, requireScopedRole } from "@/services";
import { atRiskStudents } from "@/services/insights";
import { formatCurrency, formatDate, formatTime, initials } from "@/lib/utils";
import type { DashboardPeriod } from "@/types";

export const dynamic = "force-dynamic";

const SEVERITY_AR: Record<string, string> = {
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
};

const GRADE_LEVEL_AR: Record<string, string> = {
  Excellent: "ممتاز",
  "Very Good": "جيد جدًا",
  Good: "جيد",
  "Needs Improvement": "يحتاج تحسين",
};

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  month: "هذا الشهر",
  quarter: "هذا الربع",
  year: "هذا العام",
};

const PERIODS: DashboardPeriod[] = ["month", "quarter", "year"];

export default async function DashboardPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await requireScopedRole("ADMIN");
  const sp = (k: string) =>
    Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k];
  const period: DashboardPeriod =
    sp("period") === "quarter" || sp("period") === "year" ? (sp("period") as DashboardPeriod) : "month";
  const [d, atRiskResult, teachers] = await Promise.all([
    DashboardService.getDashboardData(period, user.academy_id),
    atRiskStudents(user.academy_id),
    MiscService.listTeachers(user.academy_id),
  ]);
  const atRisk = atRiskResult.slice(0, 6);
  const collectionTrend = d.collectionTrend ?? 0;
  const setupSteps = [
    teachers.length === 0
      ? { title: "دعوة أول مدرس", description: "أرسل دعوة للمدرس من داخل المنصة.", href: "/settings?tab=users#invite" }
      : null,
    d.totalStudents === 0
      ? { title: "إضافة أول طالب", description: "أضف بيانات الطالب مباشرة، ويمكن ربطه بمجموعة لاحقًا.", href: "/students" }
      : null,
    d.totalGroups === 0
      ? { title: "إنشاء أول مجموعة", description: "بعد توفر مدرس، أنشئ المجموعة وحدد المادة والموعد.", href: "/groups" }
      : null,
  ].filter((step): step is { title: string; description: string; href: string } => Boolean(step));

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة حيّة على أكاديميتك — الطلاب، الإيرادات، الحضور، والأداء."
      >
        <Button asChild variant="outline">
          <Link href="/reports">عرض التقارير</Link>
        </Button>
        <Button asChild>
          <Link href="/students">
            إضافة طالب <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      {setupSteps.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-5 w-5 text-primary" /> خطوات البداية
            </CardTitle>
            <CardDescription>اتبع هذه الخطوات بالترتيب المقترح. لا تحتاج إلى تجهيز إعدادات مخفية قبل البدء.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {setupSteps.map((step, index) => (
                <Link key={step.href} href={step.href} className="group rounded-xl border bg-background p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                    <div>
                      <p className="font-medium group-hover:text-primary">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> يمكنك إضافة الطالب قبل إنشاء المجموعة؛ المجموعة فقط تحتاج مدرسًا مسؤولًا.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period filter */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={p === "month" ? "/dashboard" : `/dashboard?period=${p}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي الطلاب"
          value={d.totalStudents}
          hint={`${d.activeStudents} نشط`}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="المجموعات النشطة"
          value={d.totalGroups}
          hint="قيد التدريس حاليًا"
          icon={UsersRound}
          accent="info"
        />
        <StatCard
          label={`المحصّل ${PERIOD_LABELS[period]}`}
          value={formatCurrency(d.collectedForPeriod)}
          icon={Wallet}
          accent="success"
          trend={period === "month" ? { value: Math.abs(collectionTrend), positive: collectionTrend >= 0, label: "مقارنة بالشهر الماضي" } : undefined}
        />
        <StatCard
          label="المتبقي (المتأخرات)"
          value={formatCurrency(d.outstanding)}
          icon={TrendingDown}
          accent="warning"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="الإيراد الشهري"
          value={formatCurrency(d.monthlyRevenue)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="الطلاب النشطون"
          value={d.activeStudents}
          icon={UserCheck}
          accent="success"
        />
        <StatCard
          label="نسبة الحضور"
          value={`${d.attendanceRate}%`}
          icon={CalendarCheck}
          accent="info"
        />
        <StatCard
          label="متوسط الدرجات"
          value={`${d.averageGrade}%`}
          icon={GraduationCap}
          accent="warning"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>الإيرادات حسب الشهر</CardTitle>
              <CardDescription>الإيرادات المستحقة خلال آخر {period === "year" ? "12" : "6"} أشهر</CardDescription>
            </div>
            <Badge variant="secondary">جنيه</Badge>
          </CardHeader>
          <CardContent>
            <TrendArea
              data={d.revenueByMonth}
              dataKey="revenue"
              xKey="month"
              format="currency"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الطلاب حسب المادة</CardTitle>
            <CardDescription>توزيع التسجيل</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut
              data={d.studentsByCourse.map((s) => ({
                name: s.course,
                value: s.students,
                color: s.color,
              }))}
              centerValue={String(d.totalStudents)}
              centerLabel="طالب"
            />
            <div className="mt-3 space-y-1.5">
              {d.studentsByCourse.map((s) => (
                <div key={s.course} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.course}
                  </span>
                  <span className="font-medium">{s.students}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance + grade perf */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>اتجاه الحضور</CardTitle>
            <CardDescription>نسبة الحضور والتأخير عبر أحدث الحصص</CardDescription>
          </CardHeader>
          <CardContent>
            <LineTrend data={d.attendanceTrend} dataKey="rate" xKey="week" color="#10b981" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>أداء الدرجات</CardTitle>
            <CardDescription>توزيع أحدث النتائج</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.gradePerformance.map((g) => {
                const total = d.gradePerformance.reduce((s, x) => s + x.count, 0);
                const pct = total ? (g.count / total) * 100 : 0;
                const color =
                  g.level === "Excellent"
                    ? "#10b981"
                    : g.level === "Very Good"
                      ? "#0ea5e9"
                      : g.level === "Good"
                        ? "#f59e0b"
                        : "#f43f5e";
                return (
                  <div key={g.level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{GRADE_LEVEL_AR[g.level] ?? g.level}</span>
                      <span className="font-medium">{g.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming lessons */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>الحصص القادمة</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/lessons">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.upcomingLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا توجد حصص قادمة مجدولة.
              </p>
            ) : (
              d.upcomingLessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/lessons/${l.id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-[10px] font-medium uppercase">
                      {formatDate(l.date, { month: "short" }).split(" ")[0]}
                    </span>
                    <span className="text-sm font-semibold leading-none">
                      {new Date(l.date).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.topic}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.group?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(`${l.date.slice(0, 10)}T${l.start_time}:00`)}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Students needing attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> تنبيهات ذكية — في خطر
            </CardTitle>
            <CardDescription>طلاب تم رصدهم تلقائيًا قد يحتاجون تدخلًا</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {atRisk.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا يوجد طلاب في خطر — الجميع على المسار 🎉
              </p>
            ) : (
              atRisk.map((r) => (
                <Link
                  key={r.studentId}
                  href={`/students/${r.studentId}`}
                  className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.reasons.join(" · ")}</p>
                  </div>
                  <Badge variant={r.severity === "high" ? "destructive" : r.severity === "medium" ? "warning" : "secondary"}>
                    {SEVERITY_AR[r.severity] ?? r.severity}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent payments + outstanding */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>أحدث المدفوعات</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/payments">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.recentPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا توجد مدفوعات مسجلة بعد.
              </p>
            ) : (
              d.recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent/60"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[11px]">
                        {p.student ? initials(`${p.student.first_name} ${p.student.last_name}`) : "؟"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {p.student ? `${p.student.first_name} ${p.student.last_name}` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.month}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(p.amount_paid)}
                    </p>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>المتأخرات هذا الشهر</CardTitle>
            <CardDescription>غير مدفوعة أو مدفوعة جزئيًا</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.outstandingStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                لا توجد متأخرات هذا الشهر 🎉
              </p>
            ) : (
              d.outstandingStudents.map((p) => (
                <Link
                  key={p.id}
                  href={`/payments?student=${p.student_id}`}
                  className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.student ? `${p.student.first_name} ${p.student.last_name}` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.group?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-rose-600">
                      {formatCurrency(p.remaining)}
                    </p>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
