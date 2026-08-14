/**
 * Smart Insights — RLS-backed. All data via fetchTableRLS.
 */
import { fetchTableRLS, teacherGroupScope } from "./_shared";
import { performanceLevel, performanceColor } from "@/lib/constants";
import { percentage, round } from "@/lib/utils";

export interface AtRiskStudent {
  studentId: string;
  name: string;
  reasons: string[];
  severity: "high" | "medium" | "low";
}

export async function atRiskStudents(academyId?: string): Promise<AtRiskStudent[]> {
  const [students, attendance, allGrades, payments, exams] = await Promise.all([
    fetchTableRLS<any>("students", academyId),
    fetchTableRLS<any>("attendance", academyId),
    fetchTableRLS<any>("grades", academyId),
    fetchTableRLS<any>("payments", academyId),
    fetchTableRLS<any>("exams", academyId),
  ]);

  const examMap = new Map(exams.map((e: any) => [e.id, e]));
  const out: AtRiskStudent[] = [];

  for (const s of students) {
    if (s.status !== "ACTIVE") continue;
    const reasons: string[] = [];
    const att = attendance.filter((a: any) => a.student_id === s.id);
    const present = att.filter((a: any) => a.status !== "ABSENT").length;
    const rate = att.length ? percentage(present, att.length) : 100;
    const grades = allGrades.filter((g: any) => g.student_id === s.id);
    const avg = grades.length
      ? round(grades.reduce((x, g) => {
          const ex = examMap.get(g.exam_id);
          return x + (ex ? (g.score / ex.max_score) * 100 : 0);
        }, 0) / grades.length, 0)
      : 100;
    const overdue = payments.some((p: any) =>
      p.student_id === s.id && p.status !== "PAID" && p.amount_due - p.amount_paid > 0);

    if (att.length >= 3 && rate < 70) reasons.push(`حضور منخفض (${rate}%)`);
    if (grades.length > 0 && avg < 60) reasons.push(`معدّل ضعيف (${avg}%)`);
    if (att.length >= 5) {
      const last3 = att.slice(-3);
      if (last3.every((a: any) => a.status === "ABSENT")) reasons.push("غاب آخر 3 حصص");
    }
    if (overdue) reasons.push("مدفوعات متأخرة");

    if (reasons.length) {
      const severity = reasons.length >= 3 || (rate < 50 && att.length >= 3) ? "high" : reasons.length === 2 ? "medium" : "low";
      out.push({ studentId: s.id, name: `${s.first_name} ${s.last_name}`, reasons, severity });
    }
  }
  return out;
}

export async function generateReportComment(studentId: string, academyId?: string): Promise<string> {
  const [students, attendance, allGrades, exams] = await Promise.all([
    fetchTableRLS<any>("students", academyId),
    fetchTableRLS<any>("attendance", academyId),
    fetchTableRLS<any>("grades", academyId),
    fetchTableRLS<any>("exams", academyId),
  ]);
  const examMap = new Map(exams.map((e: any) => [e.id, e]));
  const s = students.find((x: any) => x.id === studentId);
  const name = s ? s.first_name : "الطالب";
  const att = attendance.filter((a: any) => a.student_id === studentId);
  const present = att.filter((a: any) => a.status !== "ABSENT").length;
  const rate = att.length ? percentage(present, att.length) : 0;
  const grades = allGrades.filter((g: any) => g.student_id === studentId);
  const avg = grades.length
    ? round(grades.reduce((x, g) => {
        const ex = examMap.get(g.exam_id);
        return x + (ex ? (g.score / ex.max_score) * 100 : 0);
      }, 0) / grades.length, 0)
    : 0;
  const level = performanceLevel(avg);

  if (!att.length && !grades.length) return `${name}: لا توجد بيانات كافية لتقييم الأداء بعد.`;
  if (level === "Excellent") return `${name} متفوّق بدرجة ممتازة (معدّل ${avg}%) وملتزم بالحضور (${rate}%). أداء يُحتذى به.`;
  if (level === "Very Good") return `${name} أداؤه جيد جدًا (معدّل ${avg}%). ملتزم نسبيًا بالحضور (${rate}%). مع المراجعة المنتظمة سيصل للممتاز.`;
  if (level === "Good") return `${name} أداؤه جيد (معدّل ${avg}%). يحتاج إلى مزيد من الالتزام بالحضور (${rate}%) وحلّ الواجبات.`;
  return `${name} يحتاج إلى دعم ومتابعة (معدّل ${avg}%)، حضور ${rate}%. ننصح بجلسات تقوية ومتابعة أسبوعية.`;
}

export { performanceLevel, performanceColor };
