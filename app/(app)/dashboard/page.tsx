import Link from "next/link";
import {
  Users,
  UserCheck,
  UsersRound,
  Wallet,
  TrendingDown,
  CalendarCheck,
  GraduationCap,
  BookOpen,
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
import { TrendArea, Donut, LineTrend, GroupedBars } from "@/components/charts";
import { DashboardService, MiscService, requireScopedRole } from "@/services";
import { atRiskStudents } from "@/services/insights";
import { collections } from "@/services/data/store";
import { OnboardingChecklist } from "@/components/shared/onboarding-checklist";
import { formatClockTime, formatCurrency, formatDate, formatTime, initials } from "@/lib/utils";
import type { DashboardPeriod } from "@/types";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const SEVERITY: Record<string, { ar: string; en: string }> = {
  high: { ar: "مرتفع", en: "High" },
  medium: { ar: "متوسط", en: "Medium" },
  low: { ar: "منخفض", en: "Low" },
};

const GRADE_LEVEL: Record<string, { ar: string; en: string }> = {
  Excellent: { ar: "ممتاز", en: "Excellent" },
  "Very Good": { ar: "جيد جدًا", en: "Very Good" },
  Good: { ar: "جيد", en: "Good" },
  "Needs Improvement": { ar: "يحتاج تحسين", en: "Needs improvement" },
};

const PERIOD_LABELS: Record<DashboardPeriod, { ar: string; en: string }> = {
  month: { ar: "هذا الشهر", en: "This month" },
  quarter: { ar: "هذا الربع", en: "This quarter" },
  year: { ar: "هذا العام", en: "This year" },
};

const PERIODS: DashboardPeriod[] = ["month", "quarter", "year"];

export default async function DashboardPage(
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
  const period: DashboardPeriod =
    sp("period") === "quarter" || sp("period") === "year" ? (sp("period") as DashboardPeriod) : "month";
  const [d, atRiskResult, teachers] = await Promise.all([
    DashboardService.getDashboardData(period, user.academy_id),
    atRiskStudents(user.academy_id),
    MiscService.listTeachers(user.academy_id),
  ]);
  const atRisk = atRiskResult.slice(0, 6);
  const collectionTrend = d.collectionTrend ?? 0;
  const quickActions = [
    { href: "/students", label: en ? "Add student" : "إضافة طالب", icon: Users },
    { href: "/groups", label: en ? "Create group" : "إنشاء مجموعة", icon: UsersRound },
    { href: "/lessons", label: en ? "View lessons" : "عرض الحصص", icon: BookOpen },
  ];
  const setupSteps = [
      teachers.length === 0
      ? { title: en ? "Invite your first teacher" : "دعوة أول مدرس", description: en ? "Send a teacher invitation from the platform." : "أرسل دعوة للمدرس من داخل المنصة.", href: "/settings?tab=users#invite" }
      : null,
    d.totalStudents === 0
      ? { title: en ? "Add your first student" : "إضافة أول طالب", description: en ? "Add the student's data directly; you can link a group later." : "أضف بيانات الطالب مباشرة، ويمكن ربطه بمجموعة لاحقًا.", href: "/students" }
      : null,
    d.totalGroups === 0
      ? { title: en ? "Create your first group" : "إنشاء أول مجموعة", description: en ? "After adding a teacher, create a group and set its subject and schedule." : "بعد توفر مدرس، أنشئ المجموعة وحدد المادة والموعد.", href: "/groups" }
      : null,
  ].filter((step): step is { title: string; description: string; href: string } => Boolean(step));

  // P3-addendum: full first-win onboarding checklist (group/students/QR/lesson/attendance/grade)
  const c = collections();
  const aid = user.academy_id;
  const groupCount = c.groups.filter((g) => g.academy_id === aid).length;
  const studentCount = c.students.filter((s) => s.academy_id === aid).length;
  const lessonCount = c.lessons.filter((l) => l.academy_id === aid).length;
  const attendanceCount = c.attendance.filter((a) => c.lessons.some((l) => l.id === a.lesson_id && l.academy_id === aid)).length;
  const gradeCount = c.grades.length;
  const qrCount = c.students.filter((s) => s.academy_id === aid && (s as any).qr_code).length;

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Dashboard" : "لوحة التحكم"}
        description={en ? "A live view of your academy — students, revenue, attendance, and performance." : "نظرة حيّة على أكاديميتك — الطلاب، الإيرادات، الحضور، والأداء."}
        showBack={false}
      >
        <Button asChild variant="outline">
          <Link href="/reports">{en ? "View reports" : "عرض التقارير"}</Link>
        </Button>
        <Button asChild>
          <Link href="/students">
            {en ? "Add student" : "إضافة طالب"} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHeader>

      <OnboardingChecklist
        academyId={user.academy_id}
        groupCount={groupCount}
        studentCount={studentCount}
        lessonCount={lessonCount}
        attendanceCount={attendanceCount}
        gradeCount={gradeCount}
        qrCount={qrCount}
      />

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{en ? "Quick actions" : "إجراءات سريعة"}</CardTitle>
          <CardDescription>{en ? "Start the most common tasks without searching through the menu." : "ابدأ المهام الأكثر استخدامًا مباشرةً دون البحث في القائمة."}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.href} asChild variant="outline" className="h-auto justify-start gap-2 border-indigo-100 bg-indigo-50/50 px-3 py-3 text-start text-indigo-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/60">
                <Link href={action.href}>
                  <Icon className="h-4 w-4 shrink-0 text-indigo-700 dark:text-indigo-300" />
                  <span className="truncate">{action.label}</span>
                </Link>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {setupSteps.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-5 w-5 text-primary" /> {en ? "Getting started" : "خطوات البداية"}
            </CardTitle>
            <CardDescription>{en ? "Follow these suggested steps in order. No hidden setup is required before you begin." : "اتبع هذه الخطوات بالترتيب المقترح. لا تحتاج إلى تجهيز إعدادات مخفية قبل البدء."}</CardDescription>
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
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {en ? "You can add students before creating a group; only the group needs an assigned teacher." : "يمكنك إضافة الطالب قبل إنشاء المجموعة؛ المجموعة فقط تحتاج مدرسًا مسؤولًا."}
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
            {PERIOD_LABELS[p][en ? "en" : "ar"]}
          </Link>
        ))}
      </div>

      {/* Master BI metrics — current month */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={en ? "Total active students" : "إجمالي الطلاب النشطين"}
          value={d.activeStudents}
          hint={en ? "Active accounts this month" : "الحسابات النشطة هذا الشهر"}
          icon={Users}
          accent="primary"
          href="/students"
          className="animate-fade-up stagger-1"
          countUp
        />
        <StatCard
          label={en ? "Expected / collected revenue" : "الإيراد المتوقع / المحصّل"}
          value={formatCurrency(d.expectedRevenueThisMonth, "EGP", en ? "en-EG" : "ar-EG")}
          hint={`${en ? "Collected" : "المحصّل"}: ${formatCurrency(d.collectedRevenueThisMonth, "EGP", en ? "en-EG" : "ar-EG")}`}
          icon={Wallet}
          accent="success"
          href="/payments"
          className="animate-fade-up stagger-2"
        />
        <StatCard
          label={en ? "Academy attendance" : "نسبة حضور الأكاديمية"}
          value={d.overallAttendanceSessionsThisMonth === 0 ? (en ? "N/A" : "—") : `${d.overallAttendanceThisMonth}%`}
          hint={d.overallAttendanceSessionsThisMonth === 0 ? (en ? "No attendance recorded yet" : "لم تُسجّل حصص بعد") : (en ? "Current month, canceled lessons excluded" : "هذا الشهر مع استبعاد الحصص الملغاة")}
          icon={CalendarCheck}
          accent="info"
          className="animate-fade-up stagger-3"
        />
        <StatCard
          label={en ? "At-risk students" : "الطلاب المعرضون للخطر"}
          value={d.atRiskCount}
          hint={en ? "Warning or critical" : "تحذير أو خطر حرج"}
          icon={AlertTriangle}
          accent="destructive"
          href="#at-risk"
          className="animate-fade-up stagger-4"
          countUp
        />
      </div>

      {/* Finance metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={en ? "Due this month" : "المطلوب تحصيله هذا الشهر"}
          value={formatCurrency(d.monthlyRevenue, "EGP", en ? "en-EG" : "ar-EG")}
          hint={en ? "Expected payments" : "إجمالي المدفوعات المطلوبة"}
          icon={Wallet}
          accent="primary"
          href="/payments"
        />
        <StatCard
          label={en ? "Collected this month" : "المحصّل هذا الشهر"}
          value={formatCurrency(d.collectedThisMonth, "EGP", en ? "en-EG" : "ar-EG")}
          hint={en ? "Successfully received" : "المبالغ التي تم استلامها"}
          icon={Wallet}
          accent="success"
          href="/payments"
        />
        <StatCard
          label={en ? "Outstanding" : "المتبقي للتحصيل"}
          value={formatCurrency(d.outstanding, "EGP", en ? "en-EG" : "ar-EG")}
          hint={en ? "All unpaid balances" : "كل الأرصدة غير المحصّلة"}
          icon={TrendingDown}
          accent="warning"
          href="/payments"
        />
        <StatCard
          label={en ? "Collection trend" : "اتجاه التحصيل"}
          value={`${d.collectionTrend >= 0 ? "+" : ""}${d.collectionTrend}%`}
          hint={en ? "Compared with last month" : "مقارنة بالشهر السابق"}
          icon={TrendingDown}
          accent={d.collectionTrend >= 0 ? "success" : "destructive"}
          href="/reports"
        />
      </div>

      {/* BI charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{en ? "Revenue by group" : "الإيراد حسب المجموعة"}</CardTitle>
            <CardDescription>{en ? "Expected, collected, and unpaid for the current month" : "المتوقع والمحصّل وغير المدفوع خلال الشهر الحالي"}</CardDescription>
          </CardHeader>
          <CardContent>
            {d.revenueByGroup.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{en ? "No group revenue data yet." : "لا توجد بيانات إيراد للمجموعات بعد."}</p>
            ) : (
              <GroupedBars
                data={d.revenueByGroup.slice(0, 8)}
                xKey="name"
                keys={[
                  { key: "collected", label: en ? "Collected" : "المحصّل", color: "#10b981" },
                  { key: "unpaid", label: en ? "Unpaid" : "غير مدفوع", color: "#f59e0b" },
                ]}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{en ? "Attendance — last 4 weeks" : "الحضور — آخر ٤ أسابيع"}</CardTitle>
            <CardDescription>{en ? "Weekly percentage excluding canceled lessons" : "النسبة الأسبوعية مع استبعاد الحصص الملغاة"}</CardDescription>
          </CardHeader>
          <CardContent>
            <LineTrend data={d.attendanceTrend4Weeks} dataKey="rate" xKey="week" color="#0ea5e9" />
          </CardContent>
        </Card>
      </div>

      {/* Existing trend and distribution views */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{en ? "Revenue by month" : "الإيرادات حسب الشهر"}</CardTitle>
              <CardDescription>{en ? `Revenue due over the last ${period === "year" ? "12" : "6"} months` : `الإيرادات المستحقة خلال آخر ${period === "year" ? "12" : "6"} أشهر`}</CardDescription>
            </div>
            <Badge variant="secondary">{en ? "EGP" : "جنيه"}</Badge>
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
            <CardTitle>{en ? "Students by subject" : "الطلاب حسب المادة"}</CardTitle>
            <CardDescription>{en ? "Enrollment distribution" : "توزيع التسجيل"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Donut
              data={d.studentsByCourse.map((s) => ({
                name: s.course,
                value: s.students,
                color: s.color,
              }))}
              centerValue={String(d.totalStudents)}
              centerLabel={en ? "Students" : "طالب"}
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
            <CardTitle>{en ? "Attendance trend" : "اتجاه الحضور"}</CardTitle>
            <CardDescription>{en ? "Attendance and lateness across recent lessons" : "نسبة الحضور والتأخير عبر أحدث الحصص"}</CardDescription>
          </CardHeader>
          <CardContent>
            <LineTrend data={d.attendanceTrend} dataKey="rate" xKey="week" color="#10b981" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{en ? "Grade performance" : "أداء الدرجات"}</CardTitle>
            <CardDescription>{en ? "Distribution of recent results" : "توزيع أحدث النتائج"}</CardDescription>
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
                      <span className="text-muted-foreground">{(GRADE_LEVEL[g.level]?.[en ? "en" : "ar"]) ?? g.level}</span>
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
      <div id="at-risk" className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming lessons */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{en ? "Upcoming lessons" : "الحصص القادمة"}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/lessons">{en ? "View all" : "عرض الكل"}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.upcomingLessons.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {en ? "No upcoming lessons scheduled." : "لا توجد حصص قادمة مجدولة."}
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
                      {formatDate(l.date, { month: "short" }, en ? "en-EG" : "ar-EG").split(" ")[0]}
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
                    {formatClockTime(l.start_time)}
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
              <AlertTriangle className="h-4 w-4 text-amber-500" /> {en ? "Smart alerts — at risk" : "تنبيهات ذكية — في خطر"}
            </CardTitle>
            <CardDescription>{en ? "Students automatically flagged as needing attention" : "طلاب تم رصدهم تلقائيًا قد يحتاجون تدخلًا"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {atRisk.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {en ? "No at-risk students — everyone is on track." : "لا يوجد طلاب في خطر — الجميع على المسار."}
              </p>
            ) : (
              atRisk.map((r) => (
                <div key={r.studentId} className="rounded-lg border border-border/70 p-3 transition-colors hover:bg-accent/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.groupName ?? (en ? "No group" : "بدون مجموعة")}</p>
                    </div>
                    <Badge variant={r.severity === "high" ? "destructive" : "warning"}>
                      {(SEVERITY[r.severity]?.[en ? "en" : "ar"]) ?? r.severity} · {r.riskScore}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-rose-700">{r.reasons.join(" · ") || (en ? "Needs review" : "يحتاج مراجعة")}</p>
                  <div className="mt-2 flex gap-3 text-xs font-medium">
                    <Link href={`/students/${r.studentId}`} className="text-primary hover:underline">{en ? "Profile" : "الملف"}</Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent payments + outstanding */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{en ? "Recent payments" : "أحدث المدفوعات"}</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/payments">{en ? "View all" : "عرض الكل"}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.recentPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {en ? "No payments recorded yet." : "لا توجد مدفوعات مسجلة بعد."}
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
                      {formatCurrency(p.amount_paid, "EGP", en ? "en-EG" : "ar-EG")}
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
            <CardTitle>{en ? "Outstanding this month" : "المتأخرات هذا الشهر"}</CardTitle>
            <CardDescription>{en ? "Unpaid or partially paid" : "غير مدفوعة أو مدفوعة جزئيًا"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.outstandingStudents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {en ? "No outstanding payments this month." : "لا توجد متأخرات هذا الشهر."}
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
                      {formatCurrency(p.remaining, "EGP", en ? "en-EG" : "ar-EG")}
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
