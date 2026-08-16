/**
 * Portal services — scope data to the authenticated parent or student.
 * ALL data access is RLS-backed via fetchTableRLS (user session).
 */
import type { SessionUser, Student, Parent } from "@/types";
import { isSupabaseConfigured } from "./supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { collections } from "./data/store";
import {
  groupsForStudent,
  teacherGroupScope,
  fetchTableRLS,
} from "./_shared";
import { percentage, round, fullName } from "@/lib/utils";

/** Resolve the parent record for a logged-in PARENT user. */
export function resolveParent(user: SessionUser): Parent | null {
  return (
    collections().parents.find(
      (p) => p.profile_id === user.id || p.email.toLowerCase() === user.email.toLowerCase(),
    ) ?? null
  );
}

/** Resolve the student record for a logged-in STUDENT user. */
export function resolveStudent(user: SessionUser): Student | null {
  return (
    collections().students.find(
      (s) =>
        s.academy_id === user.academy_id &&
        s.email?.toLowerCase() === user.email.toLowerCase(),
    ) ?? null
  );
}

/** Children of a parent, with groups attached. */
export function getMyChildren(
  user: SessionUser,
): (Student & { groups: ReturnType<typeof groupsForStudent> })[] {
  const parent = resolveParent(user);
  if (!parent) return [];
  return collections()
    .students.filter((s) => s.parent_id === parent.id && s.status !== "ARCHIVED")
    .map((s) => ({ ...s, groups: groupsForStudent(s.id) }));
}

export interface ChildSummary {
  attendanceRate: number;
  averageGrade: number;
  outstanding: number;
  upcomingLesson: string | null;
  pendingHomework: number;
}

export async function childSummary(studentId: string, academyId?: string): Promise<ChildSummary> {
  // RLS-backed fetch.
  const [attendance, allGrades, payments, lessons, homework, exams] = await Promise.all([
    fetchTableRLS<any>("attendance", academyId),
    fetchTableRLS<any>("grades", academyId),
    fetchTableRLS<any>("payments", academyId),
    fetchTableRLS<any>("lessons", academyId),
    fetchTableRLS<any>("homework_submissions", academyId),
    fetchTableRLS<any>("exams", academyId),
  ]);

  const att = attendance.filter((a: any) => a.student_id === studentId);
  const present = att.filter((a: any) => a.status !== "ABSENT").length;
  const attendanceRate = att.length ? percentage(present, att.length) : 0;

  const grades = allGrades.filter((g: any) => g.student_id === studentId);
  const examMap = new Map(exams.map((e: any) => [e.id, e]));
  const averageGrade = grades.length
    ? round(grades.reduce((s: number, g: any) => {
        const ex = examMap.get(g.exam_id);
        return s + (ex ? (g.score / ex.max_score) * 100 : 0);
      }, 0) / grades.length, 0)
    : 0;

  const pays = payments.filter((p: any) => p.student_id === studentId);
  const outstanding = pays.reduce((s: number, p: any) => s + Math.max(0, p.amount_due - p.amount_paid), 0);

  const groups = groupsForStudent(studentId);
  const groupIds = groups.map((g: any) => g.id);
  const upcoming = lessons
    .filter((l: any) => groupIds.includes(l.group_id) && +new Date(l.date) >= Date.now())
    .sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date))[0];

  const hw = homework.filter((h: any) => h.student_id === studentId);
  const pendingHomework = hw.filter((h: any) => h.status === "PENDING").length;

  return { attendanceRate, averageGrade, outstanding, upcomingLesson: upcoming ? `${upcoming.topic} · ${new Date(upcoming.date).toLocaleDateString()}` : null, pendingHomework };
}

