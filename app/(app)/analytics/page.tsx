import { TrendingUp, BarChart3, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { TrendArea, GroupedBars, LineTrend, Bars } from "@/components/charts";
import { DashboardService, LifecycleAnalyticsService, requireScopedRole } from "@/services";
import { formatCurrency } from "@/lib/utils";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireScopedRole("ADMIN");
  const a = await DashboardService.getAnalytics(user.academy_id);
  const d = await DashboardService.getDashboardData("month", user.academy_id);
  const lifecycle = await LifecycleAnalyticsService.getLifecycleAnalytics(user.academy_id);

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Analytics" : "التحليلات"}
        description={en ? "Trends and insights that answer real questions about your academy." : "اتجاهات ورؤى تجيب عن أسئلة حقيقية حول أكاديميتك."}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={en ? "Total students" : "إجمالي الطلاب"} value={d.totalStudents} hint={en ? "Total enrolled" : "المسجلون إجمالًا"} icon={Users} accent="primary" />
        <StatCard label={en ? "Active groups" : "المجموعات النشطة"} value={d.totalGroups} icon={BarChart3} accent="info" />
        <StatCard label={en ? "Attendance rate" : "نسبة الحضور"} value={d.attendanceSessions ? `${d.attendanceRate}%` : (en ? "Not recorded" : "لم يُسجّل بعد")} icon={TrendingUp} accent="success" />
        <StatCard label={en ? "Outstanding balance" : "المتبقي (المتأخرات)"} value={formatCurrency(d.outstanding)} icon={Wallet} accent="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{en ? "Growth and subscription funnel" : "مسار النمو والاشتراكات"}</CardTitle>
          <CardDescription>{en ? "Measure signups, invitations, and conversions inside your academy." : "قياس التسجيل والدعوات والتحويلات داخل أكاديميتك."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [en ? "Academy signups" : "تسجيلات الأكاديميات", lifecycle.signups],
            [en ? "Invites created" : "دعوات منشأة", lifecycle.invitesCreated],
            [en ? "Invites accepted" : "دعوات مقبولة", `${lifecycle.invitesAccepted} (${lifecycle.inviteAcceptanceRate}%)`],
            [en ? "Paid conversions" : "تحويلات مدفوعة", `${lifecycle.paidConversions} (${lifecycle.conversionRate}%)`],
            [en ? "Active subscriptions" : "اشتراكات نشطة", lifecycle.activeSubscriptions],
            [en ? "Cancellations" : "إلغاءات", lifecycle.cancellations],
            [en ? "Checkout starts" : "بدايات الدفع", lifecycle.checkoutsStarted],
            [en ? "Onboarding completed" : "إعداد أولي مكتمل", lifecycle.onboardingCompleted],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{en ? "Student growth" : "نمو الطلاب"}</CardTitle>
            <CardDescription>{en ? "Cumulative number of enrolled students over time" : "عدد الطلاب المسجلين تراكميًا عبر الزمن"}</CardDescription>
          </CardHeader>
          <CardContent><TrendArea data={a.studentGrowth} dataKey="students" xKey="month" color="#7c5cfc" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{en ? "Revenue: due vs. collected" : "الإيرادات: المستحق مقابل المحصّل"}</CardTitle>
            <CardDescription>{en ? "Is collection keeping up with billing?" : "هل التحصيل يواكب الفوترة؟"}</CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedBars
              data={a.monthlyRevenue}
              xKey="month"
              keys={[
                { key: "revenue", label: en ? "Due" : "المستحق", color: "#c4b5fd" },
                { key: "collected", label: en ? "Collected" : "المحصّل", color: "#7c5cfc" },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{en ? "Attendance trend" : "اتجاه الحضور"}</CardTitle>
            <CardDescription>{en ? "Attendance and lateness rate by month" : "نسبة الحضور والتأخير حسب الشهر"}</CardDescription>
          </CardHeader>
          <CardContent><LineTrend data={a.attendanceTrend} dataKey="rate" xKey="month" color="#10b981" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{en ? "Average grades by course" : "متوسط الدرجات حسب المادة"}</CardTitle>
            <CardDescription>{en ? "Where do students perform best?" : "أين يتفوق الطلاب أكثر؟"}</CardDescription>
          </CardHeader>
          <CardContent>
            {a.averageGrades.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{en ? "No grades yet." : "لا توجد درجات بعد."}</p>
            ) : (
              <Bars data={a.averageGrades} dataKey="average" xKey="course" color="#0ea5e9" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{en ? "Most popular courses" : "أكثر المواد شهرة"}</CardTitle><CardDescription>{en ? "By enrollment count" : "حسب عدد المسجلين"}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {a.popularCourses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{en ? "No data available." : "لا توجد بيانات."}</p>
            ) : (
              a.popularCourses.map((c) => {
                const max = Math.max(...a.popularCourses.map((x) => x.students));
                return (
                  <div key={c.course} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{c.course}</span>
                      <span className="font-medium">{c.students} {en ? "students" : "طالب"} · {formatCurrency(c.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(c.students / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{en ? "Most profitable groups" : "أكثر المجموعات ربحًا"}</CardTitle><CardDescription>{en ? "By collected revenue" : "حسب الإيراد المحصّل"}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {a.profitableGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{en ? "No data available." : "لا توجد بيانات."}</p>
            ) : (
              a.profitableGroups.map((g) => {
                const max = Math.max(...a.profitableGroups.map((x) => x.revenue));
                return (
                  <div key={g.group} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2 text-muted-foreground">{g.group}</span>
                      <span className="shrink-0 font-medium">{formatCurrency(g.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(g.revenue / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
