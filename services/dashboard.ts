/**
 * Dashboard, Analytics & Reports service.
 * ALL data access is RLS-backed via fetchTableRLS (user session).
 * Optimized for Serverless Environments (Vercel) & O(1) Lookups.
 */
import type {
  AnalyticsData,
  DashboardData,
  Homework,
  Lesson,
  Payment,
  Student,
} from "@/types";
import {
  getCourse,
  getGroup,
  getTeacher,
  byAcademy,
  fetchTableRLS,
  teacherGroupScope,
  teacherStudentScope,
  fullName,
} from "./_shared";
import { getPaymentMetrics } from "./payments";
import { performanceLevel } from "@/lib/constants";
import { percentage, round } from "@/lib/utils";
import { currentAcademyId } from "./session";
import { lessonEndWallClockMinute, lessonWallClockMinute, wallClockMinute } from "./lessons";
import { isAcademyHoliday } from "./attendance";
import { calculateRiskScore } from "./insights";
import { notifyRiskAlerts } from "./whatsapp";

// ─── Timezone Helpers (Africa/Cairo) ────────────────────────────
// يضمن هذا الجزء أن "اليوم" يُحسب بتوقيت مصر وليس بتوقيت سيرفر Vercel (UTC)
function getCairoTodayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); // Returns YYYY-MM-DD
}

function getCairoMonthKey() {
  return getCairoTodayKey().slice(0, 7); // Returns YYYY-MM
}

function getCairoDateObj() {
  const cairoDateStr = new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  return new Date(cairoDateStr);
}
// ─────────────────────────────────────────────────────────────────

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ar-EG", { month: "long" });
}

