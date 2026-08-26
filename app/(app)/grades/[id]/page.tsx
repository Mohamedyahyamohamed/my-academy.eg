import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeEntry } from "@/components/grades/grade-entry";
import { ExamPapers } from "@/components/grades/exam-papers";
import { DeleteExamDetailButton } from "@/components/grades/delete-exam-button";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { GradesService, requireScopedRole } from "@/services";
import { fetchTableRLS } from "@/services/_shared";
import { fullName, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExamGradePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireScopedRole("TEACHER");
  const exam = await GradesService.getExam(params.id, user.academy_id);
  if (!exam) notFound();
  const [roster, studentsRows, papersRes] = await Promise.all([
    GradesService.gradesForExam(params.id, user.academy_id, exam),
    fetchTableRLS<any>("students", user.academy_id),
    (async () => {
      const adminClient = nodeSupabaseClient();
      if (!adminClient) return [] as any[];
      try {
        const res = await Promise.race([
          adminClient.from("files").select("id, name, mime_type, size").eq("exam_id", params.id).order("created_at", { ascending: false }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
        ]);
        return res?.data ?? ([] as any[]);
      } catch {
        return [] as any[];
      }
    })(),
  ]);
  const students = studentsRows;
  const papers = papersRes as { id: string; name: string; mime_type: string | null; size: number | null }[];
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const rosterNamed = roster.map((r) => {
    const s = students.find((x: any) => x.id === r.studentId);
    return {
      studentId: r.studentId,
      score: r.score,
      notes: r.notes,
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
        <div className="flex items-center gap-2">
          <DeleteExamDetailButton examId={params.id} examName={exam.name} />
          <Button asChild variant="outline">
            <Link href="/grades"><ArrowLeft className="h-4 w-4" /> {en ? "Back" : "رجوع"}</Link>
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{en ? "Type: " : "النوع: "}{exam.type === "homework" ? (en ? "Homework" : "واجب") : exam.type === "quiz" ? (en ? "Quiz" : "اختبار قصير") : (en ? "Exam" : "امتحان")}</Badge>
        <Badge variant="secondary">{en ? "Maximum score: " : "الدرجة النهائية: "}{exam.max_score}</Badge>
        <Badge variant="info">{roster.length} {en ? "students" : "طلاب"}</Badge>
      </div>

      <ExamPapers examId={params.id} papers={papers} />

      <GradeEntry examId={params.id} maxScore={exam.max_score} roster={rosterNamed} />
    </div>
  );
}