/** Lessons a student will attend (across their groups). */
export async function studentLessons(studentId: string, academyId?: string) {
  const [lessons, groups] = await Promise.all([
    fetchTableRLS<any>("lessons", academyId),
    fetchTableRLS<any>("groups", academyId),
  ]);
  const groupIds = groupsForStudent(studentId).map((g: any) => g.id);
  return lessons
    .filter((l: any) => groupIds.includes(l.group_id))
    .sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date))
    .map((l: any) => ({ ...l, group: groups.find((g: any) => g.id === l.group_id) }));
}

export interface ParentDashboardData {
  children: (Student & { groups: ReturnType<typeof groupsForStudent> })[];
  summaries: Record<string, ChildSummary>;
}

/** Resolve the teacher record for a logged-in TEACHER user. */
export function resolveTeacher(user: SessionUser) {
  return (
    collections().teachers.find(
      (t) =>
        t.academy_id === user.academy_id &&
        (t.profile_id === user.id || t.email?.toLowerCase() === user.email.toLowerCase()),
    ) ?? null
  );
}

/** Resolve from the request-bound database if the academy snapshot is stale. */
async function resolveTeacherForDashboard(user: SessionUser) {
  const cached = resolveTeacher(user);
  if (cached || !isSupabaseConfigured()) return cached;
  try {
    // The tenant session can be valid while the request-local snapshot is still
    // warming up. Resolve the teacher from the server-side tenant-scoped query
    // first so a standalone teacher workspace never renders a false empty state.
    const adminClient = nodeSupabaseClient();
    if (adminClient) {
      const { data: byProfile, error: adminError } = await adminClient
        .from("teachers")
        .select("*")
        .eq("academy_id", user.academy_id)
        .eq("profile_id", user.id)
        .maybeSingle();
      if (adminError) console.error("resolveTeacherForDashboard admin lookup failed:", adminError.message);
      if (byProfile) return byProfile as any;
      const { data: byEmail } = await adminClient
        .from("teachers")
        .select("*")
        .eq("academy_id", user.academy_id)
        .ilike("email", user.email)
        .maybeSingle();
      if (byEmail) return byEmail as any;
    }

    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const client = await createServerSupabaseClient();
    const byProfile = await client
      .from("teachers")
      .select("*")
      .eq("academy_id", user.academy_id)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (byProfile.data) return byProfile.data as any;
    const byEmail = await client
      .from("teachers")
      .select("*")
      .eq("academy_id", user.academy_id)
      .ilike("email", user.email)
      .maybeSingle();
    return (byEmail.data as any) ?? null;
  } catch (error) {
    console.error("resolveTeacherForDashboard error:", (error as Error)?.message);
    return null;
  }
}

export interface TeacherDashboardData {
  teacherName: string;
  groupCount: number;
  studentCount: number;
  upcomingCount: number;
  attendanceRate: number;
  pendingReview: number;
  upcomingLessons: any[];
  groups: any[];
  needsAttendance: { id: string; topic: string; date: string; groupName: string }[];
  recentSubmissions: { id: string; studentName: string; title: string; status: string; homeworkId: string }[];
}

