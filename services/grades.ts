/**
 * Grades & Exams service.
 * Enforces: 0 <= score <= max_score.
 */
import type { Exam, Grade, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId, getCurrentUser } from "./session";
import { persistInsert, persistDelete, persistUpdate } from "./data/store";
import { getCourse, getGroup, byAcademy, academyExamIds, teacherGroupScope, fetchTableRLS, fetchGroupStudentIds } from "./_shared";
import { resolveTeacherForGroups } from "./groups";
import { performanceLevel } from "@/lib/constants";
import { can, hasAcademyWideScope } from "@/lib/permissions";

function attachExam(e: Exam): Exam {
  return { ...e, course: getCourse(e.course_id), group: getGroup(e.group_id) };
}

export async function listExams(academyId?: string, teacherProfileId?: string): Promise<Exam[]> {
  const teacher = teacherProfileId
    ? await resolveTeacherForGroups(academyId, teacherProfileId, getCurrentUser()?.email)
    : null;
  const scopedGroups = academyId ? await fetchTableRLS<any>("groups", academyId) : collections().groups;
  const scopedAssistants = teacher && academyId ? await fetchTableRLS<any>("group_assistants", academyId) : [];
  const tScope = teacher
    ? new Set([
        ...scopedGroups.filter((g: any) => g.academy_id === academyId && g.teacher_id === teacher.id).map((g: any) => g.id),
        ...scopedAssistants.filter((ga: any) => ga.teacher_id === teacher.id).map((ga: any) => ga.group_id),
        ...collections().groupAssistants.filter((ga) => ga.teacher_id === teacher.id).map((ga) => ga.group_id),
      ])
    : teacherProfileId
      ? new Set<string>()
      : teacherGroupScope();
  const items = await fetchTableRLS<Exam>("exams", academyId);
  return items
    .filter((e) => !tScope || tScope.has(e.group_id))
    .slice()
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map(attachExam);
}

export async function getExam(id: string): Promise<Exam | null> {
  const academyId = currentAcademyId();
  const items = await fetchTableRLS<Exam>("exams", academyId);
  let e = items.find((x) => x.id === id && (!academyId || x.academy_id === academyId));
  if (!e && academyId) {
    const liveItems = await fetchTableRLS<Exam>("exams", academyId);
    e = liveItems.find((x) => x.id === id && x.academy_id === academyId);
  }
  if (!e) return null;
  const user = getCurrentUser();
  if (user && !hasAcademyWideScope(user.role)) {
    const visible = await listExams(academyId, user.id);
    if (!visible.some((item) => item.id === e!.id)) return null;
  }
  return attachExam(e);
}

export interface ExamInput {
  name: string;
  course_id: string;
  group_id: string;
  date: string;
  max_score: number;
}

function eid() {
  return crypto.randomUUID();
}

export async function createExam(input: ExamInput): Promise<Exam> {
  const user = getCurrentUser();
  if (!user || !can(user, "grades.record")) throw new Error("You are not allowed to create exams.");
  const academyId = currentAcademyId();
  const group = collections().groups.find((item) => item.id === input.group_id && item.academy_id === academyId);
  if (!group) throw new Error("Exam group is outside the authenticated academy.");
  if (!hasAcademyWideScope(user.role) && !teacherGroupScope()?.has(group.id)) {
    throw new Error("You can only create exams for an assigned group.");
  }
  const course = collections().courses.find((item) => item.id === input.course_id && item.academy_id === academyId);
  if (!course || course.id !== group.course_id) throw new Error("Exam course must belong to the selected group.");
  const now = new Date().toISOString();
  const e: Exam = {
    id: eid(),
    academy_id: academyId,
    name: input.name,
    course_id: input.course_id,
    group_id: input.group_id,
    date: input.date,
    max_score: Math.max(1, input.max_score),
    created_at: now,
    updated_at: now,
  };
  collections().exams.push(e);
  await persistInsert("exams", e);
  return attachExam(e);
}

export async function deleteExam(id: string): Promise<boolean> {
  const user = getCurrentUser();
  if (!user || !can(user, "grades.record")) throw new Error("You are not allowed to delete exams.");
  const exam = collections().exams.find((item) => item.id === id && item.academy_id === currentAcademyId());
  if (!exam) return false;
  if (!hasAcademyWideScope(user.role) && !teacherGroupScope()?.has(exam.group_id)) {
    throw new Error("You can only delete exams for an assigned group.");
  }
  const before = collections().exams.length;
  collections().exams = collections().exams.filter((e) => e.id !== id);
  collections().grades = collections().grades.filter((g) => g.exam_id !== id);
  await persistDelete("grades", { exam_id: id });
  await persistDelete("exams", { id });
  return collections().exams.length < before;
}

/* ---------------- Grades ---------------- */

