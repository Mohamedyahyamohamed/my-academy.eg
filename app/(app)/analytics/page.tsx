import { TrendingUp, BarChart3, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { TrendArea, GroupedBars, LineTrend, Bars } from "@/components/charts";
import { DashboardService, requireRole } from "@/services";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  requireRole("ADMIN");
  const a = await DashboardService.getAnalytics();
  const d = await DashboardService.getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="التحليلات"
        description="اتجاهات ورؤى تجيب عن أسئلة حقيقية حول أكاديميتك."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الطلاب" value={d.totalStudents} hint="المسجلون إجمالًا" icon={Users} accent="primary" />
        <StatCard label="المجموعات النشطة" value={d.totalGroups} icon={BarChart3} accent="info" />
        <StatCard label="نسبة الحضور" value={`${d.attendanceRate}%`} icon={TrendingUp} accent="success" />
        <StatCard label="المتبقي (المتأخرات)" value={formatCurrency(d.outstanding)} icon={Wallet} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">نمو الطلاب</CardTitle>
            <CardDescription>عدد الطلاب المسجلين تراكميًا عبر الزمن</CardDescription>
          </CardHeader>
          <CardContent><TrendArea data={a.studentGrowth} dataKey="students" xKey="month" color="#7c5cfc" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الإيرادات: المستحق مقابل المحصّل</CardTitle>
            <CardDescription>هل التحصيل يواكب الفوترة؟</CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedBars
              data={a.monthlyRevenue}
              xKey="month"
              keys={[
                { key: "revenue", label: "المستحق", color: "#c4b5fd" },
                { key: "collected", label: "المحصّل", color: "#7c5cfc" },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اتجاه الحضور</CardTitle>
            <CardDescription>نسبة الحضور والتأخير حسب الشهر</CardDescription>
          </CardHeader>
          <CardContent><LineTrend data={a.attendanceTrend} dataKey="rate" xKey="month" color="#10b981" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">متوسط الدرجات حسب المادة</CardTitle>
            <CardDescription>أين يتفوق الطلاب أكثر؟</CardDescription>
          </CardHeader>
          <CardContent>
            {a.averageGrades.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد درجات بعد.</p>
            ) : (
              <Bars data={a.averageGrades} dataKey="average" xKey="course" color="#0ea5e9" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">أكثر المواد شهرة</CardTitle><CardDescription>حسب عدد المسجلين</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {a.popularCourses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
            ) : (
              a.popularCourses.map((c) => {
                const max = Math.max(...a.popularCourses.map((x) => x.students));
                return (
                  <div key={c.course} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{c.course}</span>
                      <span className="font-medium">{c.students} طالب · {formatCurrency(c.revenue)}</span>
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
          <CardHeader><CardTitle className="text-base">أكثر المجموعات ربحًا</CardTitle><CardDescription>حسب الإيراد المحصّل</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {a.profitableGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
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