function averageGradePercent(
  grades: { exam_id: string; score: number }[],
  exams: { id: string; max_score: number }[],
): number {
  if (!grades.length) return 0;
  
  // تحسين الأداء باستخدام Map للوصول المباشر O(1)
  const examsMap = new Map(exams.map(e => [e.id, Number(e.max_score)]));
  
  const sum = grades.reduce((s, g) => {
    const maxScore = examsMap.get(g.exam_id) ?? 0;
    return s + (maxScore > 0 ? (Number(g.score) / maxScore) * 100 : 0);
  }, 0);
  return round(sum / grades.length, 0);
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
  const activeStudentsList = students.filter((s: any) => s.status === "ACTIVE" && s.is_active !== false);
  const activeStudents = activeStudentsList.length;
  const activeStudentsSet = new Set(activeStudentsList.map((s: any) => s.id));
  const totalGroups = groups.filter((g: any) => g.status === "ACTIVE" && g.is_active !== false).length;

  const chartRange = period === "year" ? 12 : 6;
  const collectedPeriodMonths = period === "month" ? 1 : period === "quarter" ? 3 : 12;
  const pay = await getPaymentMetrics(chartRange, academyId);
  const collectedForPeriod = pay.revenueByMonth
    .slice(-collectedPeriodMonths)
    .reduce((s, r) => s + r.collected, 0);

  const currentMonth = getCairoMonthKey();
  const todayKey = getCairoTodayKey();
  const cutoff = getCairoDateObj().getTime() - 30 * 86_400_000;
  
  // تحسين الأداء: بناء Hash Map للدروس لتجنب عمليات البحث المتكررة داخل الـ array
  const lessonsMap = new Map(lessons.map((l: any) => [l.id, l]));

  const activeAttendance = attendance
    .filter((record: any) => {
      const lesson = lessonsMap.get(record.lesson_id);
      return Boolean(lesson && activeLesson(lesson) && !isAcademyHoliday(lesson.date, academyId ?? currentAcademyId()));
    })
    .map((record: any) => ({
      ...record,
      recorded_at: record.recorded_at ?? lessonsMap.get(record.lesson_id)?.date,
    }));

  const recentAtt = activeAttendance.filter((record: any) => {
    const recordedAt = +new Date(String(record.recorded_at ?? ""));
    return Number.isFinite(recordedAt) && recordedAt >= cutoff;
  });

  const present = recentAtt.filter((a: any) => a.status !== "ABSENT").length;
  const attendanceRate = recentAtt.length ? percentage(present, recentAtt.length) : 0;

  // تحسين الأداء: تجميع أعداد الطلاب في كل مجموعة مسبقاً (O(N) بدل O(N^2))
  const groupEnrollments = new Map<string, number>();
  for (const membership of groupStudents) {
    if (activeStudentsSet.has(membership.student_id)) {
      groupEnrollments.set(membership.group_id, (groupEnrollments.get(membership.group_id) || 0) + 1);
    }
  }

  const expectedRevenueThisMonth = groups
    .filter((group: any) => group.status === "ACTIVE" && group.is_active !== false)
    .reduce((sum: number, group: any) => {
      const enrolled = groupEnrollments.get(group.id) || 0;
      return sum + Math.max(0, Number(group.monthly_fee ?? 0)) * enrolled;
    }, 0);

  const currentMonthPayments = payments.filter((payment: any) => paymentMonth(payment) === currentMonth);
  const collectedRevenueThisMonth = currentMonthPayments.reduce((sum: number, payment: any) => sum + Math.max(0, Number(payment.amount_paid ?? 0)), 0);
  
  const paidStudentIdsThisMonth = new Set(currentMonthPayments
    .filter((payment: any) => Number(payment.amount_paid ?? 0) >= Number(payment.amount_due ?? 0))
    .map((payment: any) => payment.student_id));
    
  const paidStudentCountThisMonth = paidStudentIdsThisMonth.size;
  const unpaidStudentCountThisMonth = Math.max(0, activeStudentsSet.size - paidStudentCountThisMonth);

  const newStudentsByMonth = Array.from({ length: 6 }, (_, index) => {
    const date = getCairoDateObj();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      month: key,
      count: students.filter((student: any) => String(student.created_at ?? "").slice(0, 7) === key).length,
    };
  });

  const overduePaymentCount = payments.filter((payment: any) =>
    payment.status !== "PAID" && Number(payment.amount_due ?? 0) > Number(payment.amount_paid ?? 0)
    && payment.due_date && String(payment.due_date).slice(0, 10) < todayKey,
  ).length;

  const currentMonthLessonIds = new Set(lessons
    .filter((lesson: any) => activeLesson(lesson) && !isAcademyHoliday(lesson.date, academyId ?? currentAcademyId()) && String(lesson.date ?? "").slice(0, 7) === currentMonth)
    .map((lesson: any) => lesson.id));
    
  const currentMonthAttendance = attendance.filter((record: any) => currentMonthLessonIds.has(record.lesson_id));
  const currentMonthPresent = currentMonthAttendance.filter((record: any) => record.status !== "ABSENT").length;
  const overallAttendanceThisMonth = currentMonthAttendance.length
    ? percentage(currentMonthPresent, currentMonthAttendance.length)
    : 0;

  const revenueByGroup = groups
    .filter((group: any) => group.status === "ACTIVE" && group.is_active !== false)
    .map((group: any) => {
      const enrolled = groupEnrollments.get(group.id) || 0;
      const expected = Math.max(0, Number(group.monthly_fee ?? 0)) * enrolled;
      const collected = currentMonthPayments
        .filter((payment: any) => payment.group_id === group.id)
        .reduce((sum: number, payment: any) => sum + Math.max(0, Number(payment.amount_paid ?? 0)), 0);
      return { name: group.name ?? "بدون اسم", expected, collected, unpaid: Math.max(0, expected - collected) };
    })
    .sort((a, b) => b.expected - a.expected || a.name.localeCompare(b.name));

  // تحسين فصل الدرجات والحضور لكل طالب مسبقاً قبل عملية حساب الخطر (Risk Calculation)
  const studentAttendanceMap = new Map<string, any[]>();
  const studentGradesMap = new Map<string, any[]>();
  
  for (const record of activeAttendance) {
    if (!studentAttendanceMap.has(record.student_id)) studentAttendanceMap.set(record.student_id, []);
    studentAttendanceMap.get(record.student_id)!.push(record);
  }
  for (const grade of grades) {
    if (!studentGradesMap.has(grade.student_id)) studentGradesMap.set(grade.student_id, []);
    studentGradesMap.get(grade.student_id)!.push(grade);
  }

  const riskStudents = activeStudentsList
    .map((student: any) => ({
      studentId: student.id,
      risk: calculateRiskScore({
        attendance: studentAttendanceMap.get(student.id) || [],
        grades: studentGradesMap.get(student.id) || [],
        exams,
      })
    }))
    .filter((item) => item.risk.category !== "safe");

  // ملاحظة هامة: في بيئة Next.js (Serverless) يجب استخدام await لضمان إرسال الرسائل قبل إغلاق الـ function
  // إذا كنت تستخدم Next.js 14+ يمكنك استبدالها بـ: unstable_after(() => notifyRiskAlerts(...))
  await notifyRiskAlerts(academyId ?? currentAcademyId(), riskStudents.map((item) => item.studentId));

  const today = getCairoDateObj();
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
    const lessonIds = new Set(lessons.filter((lesson: any) => activeLesson(lesson) && !isAcademyHoliday(lesson.date, academyId ?? currentAcademyId()) && dateInRange(lesson.date, start, end)).map((lesson: any) => lesson.id));
    const records = attendance.filter((record: any) => lessonIds.has(record.lesson_id));
    const attended = records.filter((record: any) => record.status !== "ABSENT").length;
    return { week: `الأسبوع ${index + 1}`, rate: records.length ? percentage(attended, records.length) : 0 };
  });

  // students by course (Optimized $O(N)$)
  const courseMapById = new Map(d.courses.map((c: any) => [c.id, c]));
  const courseMap = new Map<string, { students: number; color: string }>();
  for (const g of groups) {
    const course = courseMapById.get(g.course_id);
    const key = course?.name ?? "Uncategorized";
    const cur = courseMap.get(key) ?? { students: 0, color: course?.color ?? "#94a3b8" };
    cur.students += groupEnrollments.get(g.id) || 0;
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

  // grade performance (Optimized)
  const perfBuckets: Record<string, number> = { Excellent: 0, "Very Good": 0, Good: 0, "Needs Improvement": 0 };
  const examsMap = new Map(exams.map((e: any) => [e.id, Number(e.max_score)]));
  for (const g of grades) {
    const maxScore = examsMap.get(g.exam_id) ?? 0;
    if (maxScore <= 0) continue;
    perfBuckets[performanceLevel((Number(g.score) / maxScore) * 100)]++;
  }
  const gradePerformance = Object.entries(perfBuckets).map(([level, count]) => ({ level, count }));

  // حصص اليوم والغد فقط، مع إخفاء الحصة فور انتهاء وقتها.
  const nowWallClock = wallClockMinute(getCairoDateObj(), "Africa/Cairo");
  const todayStart = nowWallClock - (nowWallClock % (24 * 60));
  const tomorrowEnd = todayStart + (2 * 24 * 60);
  const upcomingLessons = d.lessons
    .filter((l: any) => {
      if (!d.scopedLessonIds.has(l.id) || l.status === "canceled" || l.is_cancelled === true) return false;
      const start = lessonWallClockMinute(l.date, l.start_time);
      const end = l.end_time ? lessonEndWallClockMinute(l.date, l.start_time, l.end_time) : start + 120;
      return end > nowWallClock && start < tomorrowEnd;
    })
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
    .filter((p: any) => p.month === currentMonth && p.status !== "PAID" && p.amount_due - p.amount_paid > 0)
    .slice(0, 6)
    .map((p: any) => ({ ...p, remaining: p.amount_due - p.amount_paid, student: students.find((s: any) => s.id === p.student_id) })) as any[];

  // needing attention
  const needing: any[] = [];
  const overdueStudentIds = new Set(payments.filter((p: any) => p.status !== "PAID" && p.month === currentMonth).map((p: any) => p.student_id));
  
  for (const s of students) {
    const att = studentAttendanceMap.get(s.id) || [];
    const presentCount = att.filter((a: any) => a.status !== "ABSENT").length;
    const rate = att.length ? percentage(presentCount, att.length) : 100;
    const overdue = overdueStudentIds.has(s.id);
    const sGrades = studentGradesMap.get(s.id) || [];
    const lowGrade = sGrades.some((g: any) => {
      const maxScore = examsMap.get(g.exam_id) ?? 0;
      return maxScore > 0 ? g.score / maxScore < 0.6 : false;
    });
    if (rate < 70 || overdue || lowGrade) needing.push(s);
  }

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
    attendanceSessions: recentAtt.length,
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
    currentMonthPaymentCount: currentMonthPayments.length,
    paidStudentCountThisMonth,
    unpaidStudentCountThisMonth,
    newStudentsByMonth,
    overduePaymentCount,
    overallAttendanceThisMonth,
    overallAttendanceSessionsThisMonth: currentMonthAttendance.length,
    atRiskCount: riskStudents.length,
    revenueByGroup,
    attendanceTrend4Weeks,
  };
}

