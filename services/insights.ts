/**
 * Smart Insights — RLS-backed. All data access remains tenant-scoped.
 */
import { fetchTableRLS } from "./_shared";
import { performanceLevel, performanceColor } from "@/lib/constants";
import { percentage, round } from "@/lib/utils";

type RiskCategory = "safe" | "warning" | "critical";

export interface AtRiskStudent {
  studentId: string;
  name: string;
  groupName?: string;
  reasons: string[];
  severity: "high" | "medium" | "low";
  category: RiskCategory;
  riskScore: number;
  attendanceRate: number;
  academicAverage: number;
}

export interface StudentRiskInput {
  attendance: Array<{ status?: string; recorded_at?: string; lesson_id?: string }>;
  grades: Array<{ score?: number; exam_id?: string; created_at?: string; updated_at?: string }>;
  exams: Array<{ id: string; max_score?: number }>;
  payments?: Array<{ status?: string; amount_due?: number; amount_paid?: number }>;
}

/**
 * Deterministic, explainable early-warning score. It never divides by zero:
 * missing attendance or grades are neutral rather than penalized.
 */
export function calculateRiskScore(input: StudentRiskInput): {
  score: number;
  category: RiskCategory;
  severity: "high" | "medium" | "low";
  reasons: string[];
  attendanceRate: number;
  academicAverage: number;
} {
  const attendance = [...(input.attendance ?? [])].sort((a, b) =>
    +new Date(a.recorded_at ?? 0) - +new Date(b.recorded_at ?? 0),
  );
  const attended = attendance.filter((record) => record.status !== "ABSENT").length;
  const attendanceRate = attendance.length ? percentage(attended, attendance.length) : 0;
  const examMap = new Map((input.exams ?? []).map((exam) => [exam.id, exam]));
  const gradePercentages = (input.grades ?? [])
    .map((grade) => {
      const max = Number(examMap.get(grade.exam_id ?? "")?.max_score ?? 0);
      const score = Number(grade.score ?? 0);
      return max > 0 ? Math.max(0, Math.min(100, (score / max) * 100)) : null;
    })
    .filter((value): value is number => value !== null);
  const academicAverage = gradePercentages.length
    ? round(gradePercentages.reduce((sum, value) => sum + value, 0) / gradePercentages.length, 0)
    : 0;

  let score = 0;
  const reasons: string[] = [];
  const lastTwo = attendance.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((record) => record.status === "ABSENT")) {
    score += 35;
    reasons.push("غياب آخر حصتين متتاليتين");
  }
  if (attendance.length > 0 && attendanceRate < 60) {
    score += 30;
    reasons.push(`نسبة حضور منخفضة (${attendanceRate}%)`);
  } else if (attendance.length > 0 && attendanceRate < 75) {
    score += 15;
    reasons.push(`الحضور يحتاج متابعة (${attendanceRate}%)`);
  }
  if (gradePercentages.length > 0 && academicAverage < 50) {
    score += 30;
    reasons.push(`متوسط درجات منخفض (${academicAverage}%)`);
  } else if (gradePercentages.length > 0 && academicAverage < 65) {
    score += 15;
    reasons.push(`الدرجات تحتاج متابعة (${academicAverage}%)`);
  }
  if (gradePercentages.length >= 2) {
    const recent = gradePercentages[gradePercentages.length - 1];
    const previousAverage = gradePercentages.slice(0, -1).reduce((sum, value) => sum + value, 0) / (gradePercentages.length - 1);
    if (previousAverage - recent >= 20) {
      score += 25;
      reasons.push("تراجع واضح في آخر تقييم");
    }
  }

  const category: RiskCategory = score >= 60 ? "critical" : score >= 25 ? "warning" : "safe";
  return {
    score,
    category,
    severity: category === "critical" ? "high" : category === "warning" ? "medium" : "low",
    reasons,
    attendanceRate,
    academicAverage,
  };
}

export async function atRiskStudents(academyId?: string): Promise<AtRiskStudent[]> {
  const [students, attendance, allGrades, payments, exams, groups, memberships, lessons] = await Promise.all([
    fetchTableRLS<any>("students", academyId),
    fetchTableRLS<any>("attendance", academyId),
    fetchTableRLS<any>("grades", academyId),
    fetchTableRLS<any>("payments", academyId),
    fetchTableRLS<any>("exams", academyId),
    fetchTableRLS<any>("groups", academyId),
    fetchTableRLS<any>("group_students", academyId),
    fetchTableRLS<any>("lessons", academyId),
  ]);
  const activeLessonIds = new Set(lessons.filter((lesson: any) => lesson.status !== "canceled" && lesson.is_cancelled !== true).map((lesson: any) => lesson.id));
  const activeAttendance = attendance
    .filter((record: any) => activeLessonIds.has(record.lesson_id))
    .map((record: any) => ({
      ...record,
      recorded_at: record.recorded_at ?? lessons.find((lesson: any) => lesson.id === record.lesson_id)?.date,
    }));
  const groupMap = new Map(groups.map((group: any) => [group.id, group]));
  const studentGroups = new Map<string, string>();
  for (const membership of memberships) {
    if (!studentGroups.has(membership.student_id)) studentGroups.set(membership.student_id, membership.group_id);
  }

  return students
    .filter((student: any) => student.status === "ACTIVE" && student.is_active !== false)
    .map((student: any) => {
      const result = calculateRiskScore({
        attendance: activeAttendance.filter((record: any) => record.student_id === student.id),
        grades: allGrades.filter((grade: any) => grade.student_id === student.id),
        exams,
        payments: payments.filter((payment: any) => payment.student_id === student.id),
      });
      const { score: riskScore, ...risk } = result;
      const group = groupMap.get(studentGroups.get(student.id) ?? "");
      return {
        studentId: student.id,
        name: `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "طالب بدون اسم",
        groupName: group?.name,
        riskScore,
        ...risk,
      };
    })
    .filter((student) => student.category !== "safe")
    .sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name));
}

export async function generateReportComment(studentId: string, academyId?: string): Promise<string> {
  const [students, attendance, allGrades, exams] = await Promise.all([
    fetchTableRLS<any>("students", academyId),
    fetchTableRLS<any>("attendance", academyId),
    fetchTableRLS<any>("grades", academyId),
    fetchTableRLS<any>("exams", academyId),
  ]);
  const s = students.find((x: any) => x.id === studentId);
  const name = s?.first_name ?? "الطالب";
  const result = calculateRiskScore({
    attendance: attendance.filter((record: any) => record.student_id === studentId),
    grades: allGrades.filter((grade: any) => grade.student_id === studentId),
    exams,
  });
  if (!result.reasons.length) return `${name}: لا توجد بيانات كافية لتقييم الأداء بعد.`;
  if (result.category === "critical") return `${name} يحتاج إلى متابعة عاجلة. ${result.reasons.join("، ")}.`;
  return `${name} يحتاج إلى متابعة. ${result.reasons.join("، ")}.`;
}

export { performanceLevel, performanceColor };
