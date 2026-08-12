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
        description="Trends and insights that answer real questions about your academy."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={d.totalStudents} hint="Enrolled overall" icon={Users} accent="primary" />
        <StatCard label="Active groups" value={d.totalGroups} icon={BarChart3} accent="info" />
        <StatCard label="Attendance rate" value={`${d.attendanceRate}%`} icon={TrendingUp} accent="success" />
        <StatCard label="Outstanding" value={formatCurrency(d.outstanding)} icon={Wallet} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student growth</CardTitle>
            <CardDescription>Cumulative enrolled students over time</CardDescription>
          </CardHeader>
          <CardContent><TrendArea data={a.studentGrowth} dataKey="students" xKey="month" color="#7c5cfc" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue: billed vs collected</CardTitle>
            <CardDescription>Are collections keeping up with billing?</CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedBars
              data={a.monthlyRevenue}
              xKey="month"
              keys={[
                { key: "revenue", label: "Billed", color: "#c4b5fd" },
                { key: "collected", label: "Collected", color: "#7c5cfc" },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance trend</CardTitle>
            <CardDescription>Present+late rate by month</CardDescription>
          </CardHeader>
          <CardContent><LineTrend data={a.attendanceTrend} dataKey="rate" xKey="month" color="#10b981" /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average grade by course</CardTitle>
            <CardDescription>Where are students strongest?</CardDescription>
          </CardHeader>
          <CardContent>
            {a.averageGrades.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No grade data yet.</p>
            ) : (
              <Bars data={a.averageGrades} dataKey="average" xKey="course" color="#0ea5e9" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Most popular courses</CardTitle><CardDescription>By enrollment</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {a.popularCourses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              a.popularCourses.map((c) => {
                const max = Math.max(...a.popularCourses.map((x) => x.students));
                return (
                  <div key={c.course} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{c.course}</span>
                      <span className="font-medium">{c.students} students · {formatCurrency(c.revenue)}</span>
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
          <CardHeader><CardTitle className="text-base">Most profitable groups</CardTitle><CardDescription>By collected revenue</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {a.profitableGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data.</p>
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
