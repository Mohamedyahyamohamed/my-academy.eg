/**
 * Shared helpers for the local data layer.
 * (Server-only. The Supabase adapter replaces these in production.)
 */
import { collections } from "./data/store";
import { currentAcademyId, currentTeacherId, getCurrentUser } from "./session";
import { getRequestAcademyId } from "./request-context";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type {
  AttendanceRecord,
  Course,
  Grade,
  Group,
  Lesson,
  Parent,
  Payment,
  Student,
  Teacher,
  Exam,
} from "@/types";
import { performanceLevel } from "@/lib/constants";

/** Filter a collection to the current academy (app-layer multi-tenant isolation). */
export function byAcademy<T extends { academy_id?: string | null }>(items: T[], academyId?: string): T[] {
  const aid = academyId ?? currentAcademyId();
  if (!aid) return items;
  return items.filter((i) => i.academy_id === aid);
}

/**
 * Read tenant data without depending on a browser-bound RLS client.
 * The request snapshot is already hydrated by requireScopedRole; using it first
 * avoids Invalid API key failures and keeps child tables tenant-scoped through
 * the snapshot's group/lesson joins. A service-role read is only a cold-start
 * fallback and is narrowed by academy_id for direct-tenant tables.
 */
const DIRECT_TENANT_TABLES = new Set([
  "academies", "profiles", "courses", "teachers", "parents", "students", "groups",
  "lessons", "payments", "exams", "homework", "notifications", "notes", "files",
  "messages", "subscriptions", "content_courses", "content_lessons", "content_files",
  "content_progress", "audit_logs",
]);

/** Child tables have no academy_id; scope them through their tenant-owned parent. */
const CHILD_TABLE_PARENTS: Record<string, { parentTable: string; foreignKey: string }> = {
  group_students: { parentTable: "groups", foreignKey: "group_id" },
  group_assistants: { parentTable: "groups", foreignKey: "group_id" },
  attendance: { parentTable: "lessons", foreignKey: "lesson_id" },
  grades: { parentTable: "exams", foreignKey: "exam_id" },
  homework_submissions: { parentTable: "homework", foreignKey: "homework_id" },
  payment_transactions: { parentTable: "payments", foreignKey: "payment_id" },
};

export async function fetchStudentGroupIds(studentId: string, academyId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return collections().groupStudents.filter((row) => row.student_id === studentId).map((row) => row.group_id);
  }

  try {
    let client: any = await createServerSupabaseClient();
    let membershipsResult = await client
      .from("group_students")
      .select("group_id")
      .eq("student_id", studentId)
      .limit(1000);
    if (membershipsResult.error) {
      const admin = nodeSupabaseClient();
      if (!admin) throw membershipsResult.error;
      client = admin;
      membershipsResult = await client
        .from("group_students")
        .select("group_id")
        .eq("student_id", studentId)
        .limit(1000);
    }
    if (membershipsResult.error) throw membershipsResult.error;
    const candidateIds = (membershipsResult.data ?? []).map((row: any) => row.group_id).filter(Boolean);
    if (!candidateIds.length) return [];
    const { data: groups, error: groupsError } = await client
      .from("groups")
      .select("id")
      .eq("academy_id", academyId)
      .in("id", candidateIds)
      .limit(1000);
    if (groupsError) throw groupsError;
    return (groups ?? []).map((group: any) => group.id).filter(Boolean);
  } catch (error) {
    console.error("fetchStudentGroupIds error:", error instanceof Error ? error.message : String(error));
    return collections().groupStudents.filter((row) => row.student_id === studentId).map((row) => row.group_id);
  }
}

export async function fetchGroupStudentIds(groupId: string, academyId?: string): Promise<string[]> {
  const cached = collections().groupStudents.filter((row) => row.group_id === groupId).map((row) => row.student_id);
  if (!isSupabaseConfigured()) return cached;
  try {
    let client: any = await createServerSupabaseClient();
    let result = await client.from("group_students").select("student_id").eq("group_id", groupId).limit(1000);
    const shouldUseValidatedAdminFallback = Boolean(academyId) && !result.error && (result.data ?? []).length === 0;
    if (result.error || shouldUseValidatedAdminFallback) {
      const admin = nodeSupabaseClient();
      if (!admin) {
        if (result.error) throw result.error;
        return (result.data ?? []).map((row: any) => row.student_id).filter(Boolean);
      }
      if (academyId) {
        const groupCheck = await admin
          .from("groups")
          .select("id")
          .eq("id", groupId)
          .eq("academy_id", academyId)
          .maybeSingle();
        if (groupCheck.error) throw groupCheck.error;
        if (!groupCheck.data) return [];
      }
      client = admin;
      result = await client.from("group_students").select("student_id").eq("group_id", groupId).limit(1000);
    }
    if (result.error) throw result.error;
    return (result.data ?? []).map((row: any) => row.student_id).filter(Boolean);
  } catch (error) {
    console.error("fetchGroupStudentIds error:", error instanceof Error ? error.message : String(error));
    return cached;
  }
}

