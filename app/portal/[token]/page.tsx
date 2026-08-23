import { CalendarCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { PortalPrintButton } from "@/components/portal/portal-print-button";
import { PortalLms } from "@/components/portal/portal-lms";
import { getStudentPortalByToken } from "@/services/portals";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  return {
    title: "بوابة الطالب | MYAcademy",
    description: "ملخص الحضور والدرجات للطالب",
    robots: { index: false, follow: false },
  };
}

export default async function StudentPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getStudentPortalByToken(token);

  if (!data) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <ShieldCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">الرابط غير صالح أو منتهي</h1>
          <p className="mt-3 leading-7 text-slate-600">اطلب من الأكاديمية إنشاء رابط بوابة جديد. لم يتم عرض أي بيانات لأن الرابط غير معتمد.</p>
          <p className="mt-6 text-sm font-semibold text-violet-700">MYAcademy</p>
        </section>
      </main>
    );
  }

  const { student, attendance, assessments } = data;
  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f7fb] px-4 py-6 text-slate-900 sm:px-6 sm:py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 p-6 text-white shadow-xl sm:p-9 print:rounded-none print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold tracking-wide text-violet-200">MYAcademy · {data.academyName}</p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">بوابة الطالب</h1>
              <p className="mt-2 text-violet-100">ملخص الأداء الأكاديمي والحضور</p>
            </div>
            <PortalPrintButton />
          </div>
          <div className="mt-8 grid gap-4 rounded-2xl bg-white/10 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-violet-200">الطالب</p>
              <p className="mt-1 text-xl font-bold">{student.first_name} {student.last_name}</p>
            </div>
            <div>
              <p className="text-xs text-violet-200">الصف</p>
              <p className="mt-1 text-xl font-bold">{student.grade || "غير محدد"}</p>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-4">
          <SummaryCard label="إجمالي الحصص المسجلة" value={attendance.totalLessons} tone="violet" icon={<CalendarCheck className="h-5 w-5" />} />
          <SummaryCard label="الحصص الحاضرة" value={attendance.attendedLessons} tone="emerald" />
          <SummaryCard label="الغياب" value={attendance.absentCount} tone="rose" />
          <SummaryCard label="نسبة الحضور" value={`${attendance.attendancePercentage}%`} tone="amber" />
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-violet-700">الأداء الأكاديمي</p>
              <h2 className="mt-1 text-2xl font-bold">التقييمات والدرجات</h2>
            </div>
            <div className="rounded-2xl bg-violet-50 px-4 py-3 text-center">
              <p className="text-xs text-violet-700">متوسط الدرجات</p>
              <p className="mt-1 text-2xl font-black text-violet-800">{assessments.length ? `${data.averageGrade}%` : "—"}</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="p-3 text-right font-semibold">التقييم</th>
                  <th className="p-3 text-right font-semibold">النوع</th>
                  <th className="p-3 text-right font-semibold">التاريخ</th>
                  <th className="p-3 text-center font-semibold">النتيجة</th>
                  <th className="p-3 text-center font-semibold">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3 font-semibold">{assessment.title || "—"}</td>
                    <td className="p-3">{assessment.type === "homework" ? "واجب" : assessment.type === "quiz" ? "اختبار قصير" : "امتحان"}</td>
                    <td className="p-3 text-slate-500">{formatDate(assessment.date, undefined, "ar-EG")}</td>
                    <td className="p-3 text-center font-semibold">{assessment.score ?? "—"} / {assessment.maxScore || "—"}</td>
                    <td className="p-3 text-center font-bold text-violet-700">{assessment.percentage == null ? "—" : `${assessment.percentage}%`}</td>
                  </tr>
                ))}
                {assessments.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا توجد درجات مسجلة حتى الآن.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <PortalLms token={token} materials={data.materials} homework={data.homework} />

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500 print:mt-4">
          <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> تقرير آمن للطالب وولي الأمر</span>
          <span>آخر تحديث: {formatDate(data.generatedAt, undefined, "ar-EG")}</span>
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, tone, icon }: { label: string; value: string | number; tone: "violet" | "emerald" | "rose" | "amber"; icon?: React.ReactNode }) {
  const styles = {
    violet: "border-violet-100 bg-violet-50 text-violet-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
  }[tone];
  return <div className={`rounded-2xl border p-4 shadow-sm ${styles}`}><div className="flex items-center justify-between gap-2"><p className="text-2xl font-black">{value}</p>{icon}</div><p className="mt-2 text-xs font-semibold opacity-80">{label}</p></div>;
}
