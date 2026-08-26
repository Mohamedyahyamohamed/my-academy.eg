/**
 * Grades & Exams service.
 * Enforces: 0 <= score <= max_score.
 */
import type { AssessmentType, Exam, Grade, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId, getCurrentUser } from "./session";
import { persistInsert, persistDelete, persistUpdate } from "./data/store";
import { getCourse, getGroup, byAcademy, academyExamIds, teacherGroupScope, fetchTableRLS, fetchGroupStudentIds, withReadTimeout } from "./_shared";
import { resolveTeacherForGroups } from "./groups";
import { performanceLevel } from "@/lib/constants";
import { can, hasAcademyWideScope } from "@/lib/permissions";
import { isSupabaseConfigured } from "./supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

function attachExam(
  e: Exam,
  courses: any[] = collections().courses,
  groups: any[] = collections().groups,
): Exam {
  return {
    ...e,
    type: e.type ?? "exam",
    course: courses.find((course) => course.id === e.course_id) ?? getCourse(e.course_id),
    group: groups.find((group) => group.id === e.group_id) ?? getGroup(e.group_id),
  };
}

export async function listExams(academyId?: string, teacherProfileId?: string): Promise<Exam[]> {
  const teacher = teacherProfileId
    ? await resolveTeacherForGroups(academyId, teacherProfileId, getCurrentUser()?.email)
    : null;
  let scopedGroups = academyId ? await fetchTableRLS<any>("groups", academyId) : collections().groups;
  let scopedCourses = academyId ? await fetchTableRLS<any>("courses", academyId) : collections().courses;
  let scopedAssistants = teacher && academyId ? await fetchTableRLS<any>("group_assistants", academyId) : [];
  let liveExams: Exam[] | null = null;
  if (academyId && isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const [{ data: groups }, { data: courses }, { data: assistants }, { data: exams }] = await withReadTimeout(Promise.all([
        admin.from("groups").select("*").eq("academy_id", academyId).limit(1000),
        admin.from("courses").select("*").eq("academy_id", academyId).limit(1000),
        admin.from("group_assistants").select("group_id, teacher_id").limit(2000),
        admin.from("exams").select("*").eq("academy_id", academyId).limit(1000),
      ])) ?? [{ data: null }, { data: null }, { data: null }, { data: null }];
      if (groups?.length) scopedGroups = groups;
      if (courses?.length) scopedCourses = courses;
      if (teacher && assistants?.length) scopedAssistants = assistants;
      if (exams?.length) liveExams = exams as Exam[];
    }
  }
  const tScope = teacher
    ? new Set([
        ...scopedGroups.filter((g: any) => g.academy_id === academyId && g.teacher_id === teacher.id).map((g: any) => g.id),
        ...scopedAssistants.filter((ga: any) => ga.teacher_id === teacher.id).map((ga: any) => ga.group_id),
        ...collections().groupAssistants.filter((ga) => ga.teacher_id === teacher.id).map((ga) => ga.group_id),
      ])
    : teacherProfileId
      ? new Set<string>()
      : teacherGroupScope();
  const items = liveExams ?? await fetchTableRLS<Exam>("exams", academyId);
  return items
    .filter((e) => !tScope || tScope.has(e.group_id))
    .slice()
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .map((exam) => attachExam(exam, scopedCourses, scopedGroups));
}