export async function getAnalytics(academyId?: string): Promise<AnalyticsData> {
  const d = await getRLSData(academyId);
  const { students, groups, exams, payments, courses, attendance, grades, groupStudents } = d;

  const growth: { month: string; students: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = getCairoDateObj(); dt.setMonth(dt.getMonth() - i);
    const end = new Date(dt.getFullYear(), dt.getMonth() + 1, 1).getTime();
    const count = students.filter((s: any) => +new Date(s.enrolled_at) < end).length;
    growth.push({ month: monthLabel(`${dt.getFullYear()}-${dt.getMonth() + 1}`), students: count });
  }

  const pm = await getPaymentMetrics(6, academyId);
  const monthlyRevenue = pm.revenueByMonth.map((r: any) => ({ month: monthLabel(r.month), revenue: r.revenue, collected: r.collected }));

  const attTrend: { month: string; rate: number }[] = [];
  const lessonsMapByMonth = new Map<string, Set<string>>();
  
  for (const l of d.lessons) {
    if (d.scopedLessonIds.has(l.id) && l.status !== "canceled" && l.is_cancelled !== true) {
      const monthKey = l.date.slice(0, 7);
      if (!lessonsMapByMonth.has(monthKey)) lessonsMapByMonth.set(monthKey, new Set());
      lessonsMapByMonth.get(monthKey)!.add(l.id);
    }
  }

  for (let i = 5; i >= 0; i--) {
    const dt = getCairoDateObj(); dt.setMonth(dt.getMonth() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const lessonIds = lessonsMapByMonth.get(key) || new Set();
    
    const recs = attendance.filter((a: any) => lessonIds.has(a.lesson_id));
    const p = recs.filter((r: any) => r.status !== "ABSENT").length;
    attTrend.push({ month: monthLabel(key), rate: percentage(p, recs.length) });
  }

  const examsMap = new Map(exams.map((e: any) => [e.id, Number(e.max_score)]));
  const avgGrades = courses.map((c: any) => {
    const courseExamsIds = new Set(exams.filter((e: any) => e.course_id === c.id).map((e: any) => e.id));
    const courseGrades = grades.filter((g: any) => courseExamsIds.has(g.exam_id));
    
    if (!courseGrades.length) return { course: c.name, average: 0 };
    const sum = courseGrades.reduce((s, g) => {
      const maxScore = examsMap.get(g.exam_id) ?? 0;
      return s + (maxScore > 0 ? (Number(g.score) / maxScore) * 100 : 0);
    }, 0);
    return { course: c.name, average: round(sum / courseGrades.length, 1) };
  }).filter((x) => x.average > 0);

  const retention = growth.map((g, i) => ({
    cohort: g.month,
    retained: Math.round(percentage(students.filter((s: any) => s.status === "ACTIVE").length, students.length)) - i,
  }));

  const activeStudentIds = new Set(students.filter((s: any) => s.status === "ACTIVE" && s.is_active !== false).map((s: any) => s.id));
  
  const popularCourses = courses.map((c: any) => {
    const courseGroups = new Set(groups.filter((g: any) => g.course_id === c.id).map((g: any) => g.id));
    const enrolled = groupStudents.filter((gs: any) => courseGroups.has(gs.group_id) && activeStudentIds.has(gs.student_id)).length;
    const revenue = payments
      .filter((p: any) => courseGroups.has(p.group_id))
      .reduce((x, p) => x + Math.max(0, Number(p.amount_paid ?? 0)), 0);
    return { course: c.name, students: enrolled, revenue };
  }).filter((x) => x.students > 0).sort((a, b) => b.students - a.students);

  const profitableGroups = groups.map((g: any) => {
    const pays = payments.filter((p: any) => p.group_id === g.id);
    const studentsCount = groupStudents.filter((gs: any) => gs.group_id === g.id && activeStudentIds.has(gs.student_id)).length;
    return { 
      group: g.name, 
      revenue: pays.reduce((s, p) => s + Math.max(0, Number(p.amount_paid ?? 0)), 0), 
      students: studentsCount 
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  return { studentGrowth: growth, monthlyRevenue, attendanceTrend: attTrend, averageGrades: avgGrades, retention, popularCourses, profitableGroups };
}

export type TeacherDailyOps = {
  // ... (نفس الـ Types السابقة لم تتغير)
  todayKey: string;
  todaysLessons: Array<any>;
  attendanceMissing: Array<any>;
  atRiskStudents: Array<any>;
  duePayments: Array<any>;
  homeworkToReview: Array<any>;
  counts: any;
};

export async function getTeacherDailyOps(academyId?: string): Promise<TeacherDailyOps> {
  const d = await getRLSData(academyId);
  const { students, groups, exams, lessons, attendance, grades, homework, submissions, groupStudents, payments } = d;

  const today = getCairoDateObj();
  today.setHours(0, 0, 0, 0);
  const todayKey = getCairoTodayKey(); // إصلاح التوقيت

  // تحسين الأداء بإنشاء Maps للحصول على قيم بـ O(1)
  const groupsMap = new Map(groups.map((g: any) => [g.id, g]));
  const coursesMap = new Map(d.courses.map((c: any) => [c.id, c]));
  const studentsMap = new Map(students.map((s: any) => [s.id, s]));
  
  const groupStudentCounts = new Map<string, number>();
  for (const gs of groupStudents) {
    groupStudentCounts.set(gs.group_id, (groupStudentCounts.get(gs.group_id) || 0) + 1);
  }

  const groupName = (gid: string) => groupsMap.get(gid)?.name ?? null;
  const courseName = (gid: string) => {
    const courseId = groupsMap.get(gid)?.course_id;
    return courseId ? (coursesMap.get(courseId)?.name ?? null) : null;
  };
  
  const studentName = (sid: string) => {
    const s = studentsMap.get(sid);
    // تم إصلاح المنطق هنا بحيث لا نبحث في array مرتين بلا فائدة
    return s ? fullName(s) : (s?.first_name ?? "—");
  };
  const studentsInGroup = (gid: string) => groupStudentCounts.get(gid) || 0;

  // Today's lessons (active only).
  const todaysLessons = lessons
    .filter((l: any) => d.scopedLessonIds.has(l.id) && activeLesson(l) && String(l.date ?? "").slice(0, 10) === todayKey)
    .sort((a: any, b: any) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))
    .map((l: any) => {
      const recs = attendance.filter((a: any) => a.lesson_id === l.id);
      return {
        id: l.id,
        groupId: l.group_id,
        groupName: groupName(l.group_id),
        courseName: courseName(l.group_id),
        date: l.date,
        startTime: l.start_time ?? null,
        endTime: l.end_time ?? null,
        status: l.status ?? null,
        attendanceRecorded: recs.length > 0,
        presentCount: recs.filter((r: any) => r.status !== "ABSENT").length,
        totalStudents: studentsInGroup(l.group_id),
      };
    });

  // Lessons without attendance (any active lesson up to today, not yet recorded).
  const attendanceMissing = lessons
    .filter((l: any) => d.scopedLessonIds.has(l.id) && activeLesson(l) && l.status !== "canceled")
    .filter((l: any) => {
      const dt = +new Date(String(l.date ?? ""));
      return Number.isFinite(dt) && dt <= today.getTime() + 86_400_000;
    })
    .filter((l: any) => attendance.filter((a: any) => a.lesson_id === l.id).length === 0)
    .sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 10)
    .map((l: any) => ({
      id: l.id,
      groupId: l.group_id,
      groupName: groupName(l.group_id),
      date: l.date,
      startTime: l.start_time ?? null,
      totalStudents: studentsInGroup(l.group_id),
    }));

  const studentAttendanceMap = new Map<string, any[]>();
  const studentGradesMap = new Map<string, any[]>();
  const studentGroupMap = new Map(groupStudents.map((gs: any) => [gs.student_id, gs.group_id]));
  
  for (const record of attendance) {
    if (!studentAttendanceMap.has(record.student_id)) studentAttendanceMap.set(record.student_id, []);
    studentAttendanceMap.get(record.student_id)!.push(record);
  }
  for (const grade of grades) {
    if (!studentGradesMap.has(grade.student_id)) studentGradesMap.set(grade.student_id, []);
    studentGradesMap.get(grade.student_id)!.push(grade);
  }

  const activeStudents = students.filter((s: any) => s.status === "ACTIVE" && s.is_active !== false);
  const atRiskStudents = activeStudents
    .map((s: any) => {
      const risk = calculateRiskScore({
        attendance: studentAttendanceMap.get(s.id) || [],
        grades: studentGradesMap.get(s.id) || [],
        exams,
      });
      return { 
        studentId: s.id, 
        name: fullName(s), 
        riskCategory: risk.category, 
        riskScore: risk.score ?? 0, 
        groupName: groupName(studentGroupMap.get(s.id)) 
      };
    })
    .filter((x) => x.riskCategory !== "safe")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)
    .map((x) => ({ ...x, groupName: x.groupName ?? null }));

  const currentMonth = getCairoMonthKey();
  const duePayments = payments
    .filter((p: any) => !p.deleted_at && (p.month ?? p.month_year) === currentMonth && p.status !== "PAID")
    .map((p: any) => ({
      id: p.id,
      studentId: p.student_id,
      studentName: studentName(p.student_id),
      groupName: groupName(p.group_id),
      remaining: Math.max(0, Number(p.amount_due ?? 0) - Number(p.amount_paid ?? 0)),
      month: p.month ?? p.month_year ?? currentMonth,
    }))
    .filter((x: any) => x.remaining > 0)
    .sort((a: any, b: any) => b.remaining - a.remaining)
    .slice(0, 12);

  const reviewStatuses = new Set(["pending", "submitted", "PENDING", "SUBMITTED"]);
  const hwById = new Map<string, any>(homework.map((h: any) => [h.id, h]));
  const homeworkToReview = submissions
    .filter((s: any) => reviewStatuses.has(String(s.status ?? "").toLowerCase()))
    .map((s: any) => {
      const hw = hwById.get(s.homework_id);
      return {
        id: s.id,
        homeworkId: s.homework_id,
        title: hw?.title ?? "—",
        studentId: s.student_id,
        studentName: studentName(s.student_id),
        groupName: hw ? groupName(hw.group_id) : null,
        submittedAt: s.submitted_at ?? null,
      };
    })
    .sort((a, b) => +new Date(b.submittedAt ?? 0) - +new Date(a.submittedAt ?? 0))
    .slice(0, 12);

  return {
    todayKey,
    todaysLessons,
    attendanceMissing,
    atRiskStudents,
    duePayments,
    homeworkToReview,
    counts: {
      todaysLessons: todaysLessons.length,
      attendanceMissing: attendanceMissing.length,
      atRisk: atRiskStudents.length,
      duePayments: duePayments.length,
      homeworkToReview: homeworkToReview.length,
    },
  };
}
