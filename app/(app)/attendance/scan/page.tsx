import { PageHeader } from "@/components/shared/page-header";
import { ScanWorkshop } from "@/components/attendance/scan-workshop";
import { GroupsService, LessonsService, StudentsService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";
import { cookies } from "next/headers";
import { getLangFromCookie, isRTL } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ScanAttendancePage() {
  await requireScopedRole("TEACHER");
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  const groups = await GroupsService.listGroups();
  const lessons = (await await LessonsService.listLessons({ pageSize: 500 })).items;
  const students = (await StudentsService.listStudents({ pageSize: 500 })).items;

  return (
    <div dir={isRTL(lang) ? "rtl" : "ltr"} className="space-y-6">
      <PageHeader
        title={en ? "QR attendance (teacher scan)" : "حضور بالـ QR (مسح المعلّم)"}
        description={en ? "Scan each student's code with your camera — no student phone or internet is required." : "امسح كود كل طالب بكاميرتك — الطالب ميحتاجش موبايل ولا نت، الكود معاه."}
      />
      <ScanWorkshop groups={groups} lessons={lessons} students={students} />
    </div>
  );
}
