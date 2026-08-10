/**
 * Lessons service.
 */
import type { Lesson, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import { getGroup, getTeacher, byAcademy, teacherGroupScope, fetchTableRLS } from "./_shared";

function attach(l: Lesson): Lesson {
  const attendance_taken = collections().attendance.some(
    (a) => a.lesson_id === l.id,
  );
  return {
    ...l,
    group: getGroup(l.group_id),
    teacher: getTeacher(l.teacher_id),
    attendance_taken,
  };
}

export interface LessonFilters {
  search?: string;
  groupId?: string | "ALL";
  upcoming?: boolean;
  past?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listLessons(
  filters: LessonFilters = {},
): Promise<PaginatedResult<Lesson>> {
  const {
    search = "",
    groupId = "ALL",
    upcoming,
    past,
    page = 1,
    pageSize = 12,
  } = filters;
  const now = Date.now();
  let items = await fetchTableRLS<Lesson>("lessons");
  // Teachers only see lessons in their groups.
  const tScope = teacherGroupScope();
  if (tScope) items = items.filter((l) => tScope.has(l.group_id));
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter(
      (l) =>
        l.topic.toLowerCase().includes(q) ||
        getGroup(l.group_id)?.name.toLowerCase().includes(q),
    );
  }
  if (groupId !== "ALL") items = items.filter((l) => l.group_id === groupId);
  if (upcoming) items = items.filter((l) => +new Date(l.date) >= now);
  if (past) items = items.filter((l) => +new Date(l.date) < now);
  items.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize).map(attach),
    pagination: { page, pageSize, total, totalPages },
  };
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const items = await fetchTableRLS<Lesson>("lessons");
  const l = items.find((x) => x.id === id);
  return l ? attach(l) : null;
}

export async function getUpcomingLessons(limit = 5): Promise<Lesson[]> {
  const result = await listLessons({ upcoming: true, pageSize: limit });
  return result.items
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, limit);
}

export interface LessonInput {
  group_id: string;
  teacher_id: string;
  date: string;
  start_time: string;
  end_time: string;
  topic: string;
  description?: string | null;
  notes?: string | null;
}

function lid() {
  return crypto.randomUUID();
}

export async function createLesson(input: LessonInput): Promise<Lesson> {
  const now = new Date().toISOString();
  const l: Lesson = {
    id: lid(),
    academy_id: currentAcademyId(),
    group_id: input.group_id,
    teacher_id: input.teacher_id,
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    topic: input.topic,
    description: input.description ?? null,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
  collections().lessons.push(l);
  await persistInsert("lessons", l);
  return attach(l);
}

export function updateLesson(
  id: string,
  input: Partial<LessonInput>,
): Lesson | null {
  const l = collections().lessons.find((x) => x.id === id);
  if (!l) return null;
  Object.assign(l, { ...input, updated_at: new Date().toISOString() });
  void persistUpdate("lessons", id, { ...input, updated_at: new Date().toISOString() });
  return attach(l);
}

export function deleteLesson(id: string): boolean {
  const before = collections().lessons.length;
  collections().lessons = collections().lessons.filter((l) => l.id !== id);
  collections().attendance = collections().attendance.filter(
    (a) => a.lesson_id !== id,
  );
  void persistDelete("lessons", { id });
  void persistDelete("attendance", { lesson_id: id });
  return collections().lessons.length < before;
}
