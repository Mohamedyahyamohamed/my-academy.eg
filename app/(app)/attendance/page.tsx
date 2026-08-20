import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { AttendanceWorkshop } from "@/components/attendance/attendance-workshop";
import { GroupsService, LessonsService, StudentsService, currentTeacherId, requireAttendanceTeacher } from "@/services";
import { collections } from "@/services/data/store";
import { cookies } from "next/headers";
import { getLangFromCookie } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const user = await requireAttendanceTeacher();
  const teacherProfileId = currentTeacherId() ?? undefined;
  const groups = await GroupsService.listGroups("", user.academy_id, teacherProfileId);
  const lessons = (await LessonsService.listLessons({ pageSize: 500 }, user.academy_id, teacherProfileId)).items;
  const students = (await StudentsService.listStudents({ pageSize: 500 }, user.academy_id)).items;
  const allowedGroupIds = new Set(groups.map((group) => group.id));
  const scopedMemberships = allowedGroupIds.size
    ? (await (await (await import("@/lib/supabase/server")).createServerSupabaseClient())
      .from("group_students")
      .select("group_id, student_id")
      .in("group_id", Array.from(allowedGroupIds))
      .limit(5000)).data
    : [];
  const enrollments = (scopedMemberships?.length ? scopedMemberships : collections().groupStudents
    .filter((gs) => allowedGroupIds.has(gs.group_id))
    .map((gs) => ({ group_id: gs.group_id, student_id: gs.student_id })))
    .map((gs: any) => ({
      groupId: gs.group_id,
      studentId: gs.student_id,
    }));

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={en ? "Attendance" : "الحضور"}
        description={en ? "Choose a group and lesson, then record each student's attendance in seconds." : "اختر المجموعة والحصة، ثم سجّل حضور كل طالب خلال ثوانٍ."}
      >
        <Button asChild variant="outline">
          <Link href="/attendance/scan"><ScanLine className="h-4 w-4" /> {en ? "Scan student QR codes" : "امسح أكواد الطلاب (QR)"}</Link>
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
