import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceBadge, StudentStatusBadge } from "@/components/shared/badges";
import { StudentAvatar } from "@/components/shared/student-avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getParentDashboard, AttendanceService, requireRole } from "@/services";
import { collections } from "@/services/data/store";
import { formatDate, fullName, percentage } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ParentAttendancePage() {
  const user = requireRole("PARENT");
  const { children } = await getParentDashboard(user);

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Attendance records for all your children." />
      {children.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No data" description="No children linked." />
      ) : (
        <div className="space-y-6">
          {children.map((c) => {
            const att = AttendanceService.studentAttendanceSummary(c.id);
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={fullName(c)} size="sm" />
                      <p className="font-semibold">{fullName(c)}</p>
                    </div>
                    <AttendanceBadge status={att.present > att.absent ? "PRESENT" : "ABSENT"} />
                    <span className="text-sm text-muted-foreground">{percentage(att.present + att.late, att.total)}% present</span>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Group</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {att.byLesson.slice().reverse().slice(0, 8).map((a) => {
                        const lesson = collections().lessons.find((l) => l.id === a.lesson_id);
                        const group = lesson ? collections().groups.find((g) => g.id === lesson.group_id) : undefined;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-sm">{lesson ? formatDate(lesson.date) : "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{group?.name ?? "—"}</TableCell>
                            <TableCell><AttendanceBadge status={a.status} /></TableCell>
                          </TableRow>
                        );
                      })}
                      {att.byLesson.length === 0 && <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No records.</TableCell></TableRow>}
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
