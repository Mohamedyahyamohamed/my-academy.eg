import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { AttendanceWorkshop } from "@/components/attendance/attendance-workshop";
import { GroupsService, LessonsService, StudentsService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const groups = await GroupsService.listGroups("", user.academy_id, user.id);
  const lessons = (await LessonsService.listLessons({ pageSize: 500 }, user.academy_id, user.id)).items;
  const students = (await StudentsService.listStudents({ pageSize: 500 }, user.academy_id)).items;
  const enrollments = collections().groupStudents.map((gs) => ({
    groupId: gs.group_id,
    studentId: gs.student_id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور"
        description="اختر المجموعة والحصة، ثم سجّل حضور كل طالب خلال ثوانٍ."
      >
        <Button asChild variant="outline">
          <Link href="/attendance/scan"><ScanLine className="h-4 w-4" /> امسح أكواد الطلاب (QR)</Link>
        </Button>
      </PageHeader>
      <AttendanceWorkshop
        groups={groups}
        lessons={lessons}
        students={students}
        enrollments={enrollments}
      />
    </div>
  );
}
