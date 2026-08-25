import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { StudentsService, GroupsService, PaymentsService, GradesService, AttendanceService, MiscService, requireScopedRole } from "@/services";
import { collections } from "@/services/data/store";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { performanceLevel, performanceColor, performanceLabel } from "@/lib/constants";
import { PrintReportButton } from "@/components/shared/print-report-button";
import { BackButton } from "@/components/shared/back-button";

export const dynamic = "force-dynamic";

export default async function StudentReportPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  await requireScopedRole("ADMIN", "TEACHER");
  const detail = await StudentsService.getStudentDetail(params.id);
  if (!detail) notFound();

  let academyName = "MYAcademy";
  let academyPhone = "";
  let academyEmail = "";
  let academyAddress: string | null = null;
  let reportSignature = "";
  let reportFootnote = "";
  try {
    const academy = await MiscService.getAcademyAsync(detail.academy_id);
    academyName = academy?.name || academyName;
    academyPhone = academy?.phone || "";
    academyEmail = academy?.email || "";
    academyAddress = academy?.address || null;
    reportSignature = academy?.report_signature || "";
    reportFootnote = academy?.report_footnote || "";
  } catch {
    // A missing academy snapshot must not prevent a printable student report.
  }

  const att = (() => {
    try {
      return AttendanceService.studentAttendanceSummary(params.id) ?? { present: 0, late: 0, absent: 0, byLesson: [] };
    } catch {
      return { present: 0, late: 0, absent: 0, byLesson: [] };
    }
  })();
  const paymentResult = await PaymentsService.listPayments({ studentId: params.id, pageSize: 50 }).catch(() => null);
  const gradeResult = await GradesService.listGrades({ studentId: params.id, pageSize: 50 }).catch(() => null);
  const payments = Array.isArray(paymentResult?.items) ? paymentResult.items : [];
  const grades = Array.isArray(gradeResult?.items) ? gradeResult.items : [];
  const stats = detail.stats ?? {
    attendanceRate: 0,
    averageGrade: 0,
    monthlyFee: 0,
    totalPaid: 0,
    outstanding: 0,
    attendanceTrend: [],
    gradeTrend: [],
  };

  return (
    <div dir={en ? "ltr" : "rtl"} className="mx-auto max-w-4xl bg-white p-8 text-black print:p-0" style={{ fontFamily: "'Alexandria', 'Tajawal', system-ui, sans-serif" }}>
      <div className="mb-4 print:hidden"><BackButton fallback="/students" /></div>
      {/* رأس التقرير */}
      <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">{academyName}</h1>
          <p className="text-sm text-gray-600">{academyPhone} · {academyEmail}</p>
          {academyAddress && <p className="text-xs text-gray-500">{academyAddress}</p>}
        </div>
        <div className="text-left">
          <div className="mb-2 flex justify-end"><PrintReportButton /></div>
          <h2 className="text-lg font-bold">{en ? "Grade and attendance report" : "كشف درجات وحضور"}</h2>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString(en ? "en-US" : "ar-EG")}</p>
        </div>
      </div>

      {/* بيانات الطالب */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-gray-300 p-4 text-sm">
        <div><span className="font-bold">{en ? "Name:" : "الاسم:"}</span> {detail.first_name} {detail.last_name}</div>
        <div><span className="font-bold">{en ? "Grade:" : "الصف:"}</span> {detail.grade || "—"}</div>
        <div><span className="font-bold">{en ? "School:" : "المدرسة:"}</span> {detail.school || "—"}</div>
        <div><span className="font-bold">{en ? "Phone:" : "الموبايل:"}</span> {detail.phone || "—"}</div>
        {detail.parent && (
          <div><span className="font-bold">{en ? "Parent:" : "ولي الأمر:"}</span> {detail.parent.first_name} {detail.parent.last_name}</div>
        )}
        <div><span className="font-bold">{en ? "Status:" : "الحالة:"}</span> {detail.status === "ACTIVE" ? (en ? "Active" : "نشط") : detail.status === "ARCHIVED" ? (en ? "Archived" : "مؤرشف") : (en ? "Inactive" : "غير نشط")}</div>
      </div>

      {/* ملخص */}
      <div className="mt-4 grid grid-cols-4 gap-3 text-center">
        <div className="rounded-lg border border-gray-300 p-3">
          <p className="text-2xl font-bold text-gray-800">{stats.attendanceRate}%</p>
          <p className="text-xs text-gray-500">{en ? "Attendance rate" : "نسبة الحضور"}</p>
        </div>
        <div className="rounded-lg border border-gray-300 p-3">
          <p className="text-2xl font-bold text-gray-800">{stats.averageGrade}%</p>
          <p className="text-xs text-gray-500">{en ? "Average grade" : "متوسط الدرجات"}</p>
        </div>
        <div className="rounded-lg border border-gray-300 p-3">
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalPaid, "EGP", en ? "en-EG" : "ar-EG")}</p>
          <p className="text-xs text-gray-500">{en ? "Paid" : "المدفوع"}</p>
        </div>
        <div className="rounded-lg border border-gray-300 p-3">
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.outstanding, "EGP", en ? "en-EG" : "ar-EG")}</p>
          <p className="text-xs text-gray-500">{en ? "Remaining" : "المتبقي"}</p>
        </div>
      </div>

      {/* الدرجات */}
      <h3 className="mt-6 mb-2 border-b border-gray-300 pb-1 text-lg font-bold">{en ? "Exams and grades" : "الاختبارات والدرجات"}</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-400 bg-gray-100">
            <th className="p-2 text-right">{en ? "Exam" : "الامتحان"}</th>
            <th className="p-2 text-center">{en ? "Date" : "التاريخ"}</th>
            <th className="p-2 text-center">{en ? "Score" : "الدرجة"}</th>
            <th className="p-2 text-center">{en ? "Percentage" : "النسبة"}</th>
            <th className="p-2 text-center">{en ? "Level" : "المستوى"}</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g) => {
            const exam = collections().exams.find((e) => e.id === g.exam_id);
            const pct = Math.round(g.percentage ?? 0);
            const lvl = g.level ?? performanceLevel(pct);
            return (
              <tr key={g.id} className="border-b border-gray-200">
                <td className="p-2">{exam?.name ?? "—"}</td>
                <td className="p-2 text-center">{exam ? formatDate(exam.date, undefined, en ? "en-EG" : "ar-EG") : "—"}</td>
                <td className="p-2 text-center">{g.score} / {exam?.max_score ?? "—"}</td>
                <td className="p-2 text-center font-bold">{pct}%</td>
                <td className="p-2 text-center">{performanceLabel(lvl, en)}</td>
              </tr>
            );
          })}
          {grades.length === 0 && (
            <tr><td colSpan={5} className="p-4 text-center text-gray-400">{en ? "No grades recorded" : "مفيش درجات مسجّلة"}</td></tr>
          )}
        </tbody>
      </table>

      {/* الحضور */}
      <h3 className="mt-6 mb-2 border-b border-gray-300 pb-1 text-lg font-bold">{en ? "Attendance record" : "سجل الحضور"}</h3>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded border border-green-300 bg-green-50 p-2">
          <p className="text-xl font-bold text-green-700">{att.present}</p>
          <p className="text-xs">{en ? "Present" : "حاضر"}</p>
        </div>
        <div className="rounded border border-yellow-300 bg-yellow-50 p-2">
          <p className="text-xl font-bold text-yellow-700">{att.late}</p>
          <p className="text-xs">{en ? "Late" : "متأخر"}</p>
        </div>
        <div className="rounded border border-red-300 bg-red-50 p-2">
          <p className="text-xl font-bold text-red-700">{att.absent}</p>
          <p className="text-xs">{en ? "Absent" : "غائب"}</p>
        </div>
      </div>

      {/* المصاريف */}
      <h3 className="mt-6 mb-2 border-b border-gray-300 pb-1 text-lg font-bold">{en ? "Payment record" : "سجل المصاريف"}</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-gray-400 bg-gray-100">
            <th className="p-2 text-right">{en ? "Month" : "الشهر"}</th>
            <th className="p-2 text-center">{en ? "Due" : "المستحق"}</th>
            <th className="p-2 text-center">{en ? "Paid" : "المدفوع"}</th>
            <th className="p-2 text-center">{en ? "Remaining" : "المتبقي"}</th>
            <th className="p-2 text-center">{en ? "Status" : "الحالة"}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-gray-200">
              <td className="p-2 font-medium">{p.month}</td>
              <td className="p-2 text-center">{formatCurrency(p.amount_due, "EGP", en ? "en-EG" : "ar-EG")}</td>
              <td className="p-2 text-center text-green-600">{formatCurrency(p.amount_paid, "EGP", en ? "en-EG" : "ar-EG")}</td>
              <td className="p-2 text-center text-red-600">{formatCurrency(p.remaining, "EGP", en ? "en-EG" : "ar-EG")}</td>
              <td className="p-2 text-center">{p.status === "PAID" ? (en ? "Paid" : "مدفوع") : p.status === "PARTIAL" ? (en ? "Partial" : "جزئي") : (en ? "Unpaid" : "غير مدفوع")}</td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr><td colSpan={5} className="p-4 text-center text-gray-400">{en ? "No payments recorded" : "مفيش مصاريف مسجّلة"}</td></tr>
          )}
        </tbody>
      </table>

      {/* التوقيعات */}
      <div className="mt-12 grid grid-cols-2 gap-8">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 text-sm">{reportSignature || (en ? "Teacher signature" : "توقيع المدرّس")}</div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 text-sm">{en ? "Academy stamp" : "ختم الأكاديمية"}</div>
        </div>
      </div>

      {reportFootnote && <div className="mt-6 border-t border-gray-200 pt-3 text-center text-xs text-gray-500">{reportFootnote}</div>}
      <div className="mt-8 text-center text-xs text-gray-400">
        {en ? "This report was generated by" : "تم إنشاء هذا التقرير بواسطة"} {academyName} — {new Date().toLocaleDateString(en ? "en-US" : "ar-EG")}
      </div>
    </div>
  );
}
