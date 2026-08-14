/**
 * Shared helpers for the local data layer.
 * (Server-only. The Supabase adapter replaces these in production.)
 */
import { collections } from "./data/store";
import { currentAcademyId, currentTeacherId } from "./session";
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
 * Fetch ALL rows from a table via the user's Supabase session.
 * RLS policies automatically filter by academy_id — NO app-layer filter needed.
 * Falls back to the in-memory cache when Supabase isn't configured.
 */
export async function fetchTableRLS<T = any>(table: string, academyId?: string): Promise<T[]> {
  if (!isSupabaseConfigured()) {
    // Fallback: use cache (demo mode or Supabase not configured).
    const cacheData = (collections() as any)[table] ?? [];
    return byAcademy(cacheData, academyId) as T[];
  }
  try {
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    const client = await createServerSupabaseClient();
    const { data, error } = await client.from(table).select("*");
    if (error || !data) {
      // Fallback on error.
      const cacheData = (collections() as any)[table] ?? [];
      return byAcademy(cacheData, academyId) as T[];
    }
    return data as T[];
  } catch {
    const cacheData = (collections() as any)[table] ?? [];
    return byAcademy(cacheData, academyId) as T[];
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

/** Student ids enrolled in the teacher's scoped groups (null if not a teacher). */
export function teacherStudentScope(): Set<string> | null {
  const scope = teacherGroupScope();
  if (!scope) return null;
  return new Set(
    collections()
      .groupStudents.filter((gs) => scope.has(gs.group_id))
      .map((gs) => gs.student_id),
  );
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
  return students.filter((s) => ids.includes(s.id));
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
    .filter((g) => groupIds.includes(g.id))
    .map((g) => ({ ...g, course: getCourse(g.course_id) }));
}

/** Lessons for a group, newest first. */
export function lessonsForGroup(groupId: string): Lesson[] {
  return collections()
    .lessons.filter((l) => l.group_id === groupId)
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
