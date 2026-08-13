import { notFound } from "next/navigation";
import { AttendanceService, GradesService, PaymentsService, currentAcademyId, requireRole } from "@/services";
import { collections } from "@/services/data/store";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { performanceLevel } from "@/lib/constants";
import { PrintReportButton } from "@/components/shared/print-report-button";

export const dynamic = "force-dynamic";

export default async function ParentStudentReportPage({ params }: { params: { id: string } }) {
  const user = requireRole("PARENT");
  const academyId = currentAcademyId();
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = createServerSupabaseClient();

  const { data: profileParent } = await client
    .from("parents")
    .select("id,academy_id,first_name,last_name")
    .eq("academy_id", academyId)
    .eq("profile_id", user.id)
    .maybeSingle();
  const { data: emailParent } = profileParent
    ? { data: null }
    : await client
      .from("parents")
      .select("id,academy_id,first_name,last_name")
      .eq("academy_id", academyId)
      .eq("email", user.email)
      .maybeSingle();
  const parent = profileParent ?? emailParent;
  if (!parent) notFound();

  const { data: student } = await client
    .from("students")
    .select("id,academy_id,parent_id,first_name,last_name,grade,school,status")
    .eq("academy_id", academyId)
    .eq("id", params.id)
    .eq("parent_id", parent.id)
    .maybeSingle();
  if (!student) notFound();

  const [gradesPage, paymentsPage] = await Promise.all([
    GradesService.listGrades({ studentId: student.id, pageSize: 20 }),
    PaymentsService.listPayments({ studentId: student.id, pageSize: 20 }),
  ]);
  const attendance = AttendanceService.studentAttendanceSummary(student.id);
  const totalAttendance = attendance.present + attendance.late + attendance.absent;
  const attendanceRate = totalAttendance ? Math.round(((attendance.present + attendance.late) / totalAttendance) * 100) : 0;
  const averageGrade = gradesPage.items.length
    ? Math.round(gradesPage.items.reduce((sum, grade) => sum + (grade.percentage ?? 0), 0) / gradesPage.items.length)
    : 0;
  const totalDue = paymentsPage.items.reduce((sum, payment) => sum + (payment.amount_due ?? 0), 0);
  const totalPaid = paymentsPage.items.reduce((sum, payment) => sum + (payment.amount_paid ?? 0), 0);

  return (
    <main dir="rtl" className="mx-auto max-w-4xl bg-white p-6 text-black print:p-0 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-gray-900 pb-5">
        <div>
          <p className="text-sm font-medium text-violet-700">MY Academy</p>
          <h1 className="mt-1 text-2xl font-bold">تقرير متابعة الطالب</h1>
          <p className="mt-1 text-sm text-gray-500">يظهر هذا التقرير لولي الأمر المسجّل فقط.</p>
        </div>
        <div className="text-left">
          <PrintReportButton />
          <p className="mt-3 text-xs text-gray-500">تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG")}</p>
        </div>
      </header>

      <section className="mt-5 grid gap-3 rounded-xl border border-gray-200 p-4 text-sm sm:grid-cols-2">
        <p><span className="font-bold">الطالب:</span> {fullName(student)}</p>
        <p><span className="font-bold">الصف:</span> {student.grade || "—"}</p>
        <p><span className="font-bold">المدرسة:</span> {student.school || "—"}</p>
        <p><span className="font-bold">ولي الأمر:</span> {parent.first_name} {parent.last_name}</p>
      </section>

      <section className="mt-5 grid gap-3 text-center sm:grid-cols-4">
        <Summary label="الحضور" value={`${attendanceRate}%`} />
        <Summary label="متوسط الدرجات" value={gradesPage.items.length ? `${averageGrade}%` : "—"} />
        <Summary label="المدفوع" value={formatCurrency(totalPaid)} />
        <Summary label="المتبقي" value={formatCurrency(Math.max(0, totalDue - totalPaid))} emphasis />
      </section>

      <section className="mt-7">
        <h2 className="mb-2 border-b pb-2 text-lg font-bold">الدرجات الأخيرة</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-right">الاختبار</th><th className="p-3 text-center">الدرجة</th><th className="p-3 text-center">النسبة</th><th className="p-3 text-center">المستوى</th></tr></thead>
            <tbody>{gradesPage.items.map((grade) => {
              const exam = collections().exams.find((item) => item.id === grade.exam_id);
              const percentage = Math.round(grade.percentage ?? 0);
              return <tr className="border-t" key={grade.id}><td className="p-3">{exam?.name ?? "—"}</td><td className="p-3 text-center">{grade.score}/{exam?.max_score ?? "—"}</td><td className="p-3 text-center">{percentage}%</td><td className="p-3 text-center">{grade.level ?? performanceLevel(percentage)}</td></tr>;
            })}{gradesPage.items.length === 0 && <tr><td className="p-5 text-center text-gray-500" colSpan={4}>لا توجد درجات مسجلة حتى الآن.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <AttendanceStat label="حاضر" value={attendance.present} tone="text-emerald-700" />
        <AttendanceStat label="متأخر" value={attendance.late} tone="text-amber-700" />
        <AttendanceStat label="غائب" value={attendance.absent} tone="text-rose-700" />
      </section>

      <footer className="mt-10 border-t pt-4 text-center text-xs text-gray-400">تم إنشاء التقرير من خلال MY Academy. لا تشارك هذا التقرير إلا مع الجهات المخوّلة.</footer>
    </main>
  );
}

function Summary({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`rounded-xl border p-4 ${emphasis ? "border-rose-200 bg-rose-50" : "border-gray-200"}`}><p className={`text-2xl font-bold ${emphasis ? "text-rose-700" : "text-gray-900"}`}>{value}</p><p className="mt-1 text-xs text-gray-500">{label}</p></div>;
}

function AttendanceStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-lg border p-3 text-center"><p className={`text-xl font-bold ${tone}`}>{value}</p><p className="text-xs text-gray-500">{label}</p></div>;
}
