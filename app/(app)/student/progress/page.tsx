import { cookies } from "next/headers";
import { TrendingUp, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendArea } from "@/components/charts";
import { resolveStudent, GradesService, AttendanceService, requireScopedRole } from "@/services";
import { round, percentage } from "@/lib/utils";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
  const user = await requireScopedRole("STUDENT");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const student = resolveStudent(user);
  if (!student) {
    return (
      <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
        <PageHeader title={en ? "Progress" : "التقدم"} />
        <EmptyState icon={TrendingUp} title={en ? "Profile not linked" : "الملف غير مرتبط"} description={en ? "Contact your academy." : "تواصل مع الأكاديمية."} />
      </div>
    );
  }

  const grades = (await GradesService.listGrades({ studentId: student.id, pageSize: 100 }, user.academy_id)).items;
  const att = AttendanceService.studentAttendanceSummary(student.id, user.academy_id);
  const attendanceRate = percentage(att.present + att.late, att.total);
  const avgGrade = grades.length ? round(grades.reduce((s, g) => s + (g.percentage ?? 0), 0) / grades.length, 0) : 0;
  const trend = grades.slice(-6).map((g, i) => ({
    name: en ? `Exam ${i + 1}` : `اختبار ${i + 1}`,
    score: round(g.percentage ?? 0, 0),
  }));

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={en ? "Progress" : "التقدم"} description={en ? "Track your performance over time." : "تابع أداءك وتقدّمك بمرور الوقت."} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{en ? "Overall attendance" : "الحضور الإجمالي"}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold">{attendanceRate}%</p>
                <p className="text-sm text-muted-foreground">{att.present} {en ? "present" : "حاضر"} · {att.late} {en ? "late" : "متأخر"} · {att.absent} {en ? "absent" : "غائب"}</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-emerald-500" />
            </div>
            <Progress value={attendanceRate} indicatorClassName="bg-emerald-500" className="mt-4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{en ? "Overall average" : "المتوسط العام"}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold">{avgGrade}%</p>
                <p className="text-sm text-muted-foreground">{en ? `Across ${grades.length} exams` : `عبر ${grades.length} اختبار`}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <Progress value={avgGrade} className="mt-4" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{en ? "Grade trend" : "تطور الدرجات"}</CardTitle>
          <CardDescription>{en ? "Your scores (%) in the latest exams" : "درجاتك (%) في أحدث الاختبارات"}</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{en ? "There are not enough grades to show a trend yet." : "لا توجد درجات كافية لعرض تطور الأداء بعد."}</p>
          ) : (
            <TrendArea data={trend} dataKey="score" xKey="name" color="#7c5cfc" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
