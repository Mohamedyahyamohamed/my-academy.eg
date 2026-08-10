/**
 * Homework service.
 */
import type {
  Homework,
  HomeworkSubmission,
  HomeworkStatus,
  PaginatedResult,
} from "@/types";
import { collections } from "./data/store";
import { persistInsert, persistUpdate } from "./data/store";
import { getGroup, getLesson, studentsInGroup, byAcademy, teacherGroupScope, fetchTableRLS } from "./_shared";
import { fullName } from "./_shared";
import { currentAcademyId } from "./session";

function attachHw(h: Homework): Homework {
  return { ...h, group: getGroup(h.group_id), lesson: getLesson(h.lesson_id) };
}

export interface HomeworkFilters {
  search?: string;
  groupId?: string | "ALL";
  status?: HomeworkStatus | "ALL";
  studentId?: string; // student scope
  page?: number;
  pageSize?: number;
}

export async function listHomework(
  filters: HomeworkFilters = {},
): Promise<PaginatedResult<Homework>> {
  const { search = "", groupId = "ALL", page = 1, pageSize = 12 } = filters;
  let items = await fetchTableRLS<Homework>("homework");
  const tScope = teacherGroupScope();
  if (tScope) items = items.filter((h) => tScope.has(h.group_id));
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q),
    );
  }
  if (groupId !== "ALL") items = items.filter((h) => h.group_id === groupId);
  items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map(attachHw),
    pagination: { page, pageSize, total, totalPages },
  };
}

export async function getHomework(id: string): Promise<Homework | null> {
  const items = await fetchTableRLS<Homework>("homework");
  const h = items.find((x) => x.id === id);
  if (!h) return null;
  const tScope = teacherGroupScope();
  if (tScope && !tScope.has(h.group_id)) return null;
  return attachHw(h);
}

export interface HomeworkInput {
  title: string;
  description: string;
  group_id: string;
  lesson_id?: string | null;
  deadline: string;
  attachment_url?: string | null;
}

function hid() {
  return crypto.randomUUID();
}

export async function createHomework(input: HomeworkInput): Promise<Homework> {
  const now = new Date().toISOString();
  const h: Homework = {
    id: hid(),
    academy_id: currentAcademyId(),
    group_id: input.group_id,
    lesson_id: input.lesson_id ?? null,
    title: input.title,
    description: input.description,
    deadline: input.deadline,
    attachment_url: input.attachment_url ?? null,
    created_at: now,
  };
  collections().homework.push(h);
  // Await homework before submissions (FK ordering).
  await persistInsert("homework", h);
  // Auto-create pending submissions for each group member
  const roster = studentsInGroup(input.group_id);
  for (const s of roster) {
    const sub = {
      id: crypto.randomUUID(),
      homework_id: h.id,
      student_id: s.id,
      content: null,
      file_url: null,
      status: "PENDING" as const,
      submitted_at: null,
      reviewed_at: null,
      feedback: null,
      grade: null,
    };
    collections().submissions.push(sub);
    void persistInsert("homework_submissions", sub);
  }
  return attachHw(h);
}

export function deleteHomework(id: string): boolean {
  const before = collections().homework.length;
  collections().homework = collections().homework.filter((h) => h.id !== id);
  collections().submissions = collections().submissions.filter(
    (s) => s.homework_id !== id,
  );
  return collections().homework.length < before;
}

/* ---------------- Submissions ---------------- */

export function getSubmission(
  homeworkId: string,
  studentId: string,
): HomeworkSubmission | null {
  const s = collections().submissions.find(
    (x) => x.homework_id === homeworkId && x.student_id === studentId,
  );
  return s ? { ...s, student: collections().students.find((st) => st.id === studentId) } : null;
}

export async function listSubmissions(
  homeworkId: string,
): Promise<HomeworkSubmission[]> {
  return collections()
    .submissions.filter((s) => s.homework_id === homeworkId)
    .map((s) => ({
      ...s,
      student: collections().students.find((st) => st.id === s.student_id),
    }))
    .sort((a, b) => fullName(a.student!).localeCompare(fullName(b.student!)));
}

export function submitHomework(
  homeworkId: string,
  studentId: string,
  content: string,
  fileUrl?: string,
): HomeworkSubmission | null {
  let s = collections().submissions.find(
    (x) => x.homework_id === homeworkId && x.student_id === studentId,
  );
  const now = new Date().toISOString();
  if (s) {
    s.content = content;
    s.file_url = fileUrl ?? s.file_url;
    s.status = "SUBMITTED";
    s.submitted_at = now;
    void persistUpdate("homework_submissions", s.id, {
      content, file_url: s.file_url, status: "SUBMITTED", submitted_at: now,
    });
  } else {
    s = {
      id: crypto.randomUUID(),
      homework_id: homeworkId,
      student_id: studentId,
      content,
      file_url: fileUrl ?? null,
      status: "SUBMITTED",
      submitted_at: now,
      reviewed_at: null,
      feedback: null,
      grade: null,
    };
    collections().submissions.push(s);
    void persistInsert("homework_submissions", s);
  }
  return s;
}

export function reviewSubmission(
  submissionId: string,
  feedback: string,
  grade?: number,
): HomeworkSubmission | null {
  const s = collections().submissions.find((x) => x.id === submissionId);
  if (!s) return null;
  s.feedback = feedback;
  s.grade = grade ?? s.grade;
  s.status = "REVIEWED";
  s.reviewed_at = new Date().toISOString();
  void persistUpdate("homework_submissions", s.id, {
    feedback, grade: s.grade, status: "REVIEWED", reviewed_at: s.reviewed_at,
  });
  return s;
}

/** Homework assigned to a student (via their groups). */
export async function homeworkForStudent(studentId: string): Promise<HomeworkSubmission[]> {
  const [homework, submissions] = await Promise.all([
    fetchTableRLS<Homework>("homework"),
    fetchTableRLS<any>("homework_submissions"),
  ]);
  const groupIds = collections()
    .groupStudents.filter((gs) => gs.student_id === studentId)
    .map((gs) => gs.group_id);
  const hwIds = homework.filter((h) => groupIds.includes(h.group_id)).map((h) => h.id);
  return submissions
    .filter((s: any) => hwIds.includes(s.homework_id) && s.student_id === studentId)
    .map((s: any) => ({
      ...s,
      homework: homework.find((h) => h.id === s.homework_id),
    }))
    .sort((a: any, b: any) => +new Date(b.homework?.created_at ?? 0) - +new Date(a.homework?.created_at ?? 0));
}
