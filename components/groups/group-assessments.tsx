"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateExamDialog } from "@/components/grades/create-exam-dialog";
import { performanceColor, performanceLabel, performanceLevel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useClientLang } from "@/lib/i18n-client";
import type { Course, Exam, Group } from "@/types";

type AssessmentStat = { count: number; average: number };

function typeLabel(type: Exam["type"], en: boolean) {
  if (type === "homework") return en ? "Homework" : "واجب";
  if (type === "quiz") return en ? "Quiz" : "اختبار قصير";
  return en ? "Exam" : "امتحان";
}

export function GroupAssessments({
  group,
  course,
  assessments,
  stats,
}: {
  group: Group;
  course: Course | null | undefined;
  assessments: Exam[];
  stats: Record<string, AssessmentStat>;
}) {
  const en = useClientLang() === "en";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            {en ? "Assessments & grades" : "التقييمات والدرجات"}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {en ? "Create assessments and open each one to enter student scores." : "أنشئ تقييمات وافتح أي تقييم لإدخال درجات الطلاب."}
          </p>
        </div>
        {course && <CreateExamDialog courses={[course]} groups={[group]} />}
      </CardHeader>
      <CardContent>
        {assessments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="font-medium">{en ? "No assessments yet" : "لا توجد تقييمات بعد"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{en ? "Use the button above to create the first one." : "استخدم الزر أعلاه لإنشاء أول تقييم."}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assessments.map((assessment) => {
              const stat = stats[assessment.id] ?? { count: 0, average: 0 };
              const level = performanceLevel(stat.average);
              return (
                <Link key={assessment.id} href={`/grades/${assessment.id}`} className="group rounded-xl border p-4 transition hover:border-primary/50 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold group-hover:text-primary">{assessment.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {typeLabel(assessment.type, en)} · {formatDate(assessment.date, undefined, en ? "en-EG" : "ar-EG")}
                      </p>
                    </div>
                    <Badge variant="secondary">{assessment.max_score} {en ? "pts" : "درجة"}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <Badge variant="outline">{stat.count} {en ? "graded" : "تم تصحيحهم"}</Badge>
                    <span className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{stat.average}%</span>
                      <Badge className={performanceColor(level)}>{performanceLabel(level, en)}</Badge>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