export async function fetchTeacherAssistantGroupIds(teacherId: string, academyId: string): Promise<string[]> {
  const cached = collections().groupAssistants.filter((row) => row.teacher_id === teacherId).map((row) => row.group_id);
  if (!isSupabaseConfigured()) return cached;
  try {
    let client: any = await createServerSupabaseClient();
    let result = await client.from("group_assistants").select("group_id").eq("teacher_id", teacherId).limit(1000);
    if (result.error) {
      const admin = nodeSupabaseClient();
      if (!admin) throw result.error;
      result = await admin.from("group_assistants").select("group_id").eq("teacher_id", teacherId).limit(1000);
      client = admin;
    }
    if (result.error) throw result.error;
    const candidateIds = (result.data ?? []).map((row: any) => row.group_id).filter(Boolean);
    if (!candidateIds.length) return cached;
    const { data: groups, error } = await client.from("groups").select("id").eq("academy_id", academyId).in("id", candidateIds).limit(1000);
    if (error) throw error;
    return (groups ?? []).map((group: any) => group.id).filter(Boolean);
  } catch (error) {
    console.error("fetchTeacherAssistantGroupIds error:", error instanceof Error ? error.message : String(error));
    return cached;
  }
}

export async function fetchTableRLS<T = any>(table: string, academyId?: string): Promise<T[]> {
  const aid = academyId ?? getRequestAcademyId();
  // Hydrated SeedData stores underscored SQL tables as camelCase keys
  // (e.g. contentCourses). Resolve both forms before using the cold-start
  // Supabase fallback so tenant reads remain consistent after SSR hydration.
  const snapshot = collections() as any;
  const snapshotKey = table.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  const cacheData = snapshot[table] ?? snapshot[snapshotKey] ?? [];
  const childRelation = CHILD_TABLE_PARENTS[table];

  if (cacheData.length > 0) {
    if (DIRECT_TENANT_TABLES.has(table)) {
      const filtered = aid ? cacheData.filter((row: any) => row.academy_id === aid) : [];
      // A stale/partial SSR snapshot must not mask a live tenant read.
      if (filtered.length || !isSupabaseConfigured() || !aid) return filtered as T[];
    } else if (childRelation) {
      const parentKey = childRelation.parentTable.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      const parentRows = snapshot[childRelation.parentTable] ?? snapshot[parentKey] ?? [];
      const parentIds = new Set(
        parentRows
          .filter((row: any) => !aid || row.academy_id === aid)
          .map((row: any) => row.id),
      );
      const filtered = cacheData.filter((row: any) => parentIds.has(row[childRelation.foreignKey]));
      if (filtered.length || !isSupabaseConfigured() || !aid) return filtered as T[];
    } else {
      return cacheData as T[];
    }
  }

  if (!isSupabaseConfigured() || !aid) return [];

  try {
    // Prefer the request-bound user client so RLS remains the primary boundary.
    let client: any = await createServerSupabaseClient();
    let result: any;
    if (DIRECT_TENANT_TABLES.has(table)) {
      result = await client.from(table).select("*").eq("academy_id", aid).limit(5000);
    } else if (childRelation) {
      const parentRows = await fetchTableRLS<any>(childRelation.parentTable, aid);
      const parentIds = parentRows.map((row: any) => row.id).filter(Boolean);
      if (!parentIds.length) return [];
      result = await client.from(table).select("*").in(childRelation.foreignKey, parentIds).limit(5000);
    } else {
      return [];
    }

    if (result.error) {
      const admin = nodeSupabaseClient();
      if (!admin) {
        console.error(`[data] ${table} tenant read failed:`, result.error.message);
        return [];
      }
      if (DIRECT_TENANT_TABLES.has(table)) {
        result = await admin.from(table).select("*").eq("academy_id", aid).limit(5000);
      } else {
        const parentRows = await fetchTableRLS<any>(childRelation!.parentTable, aid);
        const parentIds = parentRows.map((row: any) => row.id).filter(Boolean);
        if (!parentIds.length) return [];
        result = await admin.from(table).select("*").in(childRelation!.foreignKey, parentIds).limit(5000);
      }
    }
    if (result.error) {
      console.error(`[data] ${table} tenant read failed:`, result.error.message);
      return [];
    }
    return (result.data ?? []) as T[];
  } catch (error) {
    console.error(`[data] ${table} tenant read failed:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * The set of group ids the current teacher is allowed to access, or null if
 * the caller is not a teacher (admins/parents/students are handled elsewhere).
 * Teachers are restricted to the groups assigned to them.
 */
export function teacherGroupScope(): Set<string> | null {
  const tid = currentTeacherId();
  if (!tid) return null;
  const owned = byAcademy(collections().groups)
    .filter((g) => g.teacher_id === tid)
    .map((g) => g.id);
  const assisted = collections()
    .groupAssistants.filter((ga) => ga.teacher_id === tid)
    .map((ga) => ga.group_id);
  return new Set([...owned, ...assisted]);
}

/**
 * Student ids visible to the current teacher. In an academy workspace this is
 * derived from assigned groups; in a personal TEACHER workspace, students
 * explicitly owned by the teacher are also visible before group assignment.
 */
export function teacherStudentScope(): Set<string> | null {
  const scope = teacherGroupScope();
  if (!scope) return null;
  const ids = new Set(
    collections()
      .groupStudents.filter((gs) => scope.has(gs.group_id))
      .map((gs) => gs.student_id),
  );
  const user = getCurrentUser();
  const academy = collections().academies.find((item: any) => item.id === currentAcademyId()) as any;
  if (user?.role === "TEACHER" && academy?.workspace_type === "TEACHER") {
    for (const student of byAcademy(collections().students)) {
      if (student.owner_teacher_id === currentTeacherId()) ids.add(student.id);
    }
  }
  return ids;
}

/** Restrict an array of groups to the teacher's scope (no-op for non-teachers). */
export function applyTeacherGroupScope<T extends { id: string }>(groups: T[]): T[] {
  const scope = teacherGroupScope();
  if (!scope) return groups;
  return groups.filter((g) => scope.has(g.id));
}

/** Id sets for the current academy (to scope child tables that have no academy_id). */
export function academyGroupIds(): Set<string> {
  return new Set(byAcademy(collections().groups).map((g) => g.id));
}
export function academyStudentIds(): Set<string> {
  return new Set(byAcademy(collections().students).map((s) => s.id));
}
export function academyLessonIds(): Set<string> {
  return new Set(
    collections()
      .lessons.filter((l) => academyGroupIds().has(l.group_id))
      .map((l) => l.id),
  );
}
export function academyExamIds(): Set<string> {
  return new Set(byAcademy(collections().exams).map((e) => e.id));
}

export const ACADEMY_ID = () => currentAcademyId();

export function getCourse(id?: string | null): Course | undefined {
  if (!id) return undefined;
  return collections().courses.find((c) => c.id === id);
}

export function getTeacher(id?: string | null): Teacher | undefined {
  if (!id) return undefined;
  return collections().teachers.find((t) => t.id === id);
}

export function getParent(id?: string | null): Parent | undefined {
  if (!id) return undefined;
  return collections().parents.find((p) => p.id === id);
}

export function getGroup(id?: string | null): Group | undefined {
  if (!id) return undefined;
  return collections().groups.find((g) => g.id === id);
}

export function getExam(id?: string | null): Exam | undefined {
  if (!id) return undefined;
  return collections().exams.find((e) => e.id === id);
}

export function getLesson(id?: string | null): Lesson | undefined {
  if (!id) return undefined;
  return collections().lessons.find((l) => l.id === id);
}

/** Students belonging to a group. */
export function studentsInGroup(groupId: string): Student[] {
  const { groupStudents, students } = collections();
  const ids = groupStudents
    .filter((gs) => gs.group_id === groupId)
    .map((gs) => gs.student_id);
  return students.filter((s) => ids.includes(s.id) && s.is_active !== false);
}

/** Groups a student belongs to (with course attached). */
export function groupsForStudent(studentId: string): (Group & {
  course?: Course;
})[] {
  const { groupStudents, groups } = collections();
  const groupIds = groupStudents
    .filter((gs) => gs.student_id === studentId)
    .map((gs) => gs.group_id);
  return groups
    .filter((g) => groupIds.includes(g.id) && g.is_active !== false)
    .map((g) => ({ ...g, course: getCourse(g.course_id) }));
}

/** Lessons for a group, newest first. */
export function lessonsForGroup(groupId: string): Lesson[] {
  return collections()
    .lessons.filter((l) => l.group_id === groupId && l.is_cancelled !== true && l.status !== "canceled")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** Attendance records for a student. */
export function attendanceForStudent(studentId: string): AttendanceRecord[] {
  return collections().attendance.filter((a) => a.student_id === studentId);
}

/** Attendance records for a lesson. */
export function attendanceForLesson(lessonId: string): AttendanceRecord[] {
  return collections().attendance.filter((a) => a.lesson_id === lessonId);
}

/** Grades for a student (with computed percentage + level). */
export function gradesForStudent(studentId: string): Grade[] {
  return collections()
    .grades.filter((g) => g.student_id === studentId)
    .map((g) => {
      const exam = getExam(g.exam_id);
      const pct = exam ? (g.score / exam.max_score) * 100 : 0;
      return { ...g, percentage: pct, level: performanceLevel(pct), student: undefined };
    });
}

/** Payments for a student. */
export function paymentsForStudent(studentId: string): Payment[] {
  return collections()
    .payments.filter((p) => p.student_id === studentId)
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** Recompute payment derived fields from amounts. */
export function derivePayment(p: Payment): Payment {
  const amount_paid = Math.max(0, p.amount_paid || 0);
  const amount_due = Math.max(0, p.amount_due || 0);
  const remaining = Math.max(0, amount_due - amount_paid);
  let status: Payment["status"] = "UNPAID";
  if (amount_paid >= amount_due && amount_due > 0) status = "PAID";
  else if (amount_paid > 0) status = "PARTIAL";
  return { ...p, amount_paid, amount_due, remaining, status };
}

/** Student full name. */
export function fullName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name}`;
}
