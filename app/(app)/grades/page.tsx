import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateExamDialog } from "@/components/grades/create-exam-dialog";
import { GradesService, MiscService, GroupsService, requireRole } from "@/services";
import { performanceColor, performanceLevel, performanceLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
  requireRole("ADMIN", "TEACHER");
  const exams = await GradesService.listExams();
  const courses = await MiscService.listCourses();
  const groups = await GroupsService.listGroups();
  // Pre-fetch all grades to compute counts (avoids await inside .map()).
  const allGrades = (await GradesService.listGrades({ pageSize: 5000 })).items;
  const gradeCountFor = (examId: string) => allGrades.filter((g: any) => g.exam_id === examId).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الدرجات"
        description="أنشئ الاختبارات وسجّل درجات الطلاب لمتابعة مستوى الأداء."
      >
        <CreateExamDialog courses={courses} groups={groups} />
      </PageHeader>

      {exams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="لا توجد اختبارات بعد"
          description="أنشئ أول اختبار لبدء إدخال الدرجات."
          action={<CreateExamDialog courses={courses} groups={groups} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((e) => {
            const avg = GradesService.examAverage(e.id);
            const level = performanceLevel(avg);
            const count = gradeCountFor(e.id);
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
                      <Badge variant="secondary">{gradeCountFor(e.id)} درجات مسجّلة</Badge>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{avg}%</p>
                        <p className="text-[11px] text-muted-foreground">متوسط المجموعة</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                      <Badge className={performanceColor(level)}>{performanceLabel(level)}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        إدخال الدرجات <ArrowRight className="h-3.5 w-3.5" />
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