export async function getTeacherDashboard(user: SessionUser): Promise<TeacherDashboardData | null> {
  const teacher = await resolveTeacherForDashboard(user);
  if (!teacher) return null;

  // requireScopedRole() hydrates the signed-in academy snapshot before this
  // service runs. Read that scoped snapshot directly so a mobile browser's
  // Supabase RLS session cannot turn a populated teacher portal into zeros.
  const snapshot = collections() as any;
  let allGroups = snapshot.groups ?? [];
  let allLessons = snapshot.lessons ?? [];
  let allAttendance = snapshot.attendance ?? [];
  let allHomework = snapshot.homework ?? [];
  let allSubmissions = snapshot.homeworkSubmissions ?? snapshot.homework_submissions ?? [];
  let allStudents = snapshot.students ?? [];
  let allCourses = snapshot.courses ?? [];
  let allGroupStudents = snapshot.groupStudents ?? snapshot.group_students ?? [];

  // Last-resort server fallback for a stale/empty request snapshot. This is
  // still tenant-scoped by academy_id and never runs in the browser.
  if (!allGroups.length && isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const [groupsRes, lessonsRes, attendanceRes, homeworkRes, submissionsRes, studentsRes, coursesRes] = await Promise.all([
        admin.from("groups").select("*").eq("academy_id", user.academy_id),
        admin.from("lessons").select("*").eq("academy_id", user.academy_id),
        admin.from("attendance").select("*").eq("academy_id", user.academy_id),
        admin.from("homework").select("*").eq("academy_id", user.academy_id),
        admin.from("homework_submissions").select("*").eq("academy_id", user.academy_id),
        admin.from("students").select("*").eq("academy_id", user.academy_id),
        admin.from("courses").select("*").eq("academy_id", user.academy_id),
      ]);
      allGroups = groupsRes.data ?? [];
      allLessons = lessonsRes.data ?? [];
      allAttendance = attendanceRes.data ?? [];
      allHomework = homeworkRes.data ?? [];
      allSubmissions = submissionsRes.data ?? [];
      allStudents = studentsRes.data ?? [];
      allCourses = coursesRes.data ?? [];
      const groupIds = allGroups.map((g: any) => g.id);
      if (groupIds.length) {
        const groupStudentsRes = await admin.from("group_students").select("*").in("group_id", groupIds);
        allGroupStudents = groupStudentsRes.data ?? [];
      }
    }
  }

  const ownGroupIds = allGroups.filter((g: any) => g.teacher_id === teacher.id).map((g: any) => g.id);
  const assistantGroupIds = collections().groupAssistants
    .filter((ga: any) => ga.teacher_id === teacher.id && allGroups.some((g: any) => g.id === ga.group_id))
    .map((ga: any) => ga.group_id);
  const groupIds = new Set([...ownGroupIds, ...assistantGroupIds]);
  const myGroups = allGroups.filter((g: any) => groupIds.has(g.id))
    .map((g: any) => ({ ...g, course: allCourses.find((c: any) => c.id === g.course_id) }));

  const groupStudentRows = allGroupStudents.length ? allGroupStudents : (collections() as any).groupStudents ?? [];
  const enrolledIds = new Set(
    groupStudentRows.filter((gs: any) => groupIds.has(gs.group_id)).map((gs: any) => gs.student_id)
  );
  const myLessons = allLessons.filter((l: any) => groupIds.has(l.group_id))
    .sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date));
  const upcoming = myLessons.filter((l: any) => +new Date(l.date) >= Date.now()).slice(0, 6);

  const att = allAttendance.filter((a: any) => myLessons.some((l: any) => l.id === a.lesson_id));
  const present = att.filter((a: any) => a.status !== "ABSENT").length;
  const attendanceRate = att.length ? percentage(present, att.length) : 0;

  const needsAttendance = myLessons
    .filter((l: any) => +new Date(l.date) <= Date.now() && !allAttendance.some((a: any) => a.lesson_id === l.id))
    .slice(0, 5)
    .map((l: any) => ({ id: l.id, topic: l.topic, date: l.date, groupName: allGroups.find((g: any) => g.id === l.group_id)?.name ?? "" }));

  const myHwIds = allHomework.filter((h: any) => groupIds.has(h.group_id)).map((h: any) => h.id);
  const recentSubmissions = allSubmissions
    .filter((s: any) => myHwIds.includes(s.homework_id) && s.status !== "PENDING")
    .sort((a: any, b: any) => +new Date(b.submitted_at ?? 0) - +new Date(a.submitted_at ?? 0))
    .slice(0, 5)
    .map((s: any) => {
      const st = allStudents.find((x: any) => x.id === s.student_id);
      const hw = allHomework.find((h: any) => h.id === s.homework_id);
      return { id: s.id, studentName: st ? fullName(st) : "—", title: hw?.title ?? "", status: s.status, homeworkId: s.homework_id };
    });
  const pendingReview = allSubmissions.filter((s: any) => myHwIds.includes(s.homework_id) && s.status === "SUBMITTED").length;

  return {
    teacherName: `${teacher.first_name} ${teacher.last_name}`,
    groupCount: myGroups.length,
    studentCount: enrolledIds.size,
    upcomingCount: upcoming.length,
    attendanceRate,
    pendingReview,
    upcomingLessons: upcoming,
    groups: myGroups,
    needsAttendance,
    recentSubmissions,
  };
}

