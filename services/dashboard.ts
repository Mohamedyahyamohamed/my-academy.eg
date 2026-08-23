/**
 * Dashboard, Analytics & Reports service.
 * ALL data access is RLS-backed via fetchTableRLS (user session).
 * No in-memory cache as security boundary.
 */
import type {
  AnalyticsData,
  DashboardData,
  Lesson,
  Payment,
  Student,
} from "@/types";
import { collections } from "./data/store";
import {
  getCourse,
  getGroup,
  getTeacher,
  byAcademy,
  fetchTableRLS,
  teacherGroupScope,
  teacherStudentScope,
} from "./_shared";
import { getPaymentMetrics } from "./payments";
import { performanceLevel } from "@/lib/constants";
import { percentage, round } from "@/lib/utils";
import { currentAcademyId } from "./session";
import { isLessonUpcoming, lessonWallClockMinute } from "./lessons";
import { calculateRiskScore } from "./insights";

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ar-EG", { month: "long" });
}

function averageGradePercent(
  grades: { exam_id: string; score: number }[],
  exams: { id: string; max_score: number }[],
): number {
  if (!grades.length) return 0;
  const sum = grades.reduce((s, g) => {
    const ex = exams.find((e) => e.id === g.exam_id);
    return s + (ex && Number(ex.max_score) > 0 ? (Number(g.score) / Number(ex.max_score)) * 100 : 0);
  }, 0);
  return round(sum / grades.length, 0);
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function paymentMonth(payment: any): string {
  return String(payment?.month_year ?? payment?.month ?? "");
}

function activeLesson(lesson: any): boolean {
  return lesson?.status !== "canceled" && lesson?.is_cancelled !== true;
}

function dateInRange(value: unknown, start: number, end: number): boolean {
  const time = +new Date(String(value ?? ""));
  return Number.isFinite(time) && time >= start && time < end;
}

// ─── RLS-backed data fetch for dashboard aggregations ────────────
async function getRLSData(academyId?: string) {
  const [students, groups, exams, payments, courses, lessons, attendance, grades, teachers, homework, submissions, groupStudents] =
    await Promise.all([
      fetchTableRLS<Student>("students", academyId),
      fetchTableRLS<any>("groups", academyId),
      fetchTableRLS<any>("exams", academyId),
      fetchTableRLS<Payment>("payments", academyId),
      fetchTableRLS<any>("courses", academyId),
      fetchTableRLS<any>("lessons", academyId),
      fetchTableRLS<any>("attendance", academyId),
      fetchTableRLS<any>("grades", academyId),
      fetchTableRLS<any>("teachers", academyId),
      fetchTableRLS<any>("homework", academyId),
      fetchTableRLS<any>("homework_submissions", academyId),
      fetchTableRLS<any>("group_students", academyId),
    ]);

  // Apply teacher scope if applicable.
  const tScope = teacherGroupScope();
  const tStudentScope = teacherStudentScope();
  const scopedGroups = tScope ? groups.filter((g: any) => tScope.has(g.id)) : groups;
  const scopedStudents = tStudentScope ? students.filter((s: any) => tStudentScope.has(s.id)) : students;
  const scopedGroupIds = new Set(scopedGroups.map((g: any) => g.id));
  const scopedLessonIds = new Set(lessons.filter((l: any) => scopedGroupIds.has(l.group_id)).map((l: any) => l.id));
  const scopedExams = tScope ? exams.filter((e: any) => scopedGroupIds.has(e.group_id)) : exams;

  return {
    students: scopedStudents,
    groups: scopedGroups,
    exams: scopedExams,
    payments: payments.filter((p: any) => !p.deleted_at),
    courses,
    lessons,
    attendance: attendance.filter((a: any) => scopedLessonIds.has(a.lesson_id)),
    grades: grades.filter((g: any) => scopedExams.some((e: any) => e.id === g.exam_id)),
    teachers,
    homework,
    submissions,
    groupStudents,
    scopedLessonIds,
    scopedGroupIds,
  };
}

export async function getDashboardData(
  period: "month" | "quarter" | "year" = "month",
  academyId?: string,
): Promise<DashboardData> {
  const d = await getRLSData(academyId);
  const { students, groups, exams, payments, attendance, grades, lessons, groupStudents } = d;

  const totalStudents = students.length;
  const activeStudents = students.filter((s: any) => s.status === "ACTIVE" && s.is_active !== false).length;
  const totalGroups = groups.filter((g: any) => g.status === "ACTIVE" && g.is_active !== false).length;

  // نطاق الرسم البياني + عدد شهور التحصيل حسب الفترة المختارة.
  const chartRange = period === "year" ? 12 : 6;
  const collectedPeriodMonths = period === "month" ? 1 : period === "quarter" ? 3 : 12;
  const pay = await getPaymentMetrics(chartRange, academyId);
  const collectedForPeriod = pay.revenueByMonth
    .slice(-collectedPeriodMonths)
    .reduce((s, r) => s + r.collected, 0);

  const cutoff = Date.now() - 30 * 86_400_000;
  const recentAtt = attendance.filter((a: any) => {
    if (+new Date(a.recorded_at) < cutoff) return false;
    const lesson = d.lessons.find((item: any) => item.id === a.lesson_id);
    return Boolean(lesson && lesson.status !== "canceled" && lesson.is_cancelled !== true);
  });
  const present = recentAtt.filter((a: any) => a.status !== "ABSENT").length;
  const attendanceRate = recentAtt.length ? percentage(present, recentAtt.length) : 0;
  const currentMonth = currentMonthKey();
  const activeStudentsSet = new Set(students.filter((student: any) => student.status === "ACTIVE" && student.is_active !== false).map((student: any) => student.id));
  const expectedRevenueThisMonth = groups
    .filter((group: any) => group.status === "ACTIVE" && group.is_active !== false)
    .reduce((sum: number, group: any) => {
      const enrolled = groupStudents.filter((membership: any) => membership.group_id === group.id && activeStudentsSet.has(membership.student_id)).length;
      return sum + Math.max(0, Number(group.monthly_fee ?? 0)) * enrolled;
    }, 0);
  const collectedRevenueThisMonth = payments
    .filter((payment: any) => paymentMonth(payment) === currentMonth)
    .reduce((sum: number, payment: any) => sum + Math.max(0, Number(payment.amount_paid ?? 0)), 0);
  const currentMonthLessonIds = new Set(lessons
    .filter((lesson: any) => activeLesson(lesson) && String(lesson.date ?? "").slice(0, 7) === currentMonth)
    .map((lesson: any) => lesson.id));
  const currentMonthAttendance = attendance.filter((record: any) => currentMonthLessonIds.has(record.lesson_id));
  const currentMonthPresent = currentMonthAttendance.filter((record: any) => record.status !== "ABSENT").length;
  const overallAttendanceThisMonth = currentMonthAttendance.length
    ? percentage(currentMonthPresent, currentMonthAttendance.length)
    : 0;
  const revenueByGroup = groups
    .filter((group: any) => group.status === "ACTIVE" && group.is_active !== false)
    .map((group: any) => {
      const enrolled = groupStudents.filter((membership: any) => membership.group_id === group.id && activeStudentsSet.has(membership.student_id)).length;
      const expected = Math.max(0, Number(group.monthly_fee ?? 0)) * enrolled;
      const collected = payments
        .filter((payment: any) => payment.group_id === group.id && paymentMonth(payment) === currentMonth)
        .reduce((sum: number, payment: any) => sum + Math.max(0, Number(payment.amount_paid ?? 0)), 0);
      return { name: group.name ?? "بدون اسم", expected, collected, unpaid: Math.max(0, expected - collected) };
    })
    .sort((a, b) => b.expected - a.expected || a.name.localeCompare(b.name));
  const riskStudents = students
    .filter((student: any) => student.status === "ACTIVE" && student.is_active !== false)
    .map((student: any) => calculateRiskScore({
      attendance: attendance.filter((record: any) => record.student_id === student.id),
      grades: grades.filter((grade: any) => grade.student_id === student.id),
      exams,
    }))
    .filter((risk) => risk.category !== "safe");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - mondayOffset);
  const attendanceTrend4Weeks = Array.from({ length: 4 }, (_, index) => {
    const startDate = new Date(currentWeekStart);
    startDate.setDate(currentWeekStart.getDate() - (3 - index) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    const start = startDate.getTime();
    const end = endDate.getTime();
    const lessonIds = new Set(lessons.filter((lesson: any) => activeLesson(lesson) && dateInRange(lesson.date, start, end)).map((lesson: any) => lesson.id));
    const records = attendance.filter((record: any) => lessonIds.has(record.lesson_id));
    const attended = records.filter((record: any) => record.status !== "ABSENT").length;
    return { week: `الأسبوع ${index + 1}`, rate: records.length ? percentage(attended, records.length) : 0 };
  });

  // students by course
  const courseMap = new Map<string, { students: number; color: string }>();
  for (const g of groups) {
    const course = d.courses.find((c: any) => c.id === g.course_id);
    const key = course?.name ?? "Uncategorized";
    const cur = courseMap.get(key) ?? { students: 0, color: course?.color ?? "#94a3b8" };
    cur.students += students.filter((s: any) =>
      collections().groupStudents.some((gs) => gs.group_id === g.id && gs.student_id === s.id)
    ).length;
    courseMap.set(key, cur);
  }
  const studentsByCourse = [...courseMap.entries()].map(([course, v]) => ({ course, students: v.students, color: v.color }));

  // attendance trend
  const lessonsSorted = d.lessons
    .filter((l: any) => d.scopedLessonIds.has(l.id) && l.status !== "canceled" && l.is_cancelled !== true)
    .slice().sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date));
  const recentLessons = lessonsSorted.slice(-6);
  const attendanceTrend = recentLessons.map((l: any, i: number) => {
    const recs = attendance.filter((a: any) => a.lesson_id === l.id);
    const p = recs.filter((r: any) => r.status !== "ABSENT").length;
    return { week: `L${i + 1}`, rate: recs.length ? percentage(p, recs.length) : 0 };
  });

  // grade performance
  const perfBuckets: Record<string, number> = { Excellent: 0, "Very Good": 0, Good: 0, "Needs Improvement": 0 };
  for (const g of grades) {
    const exam = exams.find((e: any) => e.id === g.exam_id);
    if (!exam || Number(exam.max_score) <= 0) continue;
    perfBuckets[performanceLevel((Number(g.score) / Number(exam.max_score)) * 100)]++;
  }
  const gradePerformance = Object.entries(perfBuckets).map(([level, count]) => ({ level, count }));

  // upcoming lessons
  const upcomingLessons = d.lessons
    .filter((l: any) => d.scopedLessonIds.has(l.id) && l.status !== "canceled" && l.is_cancelled !== true && isLessonUpcoming(l))
    .sort((a: any, b: any) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))
    .slice(0, 5)
    .map((l: any) => ({
      ...l,
      group: groups.find((g: any) => g.id === l.group_id),
      teacher: d.teachers.find((t: any) => t.id === l.teacher_id),
    })) as any[];

  // recent payments
  const recentPayments = payments
    .slice().sort((a: any, b: any) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 5)
    .map((p: any) => ({ ...p, student: students.find((s: any) => s.id === p.student_id) })) as any[];

  // outstanding
  const outstandingStudents = payments
    .filter((p: any) => p.month === currentMonthKey() && p.status !== "PAID" && p.amount_due - p.amount_paid > 0)
    .slice(0, 6)
    .map((p: any) => ({ ...p, remaining: p.amount_due - p.amount_paid, student: students.find((s: any) => s.id === p.student_id) })) as any[];

  // needing attention
  const needing: any[] = [];
  for (const s of students) {
    const att = attendance.filter((a: any) => a.student_id === s.id);
    const presentCount = att.filter((a: any) => a.status !== "ABSENT").length;
    const rate = att.length ? percentage(presentCount, att.length) : 100;
    const overdue = payments.some((p: any) => p.student_id === s.id && p.status !== "PAID" && p.month === currentMonthKey());
    const sGrades = grades.filter((g: any) => g.student_id === s.id);
    const lowGrade = sGrades.some((g: any) => {
      const ex = exams.find((e: any) => e.id === g.exam_id);
      return ex ? g.score / ex.max_score < 0.6 : false;
    });
    if (rate < 70 || overdue || lowGrade) needing.push(s);
  }

  // نسبة التغيّر الحقيقية في التحصيل (الشهر الحالي مقابل الشهر السابق).
  const months = pay.revenueByMonth;
  const thisCollected = months[months.length - 1]?.collected ?? 0;
  const lastCollected = months[months.length - 2]?.collected ?? 0;
  const collectionTrend = lastCollected > 0
    ? Math.round(((thisCollected - lastCollected) / lastCollected) * 100)
    : 0;

  return {
    totalStudents,
    activeStudents,
    totalGroups,
    period,
    collectedForPeriod,
    monthlyRevenue: pay.monthlyRevenue,
    collectedThisMonth: pay.collectedThisMonth,
    outstanding: pay.outstanding,
    attendanceRate,
    averageGrade: averageGradePercent(grades, exams),
    collectionTrend,
    revenueByMonth: pay.revenueByMonth.map((r: any) => ({ month: monthLabel(r.month), revenue: r.revenue, collected: r.collected })),
    studentsByCourse,
    attendanceTrend,
    gradePerformance,
    upcomingLessons,
    recentPayments,
    outstandingStudents,
    studentsNeedingAttention: needing.slice(0, 5),
    expectedRevenueThisMonth,
    collectedRevenueThisMonth,
    overallAttendanceThisMonth,
    atRiskCount: riskStudents.length,
    revenueByGroup,
    attendanceTrend4Weeks,
  };
}

