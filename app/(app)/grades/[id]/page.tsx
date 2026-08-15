import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeEntry } from "@/components/grades/grade-entry";
import { GradesService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";
import { fullName, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExamGradePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requireScopedRole("TEACHER");
  const exam = await GradesService.getExam(params.id);
  if (!exam) notFound();
  const roster = GradesService.gradesForExam(params.id);
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const rosterNamed = roster.map((r) => {
    const s = collections().students.find((x) => x.id === r.studentId);
    return {
      studentId: r.studentId,
      score: r.score,
      name: s ? fullName(s) : (en ? "Unknown" : "غير معروف"),
    };
  });

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={exam.name}
        description={`${exam.course?.name} · ${exam.group?.name} · ${formatDate(exam.date, undefined, en ? "en-EG" : "ar-EG")}`}
        breadcrumbs={[{ label: en ? "Grades" : "الدرجات", href: "/grades" }, { label: exam.name }]}
      >
        <Button asChild variant="outline">
          <Link href="/grades"><ArrowLeft className="h-4 w-4" /> {en ? "Back" : "رجوع"}</Link>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{en ? "Maximum score: " : "الدرجة النهائية: "}{exam.max_score}</Badge>
        <Badge variant="info">{roster.length} {en ? "students" : "طلاب"}</Badge>
      </div>

      <GradeEntry examId={params.id} maxScore={exam.max_score} roster={rosterNamed} />
    </div>
  );
}
