import { TrendingUp, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendArea } from "@/components/charts";
import { resolveStudent, GradesService, AttendanceService, requireRole } from "@/services";
import { collections } from "@/services/data/store";
import { round, percentage } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
  const user = requireRole("STUDENT");
  const student = resolveStudent(user);
  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Progress" />
        <EmptyState icon={TrendingUp} title="Profile not linked" description="Contact the academy." />
      </div>
    );
  }

  const grades = (await GradesService.listGrades({ studentId: student.id, pageSize: 100 })).items;
  const att = AttendanceService.studentAttendanceSummary(student.id);
  const attendanceRate = percentage(att.present + att.late, att.total);
  const avgGrade = grades.length ? round(grades.reduce((s, g) => s + (g.percentage ?? 0), 0) / grades.length, 0) : 0;
  const trend = grades.slice(-6).map((g, i) => ({
    name: `E${i + 1}`,
    score: round(g.percentage ?? 0, 0),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" description="Track your performance over time." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Overall attendance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold">{attendanceRate}%</p>
                <p className="text-sm text-muted-foreground">{att.present} present · {att.late} late · {att.absent} absent</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-emerald-500" />
            </div>
            <Progress value={attendanceRate} indicatorClassName="bg-emerald-500" className="mt-4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Overall average</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold">{avgGrade}%</p>
                <p className="text-sm text-muted-foreground">Across {grades.length} exam(s)</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <Progress value={avgGrade} className="mt-4" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grade trend</CardTitle>
          <CardDescription>Your score (%) over recent exams</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No grades to show a trend yet.</p>
          ) : (
            <TrendArea data={trend} dataKey="score" xKey="name" color="#7c5cfc" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
