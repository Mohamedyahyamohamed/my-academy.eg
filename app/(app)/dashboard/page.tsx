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
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PaymentStatusBadge } from "@/components/shared/badges";
import { TrendArea, Donut, LineTrend } from "@/components/charts";
import { DashboardService, requireRole } from "@/services";
import { atRiskStudents } from "@/services/insights";
import { formatCurrency, formatDate, formatTime, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  requireRole("ADMIN");
  const d = await DashboardService.getDashboardData();
  const atRisk = (await atRiskStudents()).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A live overview of your academy — students, revenue, attendance and performance."
      >
        <Button asChild variant="outline">
          <Link href="/reports">View reports</Link>
        </Button>
        <Button asChild>
          <Link href="/students">
            Add student <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={d.totalStudents}
          hint={`${d.activeStudents} active`}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="Active Groups"
          value={d.totalGroups}
          hint="Currently teaching"
          icon={UsersRound}
          accent="info"
        />
        <StatCard
          label="Collected (this month)"
          value={formatCurrency(d.collectedThisMonth)}
          icon={Wallet}
          accent="success"
          trend={{ value: 12, positive: true, label: "vs last month" }}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(d.outstanding)}
          icon={TrendingDown}
          accent="warning"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(d.monthlyRevenue)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Active Students"
          value={d.activeStudents}
          icon={UserCheck}
          accent="success"
        />
        <StatCard
          label="Attendance Rate"
          value={`${d.attendanceRate}%`}
          icon={CalendarCheck}
          accent="info"
        />
        <StatCard
          label="Average Grade"
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
              <CardTitle>Revenue by Month</CardTitle>
              <CardDescription>Billed revenue over the last 6 months</CardDescription>
            </div>
            <Badge variant="secondary">EGP</Badge>
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
            <CardTitle>Students by Course</CardTitle>
            <CardDescription>Enrollment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut
              data={d.studentsByCourse.map((s) => ({
                name: s.course,
                value: s.students,
                color: s.color,
              }))}
              centerValue={String(d.totalStudents)}
              centerLabel="students"
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
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Present + late rate across recent lessons</CardDescription>
          </CardHeader>
          <CardContent>
            <LineTrend data={d.attendanceTrend} dataKey="rate" xKey="week" color="#10b981" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Grade Performance</CardTitle>
            <CardDescription>Distribution of recent results</CardDescription>
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
                      <span className="text-muted-foreground">{g.level}</span>
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
            <CardTitle>Upcoming Lessons</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/lessons">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.upcomingLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming lessons scheduled.
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
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Smart Insights — At Risk
            </CardTitle>
            <CardDescription>Auto-detected students who may need intervention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {atRisk.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No students at risk — everyone is on track 🎉
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
                    {r.severity}
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
            <CardTitle>Recent Payments</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/payments">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.recentPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
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
                        {p.student ? initials(`${p.student.first_name} ${p.student.last_name}`) : "?"}
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
            <CardTitle>Outstanding This Month</CardTitle>
            <CardDescription>Unpaid or partially paid</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.outstandingStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No outstanding payments this month 🎉
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