export async function getExam(id: string, academyIdOverride?: string): Promise<Exam | null> {
  const academyId = academyIdOverride ?? currentAcademyId();
  let items = await fetchTableRLS<Exam>("exams", academyId);
  let scopedCourses = academyId ? await fetchTableRLS<any>("courses", academyId) : collections().courses;
  let scopedGroups = academyId ? await fetchTableRLS<any>("groups", academyId) : collections().groups;
  if (academyId && isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const [examRes, coursesRes, groupsRes] = await withReadTimeout(Promise.all([
        admin.from("exams").select("*").eq("academy_id", academyId).eq("id", id).maybeSingle(),
        admin.from("courses").select("*").eq("academy_id", academyId).limit(1000),
        admin.from("groups").select("*").eq("academy_id", academyId).limit(1000),
      ])) ?? [{ data: null }, { data: null }, { data: null }];
      const { data: liveExam } = examRes;
      const { data: liveCourses } = coursesRes;
      const { data: liveGroups } = groupsRes;
      if (liveExam) items = [liveExam as Exam];
      if (liveCourses?.length) scopedCourses = liveCourses;
      if (liveGroups?.length) scopedGroups = liveGroups;
    }
  }
  let e = items.find((x) => x.id === id && (!academyId || x.academy_id === academyId));
  if (!e) return null;
  const user = getCurrentUser();
  if (user && !hasAcademyWideScope(user.role)) {
    const visible = await listExams(academyId, user.id);
    if (!visible.some((item) => item.id === e!.id)) return null;
  }
  return attachExam(e, scopedCourses, scopedGroups);
}

export interface ExamInput {
  name: string;
  type?: AssessmentType;
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
  let group = collections().groups.find((item) => item.id === input.group_id && item.academy_id === academyId);
  let course = collections().courses.find((item) => item.id === input.course_id && item.academy_id === academyId);
  if ((!group || !course) && academyId && isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const [{ data: liveGroup }, { data: liveCourse }] = await Promise.all([
        admin.from("groups").select("*").eq("id", input.group_id).eq("academy_id", academyId).maybeSingle(),
        admin.from("courses").select("*").eq("id", input.course_id).eq("academy_id", academyId).maybeSingle(),
      ]);
      group = (liveGroup as any) ?? group;
      course = (liveCourse as any) ?? course;
    }
  }
  if (!group) throw new Error("Exam group is outside the authenticated academy.");
  if (!hasAcademyWideScope(user.role)) {
    const visible = await listExams(academyId ?? undefined, user.id);
    if (!visible.some((exam) => exam.group_id === group!.id)) {
      const teacher = await resolveTeacherForGroups(academyId ?? undefined, user.id, user.email);
      const assigned = Boolean(teacher && group.teacher_id === teacher.id);
      if (!assigned) throw new Error("You can only create exams for an assigned group.");
    }
  }
  if (!course || course.id !== group.course_id) throw new Error("Exam course must belong to the selected group.");
  const now = new Date().toISOString();
  const e: Exam = {
    id: eid(),
    academy_id: academyId,
    name: input.name,
    type: input.type ?? "exam",
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

export async function listGrades(
  filters: GradeFilters = {},
  academyId?: string,
  teacherProfileId?: string,
): Promise<PaginatedResult<Grade>> {
  const { examId = "ALL", studentId = "ALL", groupId = "ALL", page = 1, pageSize = 12 } = filters;
  let scopedExams = await fetchTableRLS<Exam>("exams", academyId);
  let scopedGrades = await fetchTableRLS<Grade>("grades", academyId);
  if (academyId && isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const [liveExamsRes, liveGradesRes] = await withReadTimeout(Promise.all([
        admin.from("exams").select("*").eq("academy_id", academyId).limit(1000),
        admin.from("grades").select("*").limit(5000),
      ])) ?? [{ data: null, error: null }, { data: null, error: null }];
      const { data: liveExams, error: examsError } = liveExamsRes;
      const { data: liveGrades, error: gradesError } = liveGradesRes;
      if (!examsError && liveExams?.length) scopedExams = liveExams as Exam[];
      if (!gradesError && liveGrades?.length) scopedGrades = liveGrades as Grade[];
    }
  }
  const visibleExams = teacherProfileId
    ? await listExams(academyId, teacherProfileId)
    : scopedExams;
  const teacherScope = teacherProfileId ? null : teacherGroupScope();
  const examIds = new Set(
    visibleExams
      .filter((e) => (!academyId || e.academy_id === academyId) && (!teacherScope || teacherScope.has(e.group_id)))
      .map((e) => e.id),
  );
  let items = scopedGrades.filter((g) => examIds.has(g.exam_id));

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
  academyIdOverride?: string,
  knownExam?: Exam | null,
): Promise<{ studentId: string; score: number | null; notes: string | null; gradeId: string | null }[]> {
  const exam = knownExam ?? (await getExam(examId, academyIdOverride));
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
      notes: existing?.notes ?? null,
      gradeId: existing?.id ?? null,
    };
  });
}

