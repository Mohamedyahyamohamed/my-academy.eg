import { PageHeader } from "@/components/shared/page-header";
import { ScanWorkshop } from "@/components/attendance/scan-workshop";
import { GroupsService, LessonsService, StudentsService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";

export const dynamic = "force-dynamic";

export default async function ScanAttendancePage() {
  await requireScopedRole("ADMIN", "TEACHER");
  const groups = await GroupsService.listGroups();
  const lessons = (await await LessonsService.listLessons({ pageSize: 500 })).items;
  const students = (await StudentsService.listStudents({ pageSize: 500 })).items;

  return (
    <div className="space-y-6">
      <PageHeader
        title="حضور بالـ QR (مسح المعلّم)"
        description="امسح كود كل طالب بكاميرتك — الطالب ميحتاجش موبايل ولا نت، الكود معاه."
      />
      <ScanWorkshop groups={groups} lessons={lessons} students={students} />
    </div>
  );
}
