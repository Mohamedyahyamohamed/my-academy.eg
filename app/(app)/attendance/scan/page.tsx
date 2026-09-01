import { PageHeader } from "@/components/shared/page-header";
import { ScanWorkshop } from "@/components/attendance/scan-workshop";
import { GroupsService, LessonsService, StudentsService, PaymentsService, requireAttendanceTeacher } from "@/services";
import { cookies } from "next/headers";
import { getLangFromCookie, isRTL } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ScanAttendancePage() {
  const user = await requireAttendanceTeacher();
  const lang = getLangFromCookie((await cookies()).get("ma_lang")?.value);
  const en = lang === "en";
  // Group/lesson services resolve the teachers row from the authenticated
  // profile id/email. currentTeacherId() returns teachers.id and is reserved
  // for lower-level write/scope operations, so do not pass it here.
  const groups = await GroupsService.listGroups("", user.academy_id, user.id, user.email);
  const lessons = (await LessonsService.listLessons({ pageSize: 500 }, user.academy_id, user.id)).items;
  const students = (await StudentsService.listStudents({ pageSize: 500 }, user.academy_id)).items;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const payments = (await PaymentsService.listPayments({ month: currentMonth, pageSize: 500 }, user.academy_id)).items;
  const paidThisMonth: Record<string, boolean> = {};
  payments.forEach((payment) => {
    paidThisMonth[payment.student_id] = (paidThisMonth[payment.student_id] ?? false) || payment.remaining <= 0;
  });

  return (
    <div dir={isRTL(lang) ? "rtl" : "ltr"} className="space-y-6">
      <PageHeader
        title={en ? "QR attendance (teacher scan)" : "حضور بالـ QR (مسح المعلّم)"}
        description={en ? "Scan each student's code with your camera — no student phone or internet is required." : "امسح كود كل طالب بكاميرتك — الطالب ميحتاجش موبايل ولا نت، الكود معاه."}
      />
      <ScanWorkshop groups={groups} lessons={lessons} students={students} paidThisMonth={paidThisMonth} />
    </div>
  );
}
