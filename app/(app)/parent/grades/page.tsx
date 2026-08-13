import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getParentDashboard, GradesService, requireRole } from "@/services";
import { collections } from "@/services/data/store";
import { fullName } from "@/lib/utils";
import { performanceLevel, performanceColor, performanceLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ParentGradesPage() {
  const user = requireRole("PARENT");
  const { children } = await getParentDashboard(user);
  const childGrades = await Promise.all(
    children.map((c) => GradesService.listGrades({ studentId: c.id, pageSize: 50 })),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="الدرجات" description="نتائج الامتحانات لكل أبنائك." />
      {children.length === 0 ? (
        <EmptyState icon={GraduationCap} title="لا توجد بيانات" description="لا يوجد أبناء مرتبطون بالحساب." />
      ) : (
        <div className="space-y-6">
          {children.map((c, idx) => {
            const grades = (childGrades[idx] ?? { items: [] as any[] }).items;
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <StudentAvatar name={fullName(c)} size="sm" />
                    <p className="font-semibold">{fullName(c)}</p>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>الاختبار</TableHead><TableHead>الدرجة</TableHead><TableHead>%</TableHead><TableHead>التقدير</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {grades.map((g) => {
                        const exam = collections().exams.find((e) => e.id === g.exam_id);
                        const lvl = g.level ?? performanceLevel(g.percentage ?? 0);
                        return (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">{exam?.name ?? "—"}</TableCell>
                            <TableCell>{g.score}/{exam?.max_score}</TableCell>
                            <TableCell>{Math.round(g.percentage ?? 0)}%</TableCell>
                            <TableCell><Badge className={performanceColor(lvl)}>{performanceLabel(lvl)}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                      {grades.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">لا توجد درجات بعد.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
