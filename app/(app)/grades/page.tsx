import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateExamDialog } from "@/components/grades/create-exam-dialog";
import { GradesService, MiscService, GroupsService, requireScopedRole } from "@/services";
import { performanceColor, performanceLevel, performanceLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
  const user = await requireScopedRole("TEACHER");
  const exams = await GradesService.listExams(user.academy_id, user.id);
  const courses = await MiscService.listCourses(user.academy_id);
  const groups = await GroupsService.listGroups("", user.academy_id);
  // Pre-fetch all grades to compute counts (avoids await inside .map()).
  const allGrades = (await GradesService.listGrades({ pageSize: 5000 }, user.academy_id, user.id)).items;
  const gradeStats = new Map<string, { count: number; average: number }>();
  for (const exam of exams) {
    const examGrades = allGrades.filter((grade) => grade.exam_id === exam.id);
    const average = examGrades.length
      ? Math.round(examGrades.reduce((sum, grade) => sum + (grade.score / exam.max_score) * 100, 0) / examGrades.length)
      : 0;
    gradeStats.set(exam.id, { count: examGrades.length, average });
  }
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Grades" : "الدرجات"}
        description={en ? "Create exams and record student grades to track performance." : "أنشئ الاختبارات وسجّل درجات الطلاب لمتابعة مستوى الأداء."}
      >
        <CreateExamDialog courses={courses} groups={groups} />
      </PageHeader>

      {exams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={en ? "No exams yet" : "لا توجد اختبارات بعد"}
          description={en ? "Create your first exam to start recording grades." : "أنشئ أول اختبار لبدء إدخال الدرجات."}
          action={<CreateExamDialog courses={courses} groups={groups} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((e) => {
            const stats = gradeStats.get(e.id) ?? { count: 0, average: 0 };
            const avg = stats.average;
            const level = performanceLevel(avg);
            const count = stats.count;
            return (
              <Link key={e.id} href={`/grades/${e.id}`}>
                <Card className="h-full transition-shadow hover:shadow-elevated">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.course?.name} · {e.group?.name}</p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white" style={{ background: e.course?.color ?? "#7c5cfc" }}>
                        {e.max_score}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge variant="secondary">{count} {en ? "grades recorded" : "درجات مسجّلة"}</Badge>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{avg}%</p>
                        <p className="text-[11px] text-muted-foreground">{en ? "Group average" : "متوسط المجموعة"}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                      <Badge className={performanceColor(level)}>{performanceLabel(level, en)}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {en ? "Enter grades" : "إدخال الدرجات"} <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
