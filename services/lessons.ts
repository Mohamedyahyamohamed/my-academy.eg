/**
 * Lessons service.
 */
import type { Lesson, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId, currentTeacherId, getCurrentUser } from "./session";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import { getGroup, getTeacher, byAcademy, teacherGroupScope, fetchTableRLS } from "./_shared";
import { parseSchedule } from "@/lib/utils";

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
  academyId?: string,
  teacherProfileId?: string,
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
  let items = await fetchTableRLS<Lesson>("lessons", academyId);
  // Teachers only see lessons in their groups.
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

export async function getLesson(id: string, academyId?: string): Promise<Lesson | null> {
  const items = await fetchTableRLS<Lesson>("lessons", academyId);
  const l = items.find((x) => x.id === id);
  return l ? attach(l) : null;
}

function wallClockMinute(date: Date, timeZone = process.env.ACADEMY_TIMEZONE || "Africa/Cairo") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (((value("year") * 12 + value("month")) * 31 + value("day")) * 24 + value("hour")) * 60 + value("minute");
}

function lessonWallClockMinute(date: string, time: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return (((year * 12 + month) * 31 + day) * 24 + hour) * 60 + minute;
}

/** Return the single lesson currently in progress for the authenticated teacher. */
export function getActiveLessonForTeacher(now = new Date()): Lesson | null {
  const academyId = currentAcademyId();
  const teacherId = currentTeacherId();
  const scope = teacherId ? teacherGroupScope() : null;
  if (!teacherId || !scope?.size) return null;
  const current = wallClockMinute(now);
  const active = collections().lessons
    .filter((lesson) => lesson.academy_id === academyId && scope.has(lesson.group_id))
    .filter((lesson) => {
      const start = lessonWallClockMinute(lesson.date, lesson.start_time);
      const end = lessonWallClockMinute(lesson.date, lesson.end_time);
      return start <= current && current <= end;
    })
    .sort((a, b) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time));
  return active[0] ? attach(active[0]) : null;
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

export async function createRecurringLessonsForGroup(
  group: { id: string; name: string; teacher_id: string; schedule?: string | null },
  academyId?: string,
  weeks = 12,
): Promise<number> {
  const schedule = parseSchedule(group.schedule);
  if (!schedule?.days.length) return 0;

  const resolvedAcademyId = academyId ?? currentAcademyId();
  const dayIndexes: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const wantedDays = new Set(schedule.days.map((day) => dayIndexes[day]).filter((day) => day !== undefined));
  if (!wantedDays.size) return 0;

  const existing = collections().lessons.filter(
    (lesson) => lesson.academy_id === resolvedAcademyId && lesson.group_id === group.id,
  );
  const existingKeys = new Set(existing.map((lesson) => `${lesson.date}|${lesson.start_time}|${lesson.end_time}`));
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  let created = 0;

  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + offset);
    if (!wantedDays.has(date.getUTCDay())) continue;
    const dateValue = date.toISOString().slice(0, 10);
    const key = `${dateValue}|${schedule.start}|${schedule.end}`;
    if (existingKeys.has(key)) continue;

    const timestamp = new Date().toISOString();
    const lesson: Lesson = {
      id: lid(),
      academy_id: resolvedAcademyId,
      group_id: group.id,
      teacher_id: group.teacher_id,
      date: dateValue,
      start_time: schedule.start,
      end_time: schedule.end,
      topic: group.name,
      description: "Automatically generated from the group's weekly schedule.",
      notes: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    collections().lessons.push(lesson);
    await persistInsert("lessons", lesson);
    existingKeys.add(key);
    created += 1;
  }
  return created;
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