export async function getAnalytics(academyId?: string): Promise<AnalyticsData> {
  const d = await getRLSData(academyId);
  const { students, groups, exams, payments, courses, attendance, grades } = d;

  const growth: { month: string; students: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(); dt.setMonth(dt.getMonth() - i);
    const end = new Date(dt.getFullYear(), dt.getMonth() + 1, 1).getTime();
    const count = students.filter((s: any) => +new Date(s.enrolled_at) < end).length;
    growth.push({ month: monthLabel(`${dt.getFullYear()}-${dt.getMonth() + 1}`), students: count });
  }

  const pm = await getPaymentMetrics(6, academyId);
  const monthlyRevenue = pm.revenueByMonth.map((r: any) => ({ month: monthLabel(r.month), revenue: r.revenue, collected: r.collected }));

  const attTrend: { month: string; rate: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(); dt.setMonth(dt.getMonth() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const monthLessons = d.lessons.filter((l: any) => d.scopedLessonIds.has(l.id) && l.date.slice(0, 7) === key && l.status !== "canceled" && l.is_cancelled !== true);
    const recs = attendance.filter((a: any) => monthLessons.some((l: any) => l.id === a.lesson_id));
    const p = recs.filter((r: any) => r.status !== "ABSENT").length;
    attTrend.push({ month: monthLabel(key), rate: percentage(p, recs.length) });
  }

  const avgGrades = courses.map((c: any) => {
    const courseExams = exams.filter((e: any) => e.course_id === c.id);
    const courseGrades = grades.filter((g: any) => courseExams.some((e: any) => e.id === g.exam_id));
    if (!courseGrades.length) return { course: c.name, average: 0 };
    const sum = courseGrades.reduce((s, g) => {
      const ex = exams.find((e: any) => e.id === g.exam_id)!;
      return s + (g.score / ex.max_score) * 100;
    }, 0);
    return { course: c.name, average: round(sum / courseGrades.length, 1) };
  }).filter((x) => x.average > 0);

  const retention = growth.map((g, i) => ({
    cohort: g.month,
    retained: Math.round(percentage(students.filter((s: any) => s.status === "ACTIVE").length, students.length)) - i,
  }));

  const popularCourses = courses.map((c: any) => {
    const courseGroups = groups.filter((g: any) => g.course_id === c.id);
    const enrolled = courseGroups.reduce((s, g) =>
      s + collections().groupStudents.filter((gs) => gs.group_id === g.id).length, 0);
    const revenue = payments.filter((p: any) => courseGroups.some((cg: any) => cg.id === p.group_id))
      .reduce((x, p) => x + p.amount_paid, 0);
    return { course: c.name, students: enrolled, revenue };
  }).filter((x) => x.students > 0).sort((a, b) => b.students - a.students);

  const profitableGroups = groups.map((g: any) => {
    const pays = payments.filter((p: any) => p.group_id === g.id);
    return { group: g.name, revenue: pays.reduce((s, p) => s + p.amount_paid, 0), students: collections().groupStudents.filter((gs) => gs.group_id === g.id).length };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  return { studentGrowth: growth, monthlyRevenue, attendanceTrend: attTrend, averageGrades: avgGrades, retention, popularCourses, profitableGroups };
}
