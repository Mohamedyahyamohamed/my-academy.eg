/**
 * Grades & Exams service.
 * Enforces: 0 <= score <= max_score.
 */
import type { Exam, Grade, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId, getCurrentUser } from "./session";
import { persistInsert, persistDelete } from "./data/store";
import { getCourse, getGroup, byAcademy, academyExamIds, teacherGroupScope, fetchTableRLS } from "./_shared";
import { performanceLevel } from "@/lib/constants";

function attachExam(e: Exam): Exam {
  return { ...e, course: getCourse(e.course_id), group: getGroup(e.group_id) };
}

export async function listExams(academyId?: string, teacherProfileId?: string): Promise<Exam[]> {
  const teacher = teacherProfileId
    ? collections().teachers.find(
        (t) => t.academy_id === academyId && (t.profile_id === teacherProfileId || t.email.toLowerCase() === getCurrentUser()?.email?.toLowerCase()),
      )
    : null;
  const tScope = teacher
    ? new Set([
        ...collections().groups.filter((g) => g.academy_id === academyId && g.teacher_id === teacher.id).map((g) => g.id),
        ...collections().groupAssistants
          .filter((ga) => ga.teacher_id === teacher.id && collections().groups.some((g) => g.academy_id === academyId && g.id === ga.group_id))
          .map((ga) => ga.group_id),
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
  const items = await fetchTableRLS<Exam>("exams");
  const e = items.find((x) => x.id === id);
  if (!e) return null;
  const tScope = teacherGroupScope();
  if (tScope && !tScope.has(e.group_id)) return null;
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
  const now = new Date().toISOString();
  const e: Exam = {
    id: eid(),
    academy_id: currentAcademyId(),
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

export function deleteExam(id: string): boolean {
  const before = collections().exams.length;
  collections().exams = collections().exams.filter((e) => e.id !== id);
  collections().grades = collections().grades.filter((g) => g.exam_id !== id);
  return collections().exams.length < before;
}

/* ---------------- Grades ---------------- */

function attachGrade(g: Grade): Grade {
  const exam = collections().exams.find((e) => e.id === g.exam_id);
  const pct = exam ? (g.score / exam.max_score) * 100 : 0;
  return {
    ...g,
    percentage: pct,
    level: performanceLevel(pct),
    student: collections().students.find((s) => s.id === g.student_id),
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
  const examIds = new Set(collections().exams.filter((e) => !academyId || e.academy_id === academyId).map((e) => e.id));
  let items = (await fetchTableRLS<Grade>("grades", academyId)).filter((g) => examIds.has(g.exam_id));

  if (examId !== "ALL") items = items.filter((g) => g.exam_id === examId);
  if (studentId !== "ALL")
    items = items.filter((g) => g.student_id === studentId);
  if (groupId !== "ALL") {
    const examIds = collections()
      .exams.filter((e) => e.group_id === groupId)
      .map((e) => e.id);
    items = items.filter((g) => examIds.includes(g.exam_id));
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map(attachGrade),
    pagination: { page, pageSize, total, totalPages },
  };
}

/** Grades for an exam, keyed by student (for the grade-entry table). */
export function gradesForExam(
  examId: string,
): { studentId: string; score: number | null; gradeId: string | null }[] {
  const exam = collections().exams.find((e) => e.id === examId);
  if (!exam) return [];
  const roster = collections()
    .groupStudents.filter((gs) => gs.group_id === exam.group_id)
    .map((gs) => gs.student_id);
  return roster.map((studentId) => {
    const existing = collections().grades.find(
      (g) => g.exam_id === examId && g.student_id === studentId,
    );
    return {
      studentId,
      score: existing?.score ?? null,
      gradeId: existing?.id ?? null,
    };
  });
}

/** Upsert grades for an exam in bulk. Validates score bounds. */
export function saveGrades(
  examId: string,
  entries: { studentId: string; score: number }[],
): { ok: boolean; error?: string } {
  const exam = collections().exams.find((e) => e.id === examId);
  if (!exam) return { ok: false, error: "Exam not found." };
  for (const e of entries) {
    if (e.score < 0) return { ok: false, error: "Scores cannot be negative." };
    if (e.score > exam.max_score)
      return { ok: false, error: `Score exceeds maximum (${exam.max_score}).` };
  }
  const now = new Date().toISOString();
  for (const e of entries) {
    const existing = collections().grades.find(
      (g) => g.exam_id === examId && g.student_id === e.studentId,
    );
    if (existing) {
      existing.score = e.score;
    } else {
      const grade = {
        id: crypto.randomUUID(),
        exam_id: examId,
        student_id: e.studentId,
        score: e.score,
        created_at: now,
      };
      collections().grades.push(grade);
      void persistInsert("grades", grade);
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