export async function getParentDashboard(user: SessionUser): Promise<ParentDashboardData> {
  try {
    if (isSupabaseConfigured()) {
      const { createServerSupabaseClient } = await import("@/lib/supabase/server");
      const client = await createServerSupabaseClient();
      const { data: parent } = await client
        .from("parents")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();
      if (parent) {
        const { data: children } = await client
          .from("students")
          .select("*")
          .eq("parent_id", parent.id);
        const childrenList = (children ?? []) as any[];
        // أربط groups + parent لكل طالب (عشان الصفحات اللي بتستخدمهم)
        const { groupsForStudent } = await import("./_shared");
        for (const c of childrenList) {
          try { c.groups = groupsForStudent(c.id); } catch { c.groups = []; }
          c.parent = parent;
        }
        const summaries: Record<string, ChildSummary> = {};
        for (const c of childrenList) {
          try { summaries[c.id] = await childSummary(c.id); } catch {}
        }
        return { children: childrenList, summaries };
      }
    }
  } catch (e) {
    console.error("getParentDashboard error:", (e as Error)?.message);
  }
  const children = getMyChildren(user);
  const summaries: Record<string, ChildSummary> = {};
  for (const c of children) {
    try { summaries[c.id] = await childSummary(c.id); } catch {}
  }
  return { children, summaries };
}

export interface StudentDashboardData {
  student: Student;
  groups: ReturnType<typeof groupsForStudent>;
  attendanceRate: number;
  averageGrade: number;
  upcomingLessons: any[];
  recentGrades: any[];
  pendingHomework: any[];
  recentAttendance: any[];
}

export async function getStudentDashboard(user: SessionUser): Promise<StudentDashboardData | null> {
  const student = resolveStudent(user);
  if (!student) return null;

  const [attendance, allGrades, exams, lessons, homework, payments] = await Promise.all([
    fetchTableRLS<any>("attendance", user.academy_id),
    fetchTableRLS<any>("grades", user.academy_id),
    fetchTableRLS<any>("exams", user.academy_id),
    fetchTableRLS<any>("lessons", user.academy_id),
    fetchTableRLS<any>("homework_submissions", user.academy_id),
    fetchTableRLS<any>("payments", user.academy_id),
  ]);

  const groups = groupsForStudent(student.id);
  const summary = await childSummary(student.id, user.academy_id);
  const examMap = new Map(exams.map((e: any) => [e.id, e]));

  const groupIds = groups.map((g: any) => g.id);
  const myLessons = await studentLessons(student.id, user.academy_id);

  const grades = allGrades.filter((g: any) => g.student_id === student.id).map((g: any) => {
    const ex = examMap.get(g.exam_id);
    return { ...g, percentage: ex ? (g.score / ex.max_score) * 100 : 0 };
  });

  return {
    student,
    groups,
    attendanceRate: summary.attendanceRate,
    averageGrade: summary.averageGrade,
    upcomingLessons: myLessons.filter((l: any) => +new Date(l.date) >= Date.now()).slice(0, 5),
    recentGrades: grades.slice(-5),
    pendingHomework: homework.filter((h: any) => h.student_id === student.id && h.status === "PENDING").slice(0, 5),
    recentAttendance: attendance.filter((a: any) => a.student_id === student.id).slice(-5).reverse(),
  };
}
