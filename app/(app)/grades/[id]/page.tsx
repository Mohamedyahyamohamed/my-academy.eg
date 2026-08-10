import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeEntry } from "@/components/grades/grade-entry";
import { GradesService, requireRole } from "@/services";
import { collections } from "@/services/data/store";
import { fullName, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExamGradePage({ params }: { params: { id: string } }) {
  requireRole("ADMIN", "TEACHER");
  const exam = await GradesService.getExam(params.id);
  if (!exam) notFound();
  const roster = GradesService.gradesForExam(params.id);
  const rosterNamed = roster.map((r) => {
    const s = collections().students.find((x) => x.id === r.studentId);
    return {
      studentId: r.studentId,
      score: r.score,
      name: s ? fullName(s) : "Unknown",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam.name}
        description={`${exam.course?.name} · ${exam.group?.name} · ${formatDate(exam.date)}`}
        breadcrumbs={[{ label: "Grades", href: "/grades" }, { label: exam.name }]}
      >
        <Button asChild variant="outline">
          <Link href="/grades"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Maximum score: {exam.max_score}</Badge>
        <Badge variant="info">{roster.length} students</Badge>
      </div>

      <GradeEntry examId={params.id} maxScore={exam.max_score} roster={rosterNamed} />
    </div>
  );
}