function attachGrade(g: Grade, exams: Exam[] = collections().exams, students = collections().students): Grade {
  const exam = exams.find((e) => e.id === g.exam_id);
  const pct = exam ? (g.score / exam.max_score) * 100 : 0;
  return {
    ...g,
    percentage: pct,
    level: performanceLevel(pct),
    student: students.find((s) => s.id === g.student_id),
  };
}

export interface GradeFilters {
  examId?: string | "ALL";
  studentId?: string | "ALL";
  groupId?: string | "ALL";
  page?: number;
  pageSize?: number;
}

export async function listGrades(filters: GradeFilters = {}, academyId?: string): Promise<PaginatedResult<Grade>> {
  const { examId = "ALL", studentId = "ALL", groupId = "ALL", page = 1, pageSize = 12 } = filters;
  const scopedExams = await fetchTableRLS<Exam>("exams", academyId);
  const teacherScope = teacherGroupScope();
  const examIds = new Set(
    scopedExams
      .filter((e) => (!academyId || e.academy_id === academyId) && (!teacherScope || teacherScope.has(e.group_id)))
      .map((e) => e.id),
  );
  let items = (await fetchTableRLS<Grade>("grades", academyId)).filter((g) => examIds.has(g.exam_id));

  if (examId !== "ALL") items = items.filter((g) => g.exam_id === examId);
  if (studentId !== "ALL")
    items = items.filter((g) => g.student_id === studentId);
  if (groupId !== "ALL") {
    const examIds = scopedExams
      .filter((e) => e.group_id === groupId)
      .map((e) => e.id);
    items = items.filter((g) => examIds.includes(g.exam_id));
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map((grade) => attachGrade(grade, scopedExams)),
    pagination: { page, pageSize, total, totalPages },
  };
}

/** Grades for an exam, keyed by student (for the grade-entry table). */
export async function gradesForExam(
  examId: string,
): Promise<{ studentId: string; score: number | null; gradeId: string | null }[]> {
  const exam = await getExam(examId);
  if (!exam) return [];
  const [roster, grades] = await Promise.all([
    fetchGroupStudentIds(exam.group_id),
    fetchTableRLS<Grade>("grades", exam.academy_id),
  ]);
  return roster.map((studentId) => {
    const existing = grades.find((g) => g.exam_id === examId && g.student_id === studentId);
    return {
      studentId,
      score: existing?.score ?? null,
      gradeId: existing?.id ?? null,
    };
  });
}

/** Upsert grades for an exam in bulk. Validates score bounds and roster scope. */
export async function saveGrades(
  examId: string,
  entries: { studentId: string; score: number }[],
): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser();
  if (!user || !can(user, "grades.record")) return { ok: false, error: "You are not allowed to save grades." };
  const exam = collections().exams.find((e) => e.id === examId && e.academy_id === currentAcademyId());
  if (!exam) return { ok: false, error: "Exam not found." };
  if (!hasAcademyWideScope(user.role) && !teacherGroupScope()?.has(exam.group_id)) {
    return { ok: false, error: "You can only save grades for an assigned group." };
  }
  const roster = new Set(
    collections().groupStudents
      .filter((gs) => gs.group_id === exam.group_id)
      .map((gs) => gs.student_id),
  );
  if (new Set(entries.map((entry) => entry.studentId)).size !== entries.length) {
    return { ok: false, error: "Duplicate student grade entries are not allowed." };
  }
  for (const e of entries) {
    if (!roster.has(e.studentId)) return { ok: false, error: "Every grade must belong to the exam group roster." };
    const student = collections().students.find((s) => s.id === e.studentId && s.academy_id === exam.academy_id);
    if (!student) return { ok: false, error: "Student is outside the authenticated academy." };
    if (!Number.isFinite(e.score) || e.score < 0) return { ok: false, error: "Scores cannot be negative." };
    if (e.score > exam.max_score) return { ok: false, error: `Score exceeds maximum (${exam.max_score}).` };
  }
  const now = new Date().toISOString();
  for (const e of entries) {
    const existing = collections().grades.find((g) => g.exam_id === examId && g.student_id === e.studentId);
    if (existing) {
      existing.score = e.score;
      await persistUpdate("grades", existing.id, { score: e.score });
    } else {
      const grade = { id: crypto.randomUUID(), exam_id: examId, student_id: e.studentId, score: e.score, created_at: now };
      collections().grades.push(grade);
      await persistInsert("grades", grade);
    }
  }
  return { ok: true };
}

/** Class average for an exam. */
export function examAverage(examId: string): number {
  const exam = collections().exams.find((e) => e.id === examId);
  const grades = collections().grades.filter((g) => g.exam_id === examId);
  if (!exam || !grades.length) return 0;
  const sum = grades.reduce((s, g) => s + (g.score / exam.max_score) * 100, 0);
  return Math.round(sum / grades.length);
}
