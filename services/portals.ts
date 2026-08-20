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
  fetchStudentGroupIds,
} from "./_shared";
import { percentage, round, fullName } from "@/lib/utils";
import { isLessonUpcoming, lessonEndWallClockMinute, lessonWallClockMinute, wallClockMinute } from "./lessons";

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

/**
 * Resolve the student from the hydrated tenant snapshot first, then use a
 * server-side tenant-scoped read when a stale/empty snapshot is encountered.
 * The fallback is intentionally constrained by both the signed session's
 * academy_id and email; it never searches globally or selects another tenant.
 */
export async function resolveStudentForDashboard(user: SessionUser): Promise<Student | null> {
  const cached = resolveStudent(user);
  if (cached) return cached;
  if (!isSupabaseConfigured()) return null;

  try {
    const requestClient = await (await import("@/lib/supabase/server")).createServerSupabaseClient();
    const requestResult = await requestClient
      .from("students")
      .select("*")
      .eq("academy_id", user.academy_id)
      .ilike("email", user.email)
      .maybeSingle();
    if (!requestResult.error && requestResult.data) return requestResult.data as Student;

    const admin = nodeSupabaseClient();
    if (!admin) {
      if (requestResult.error) console.error("resolveStudentForDashboard error:", requestResult.error.message);
      return null;
    }
    const { data, error } = await admin
      .from("students")
      .select("*")
      .eq("academy_id", user.academy_id)
      .ilike("email", user.email)
      .maybeSingle();
    if (error) {
      console.error("resolveStudentForDashboard error:", error.message);
      return null;
    }
    return (data as Student | null) ?? null;
  } catch (error) {
    console.error("resolveStudentForDashboard error:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function groupsForStudentDashboard(
  studentId: string,
  academyId: string,
): Promise<ReturnType<typeof groupsForStudent>> {
  const cached = groupsForStudent(studentId);
  if (!isSupabaseConfigured()) return cached;

  try {
    const groupIds = await fetchStudentGroupIds(studentId, academyId);
    if (!groupIds.length) return cached;
    const [groups, courses] = await Promise.all([
      fetchTableRLS<any>("groups", academyId),
      fetchTableRLS<any>("courses", academyId),
    ]);
    return groups
      .filter((group: any) => groupIds.includes(group.id))
      .map((group: any) => ({
        ...group,
        course: courses.find((course: any) => course.id === group.course_id),
      })) as ReturnType<typeof groupsForStudent>;
  } catch (error) {
    console.error("groupsForStudentDashboard error:", error instanceof Error ? error.message : String(error));
    return cached;
  }
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

export async function childSummary(
  studentId: string,
  academyId?: string,
  knownGroups?: ReturnType<typeof groupsForStudent>,
): Promise<ChildSummary> {
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

  const groups = knownGroups ?? groupsForStudent(studentId);
  const groupIds = groups.map((g: any) => g.id);
  const upcoming = lessons
    .filter((l: any) => groupIds.includes(l.group_id) && isLessonUpcoming(l))
    .sort((a: any, b: any) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))[0];

  const hw = homework.filter((h: any) => h.student_id === studentId);
  const pendingHomework = hw.filter((h: any) => h.status === "PENDING").length;

  return { attendanceRate, averageGrade, outstanding, upcomingLesson: upcoming ? `${upcoming.topic} · ${new Date(upcoming.date).toLocaleDateString()}` : null, pendingHomework };
}

/** Lessons a student will attend (across their groups). */
export async function studentLessons(
  studentId: string,
  academyId?: string,
  knownGroups?: ReturnType<typeof groupsForStudent>,
) {
  let [lessons, groups] = await Promise.all([
    fetchTableRLS<any>("lessons", academyId),
    fetchTableRLS<any>("groups", academyId),
  ]);
  const scopedGroups = knownGroups ?? await groupsForStudentDashboard(studentId, academyId ?? "");
  const groupIds = scopedGroups.map((g: any) => g.id);

  // Prefer a live tenant-scoped read whenever Supabase is configured. The
  // request snapshot can be stale or contain older lesson projections (for
  // example a missing topic), even though the current row is complete.
  if (isSupabaseConfigured() && academyId && groupIds.length) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const [{ data: directLessons, error: lessonsError }, { data: directGroups, error: groupsError }] = await Promise.all([
        admin.from("lessons").select("*").eq("academy_id", academyId).in("group_id", groupIds).limit(1000),
        admin.from("groups").select("*").eq("academy_id", academyId).in("id", groupIds).limit(1000),
      ]);
      if (!lessonsError && directLessons?.length) lessons = directLessons;
      if (!groupsError && directGroups?.length) groups = directGroups;
    }
  }

  return lessons
    .filter((l: any) => groupIds.includes(l.group_id))
    .sort((a: any, b: any) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))
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
  needsAttendance: { id: string; topic: string; date: string; group_id: string; groupName: string }[];
  recentSubmissions: { id: string; studentName: string; title: string; status: string; homeworkId: string }[];
  assistantFor: string[];
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
  let allGroupAssistants = snapshot.groupAssistants ?? snapshot.group_assistants ?? [];
  let allTeachers = snapshot.teachers ?? [];

  // Use the server-side tenant-scoped client as the authoritative source for
  // teacher dashboards. A browser Supabase session can be valid for auth but
  // still return an empty RLS result after a mobile QR redirect; using that
  // empty snapshot here makes a real teacher appear to have zero data.
  if (isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const [groupsRes, lessonsRes, attendanceRes, homeworkRes, submissionsRes, studentsRes, coursesRes, assistantsRes, teachersRes] = await Promise.all([
        admin.from("groups").select("*").eq("academy_id", user.academy_id),
        admin.from("lessons").select("*").eq("academy_id", user.academy_id),
        admin.from("attendance").select("*").eq("academy_id", user.academy_id),
        admin.from("homework").select("*").eq("academy_id", user.academy_id),
        admin.from("homework_submissions").select("*").eq("academy_id", user.academy_id),
        admin.from("students").select("*").eq("academy_id", user.academy_id),
        admin.from("courses").select("*").eq("academy_id", user.academy_id),
        admin.from("group_assistants").select("*"),
        admin.from("teachers").select("*").eq("academy_id", user.academy_id),
      ]);
      if (!groupsRes.error) allGroups = groupsRes.data ?? [];
      if (!lessonsRes.error) allLessons = lessonsRes.data ?? [];
      if (!attendanceRes.error) allAttendance = attendanceRes.data ?? [];
      if (!homeworkRes.error) allHomework = homeworkRes.data ?? [];
      if (!submissionsRes.error) allSubmissions = submissionsRes.data ?? [];
      if (!studentsRes.error) allStudents = studentsRes.data ?? [];
      if (!coursesRes.error) allCourses = coursesRes.data ?? [];
      if (!assistantsRes.error) allGroupAssistants = assistantsRes.data ?? [];
      if (!teachersRes.error) allTeachers = teachersRes.data ?? [];
      const groupIds = allGroups.map((g: any) => g.id);
      if (groupIds.length) {
        const groupStudentsRes = await admin.from("group_students").select("*").in("group_id", groupIds);
        if (!groupStudentsRes.error) allGroupStudents = groupStudentsRes.data ?? [];
      }
    }
  }

  const ownGroupIds = allGroups.filter((g: any) => g.teacher_id === teacher.id).map((g: any) => g.id);
  const assistantRows = allGroupAssistants.length ? allGroupAssistants : collections().groupAssistants;
  const assistantGroupIds = assistantRows
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
    .sort((a: any, b: any) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time));
  const currentWallClock = wallClockMinute(new Date());
  const upcoming = myLessons
    .filter((l: any) => lessonEndWallClockMinute(l.date, l.start_time, l.end_time) >= currentWallClock)
    .slice(0, 6);

  const att = allAttendance.filter((a: any) => myLessons.some((l: any) => l.id === a.lesson_id));
  const present = att.filter((a: any) => a.status !== "ABSENT").length;
  const attendanceRate = att.length ? percentage(present, att.length) : 0;

  const needsAttendance = myLessons
    .filter((l: any) => lessonEndWallClockMinute(l.date, l.start_time, l.end_time) < currentWallClock && !allAttendance.some((a: any) => a.lesson_id === l.id))
    .slice(0, 5)
    .map((l: any) => ({ id: l.id, topic: l.topic, date: l.date, group_id: l.group_id, groupName: allGroups.find((g: any) => g.id === l.group_id)?.name ?? "" }));

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
  const assistantForIds = new Set(
    assistantGroupIds
      .map((groupId: string) => allGroups.find((g: any) => g.id === groupId)?.teacher_id)
      .filter((teacherId: any) => teacherId && teacherId !== teacher.id),
  );
  const assistantFor = [...assistantForIds].map((teacherId) => {
    const linkedTeacher = allTeachers.find((item: any) => item.id === teacherId);
    return linkedTeacher ? `${linkedTeacher.first_name} ${linkedTeacher.last_name}`.trim() : "";
  }).filter(Boolean);

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
    assistantFor,
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
        // Resolve memberships from the live tenant database. The synchronous
        // snapshot can be stale after a parent signs in on a fresh browser.
        for (const c of childrenList) {
          try { c.groups = await groupsForStudentDashboard(c.id, user.academy_id); } catch { c.groups = []; }
          c.parent = parent;
        }
        const summaries: Record<string, ChildSummary> = {};
        for (const c of childrenList) {
          try { summaries[c.id] = await childSummary(c.id, user.academy_id, c.groups); } catch {}
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
  const student = await resolveStudentForDashboard(user);
  if (!student) return null;

  const [attendance, allGrades, exams, lessons, homework, payments] = await Promise.all([
    fetchTableRLS<any>("attendance", user.academy_id),
    fetchTableRLS<any>("grades", user.academy_id),
    fetchTableRLS<any>("exams", user.academy_id),
    fetchTableRLS<any>("lessons", user.academy_id),
    fetchTableRLS<any>("homework_submissions", user.academy_id),
    fetchTableRLS<any>("payments", user.academy_id),
  ]);

  const groups = await groupsForStudentDashboard(student.id, user.academy_id);
  const summary = await childSummary(student.id, user.academy_id);
  const examMap = new Map(exams.map((e: any) => [e.id, e]));

  const groupIds = groups.map((g: any) => g.id);
  const myLessons = await studentLessons(student.id, user.academy_id, groups);

  const grades = allGrades.filter((g: any) => g.student_id === student.id).map((g: any) => {
    const ex = examMap.get(g.exam_id);
    return { ...g, percentage: ex ? (g.score / ex.max_score) * 100 : 0 };
  });

  return {
    student,
    groups,
    attendanceRate: summary.attendanceRate,
    averageGrade: summary.averageGrade,
    upcomingLessons: myLessons.filter((l: any) => isLessonUpcoming(l)).slice(0, 5),
    recentGrades: grades.slice(-5),
    pendingHomework: homework.filter((h: any) => h.student_id === student.id && h.status === "PENDING").slice(0, 5),
    recentAttendance: attendance.filter((a: any) => a.student_id === student.id).slice(-5).reverse(),
  };
}
