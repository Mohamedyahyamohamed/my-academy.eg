import { GraduationCap } from "lucide-react";
import { cookies } from "next/headers";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/shared/student-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getParentDashboard, GradesService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";
import { fullName } from "@/lib/utils";
import { performanceLevel, performanceColor, performanceLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ParentGradesPage() {
  const user = await requireScopedRole("PARENT");
  const { children } = await getParentDashboard(user);
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  const childGrades = await Promise.all(
    children.map((c) => GradesService.listGrades({ studentId: c.id, pageSize: 50 }, user.academy_id)),
  );

  return (
    <div className="space-y-6">
      <PageHeader title={en ? "Grades" : "الدرجات"} description={en ? "Exam results for all your children." : "نتائج الامتحانات لكل أبنائك."} />
      {children.length === 0 ? (
        <EmptyState icon={GraduationCap} title={en ? "No data" : "لا توجد بيانات"} description={en ? "No children are linked to this account." : "لا يوجد أبناء مرتبطون بالحساب."} />
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
                    <TableHeader><TableRow><TableHead>{en ? "Exam" : "الاختبار"}</TableHead><TableHead>{en ? "Score" : "الدرجة"}</TableHead><TableHead>%</TableHead><TableHead>{en ? "Rating" : "التقدير"}</TableHead></TableRow></TableHeader>
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
                      {grades.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">{en ? "No grades yet." : "لا توجد درجات بعد."}</TableCell></TableRow>}
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
