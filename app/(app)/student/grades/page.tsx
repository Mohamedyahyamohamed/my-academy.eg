import { cookies } from "next/headers";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { resolveStudentForDashboard, GradesService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";
import { formatDate, round } from "@/lib/utils";
import { performanceLevel, performanceColor, performanceLabel } from "@/lib/constants";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StudentGradesPage() {
  const user = await requireScopedRole("STUDENT");
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const student = await resolveStudentForDashboard(user);
  const grades = student ? (await GradesService.listGrades({ studentId: student.id, pageSize: 100 }, user.academy_id)).items : [];
  const avg = grades.length ? round(grades.reduce((s, g) => s + (g.percentage ?? 0), 0) / grades.length, 0) : 0;
  const best = grades.length ? round(Math.max(...grades.map((g) => g.percentage ?? 0)), 0) : 0;

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader title={en ? "Grades" : "الدرجات"} description={en ? "Your exam results and performance level." : "نتائج امتحاناتك ومستوى أدائك."} />
      {grades.length === 0 ? (
        <EmptyState icon={GraduationCap} title={en ? "No grades yet" : "لا توجد درجات بعد"} description={en ? "Your results will appear here after they are published." : "ستظهر نتائجك هنا بعد نشرها."} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={en ? "Average" : "المتوسط"} value={`${avg}%`} icon={GraduationCap} accent="primary" />
            <StatCard label={en ? "Highest score" : "أعلى درجة"} value={`${best}%`} icon={GraduationCap} accent="success" />
            <StatCard label={en ? "Completed exams" : "اختبارات مكتملة"} value={grades.length} icon={GraduationCap} accent="info" />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>{en ? "Exam" : "الاختبار"}</TableHead><TableHead>{en ? "Date" : "التاريخ"}</TableHead><TableHead>{en ? "Score" : "الدرجة"}</TableHead><TableHead>%</TableHead><TableHead>{en ? "Rating" : "التقدير"}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {grades.map((g) => {
                    const exam = collections().exams.find((e) => e.id === g.exam_id);
                    const lvl = g.level ?? performanceLevel(g.percentage ?? 0);
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{exam?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{exam ? formatDate(exam.date, undefined, en ? "en-EG" : "ar-EG") : "—"}</TableCell>
                        <TableCell>{g.score}/{exam?.max_score}</TableCell>
                        <TableCell className="font-medium">{Math.round(g.percentage ?? 0)}%</TableCell>
                        <TableCell><Badge className={performanceColor(lvl)}>{performanceLabel(lvl)}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