/** Upsert grades for an exam in bulk. Validates score bounds and roster scope. */
export async function saveGrades(
  examId: string,
  entries: { studentId: string; score: number; notes?: string | null }[],
): Promise<{ ok: boolean; error?: string }> {
  const user = getCurrentUser();
  if (!user || !can(user, "grades.record")) return { ok: false, error: "You are not allowed to save grades." };
  const academyId = currentAcademyId();
  let exam = collections().exams.find((e) => e.id === examId && e.academy_id === academyId);
  if (!exam && academyId && isSupabaseConfigured()) {
    exam = (await getExam(examId, academyId)) ?? undefined;
  }
  if (!exam) return { ok: false, error: "Exam not found." };
  if (!hasAcademyWideScope(user.role)) {
    const visible = await listExams(academyId ?? undefined, user.id);
    if (!visible.some((visibleExam) => visibleExam.id === exam!.id)) {
      return { ok: false, error: "You can only save grades for an assigned group." };
    }
  }
  const rosterIds = collections().groupStudents
    .filter((gs) => gs.group_id === exam.group_id)
    .map((gs) => gs.student_id);
  const resolvedRosterIds = rosterIds.length || !academyId
    ? rosterIds
    : await fetchGroupStudentIds(exam.group_id, academyId);
  const roster = new Set(resolvedRosterIds);
  if (new Set(entries.map((entry) => entry.studentId)).size !== entries.length) {
    return { ok: false, error: "Duplicate student grade entries are not allowed." };
  }
  for (const e of entries) {
    if (!roster.has(e.studentId)) return { ok: false, error: "Every grade must belong to the exam group roster." };
    let student = collections().students.find((s) => s.id === e.studentId && s.academy_id === exam.academy_id);
    if (!student && academyId && isSupabaseConfigured()) {
      const admin = nodeSupabaseClient();
      if (admin) {
        const { data } = await admin.from("students").select("id, academy_id").eq("id", e.studentId).eq("academy_id", exam.academy_id).maybeSingle();
        student = data as any;
      }
    }
    if (!student) return { ok: false, error: "Student is outside the authenticated academy." };
    if (!Number.isFinite(e.score) || e.score < 0) return { ok: false, error: "Scores cannot be negative." };
    if (e.score > exam.max_score) return { ok: false, error: `Score exceeds maximum (${exam.max_score}).` };
    if (e.notes != null && e.notes.length > 500) return { ok: false, error: "Grade notes must be 500 characters or fewer." };
  }
  const payload = entries.map((e) => ({
    student_id: e.studentId,
    score: e.score,
    notes: e.notes?.trim() || null,
  }));

  if (academyId && isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      const { error } = await admin.rpc("save_exam_grades", {
        p_exam_id: examId,
        p_academy_id: academyId,
        p_entries: payload,
      });
      if (error) return { ok: false, error: "Could not save grades. Please check the assessment and student list." };
      for (const e of entries) {
        const existing = collections().grades.find((g) => g.exam_id === examId && g.student_id === e.studentId);
        if (existing) {
          existing.score = e.score;
          existing.notes = e.notes?.trim() || null;
        } else {
          collections().grades.push({
            id: crypto.randomUUID(), exam_id: examId, student_id: e.studentId,
            score: e.score, notes: e.notes?.trim() || null, created_at: new Date().toISOString(),
          });
        }
      }
      return { ok: true };
    }
  }

  // Local/demo fallback retains the same all-or-nothing validation above.
  const now = new Date().toISOString();
  for (const e of entries) {
    const existing = collections().grades.find((g) => g.exam_id === examId && g.student_id === e.studentId);
    if (existing) {
      existing.score = e.score;
      existing.notes = e.notes?.trim() || null;
      await persistUpdate("grades", existing.id, { score: e.score, notes: existing.notes });
    } else {
      const grade = { id: crypto.randomUUID(), exam_id: examId, student_id: e.studentId, score: e.score, notes: e.notes?.trim() || null, created_at: now };
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
