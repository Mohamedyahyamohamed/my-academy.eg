import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { resolveStudent, GradesService, requireRole } from "@/services";
import { collections } from "@/services/data/store";
import { formatDate, round } from "@/lib/utils";
import { performanceLevel, performanceColor } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StudentGradesPage() {
  const user = requireRole("STUDENT");
  const student = resolveStudent(user);
  const grades = student ? (await GradesService.listGrades({ studentId: student.id, pageSize: 100 })).items : [];
  const avg = grades.length ? round(grades.reduce((s, g) => s + (g.percentage ?? 0), 0) / grades.length, 0) : 0;
  const best = grades.length ? round(Math.max(...grades.map((g) => g.percentage ?? 0)), 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Grades" description="Your exam results and performance." />
      {grades.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No grades yet" description="Your results will appear here once published." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Average" value={`${avg}%`} icon={GraduationCap} accent="primary" />
            <StatCard label="Best score" value={`${best}%`} icon={GraduationCap} accent="success" />
            <StatCard label="Exams taken" value={grades.length} icon={GraduationCap} accent="info" />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Exam</TableHead><TableHead>Date</TableHead><TableHead>Score</TableHead><TableHead>%</TableHead><TableHead>Level</TableHead></TableRow></TableHeader>
                <TableBody>
                  {grades.map((g) => {
                    const exam = collections().exams.find((e) => e.id === g.exam_id);
                    const lvl = g.level ?? performanceLevel(g.percentage ?? 0);
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{exam?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{exam ? formatDate(exam.date) : "—"}</TableCell>
                        <TableCell>{g.score}/{exam?.max_score}</TableCell>
                        <TableCell className="font-medium">{Math.round(g.percentage ?? 0)}%</TableCell>
                        <TableCell><Badge className={performanceColor(lvl)}>{lvl}</Badge></TableCell>
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
