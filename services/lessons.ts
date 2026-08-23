/**
 * Lessons service.
 */
import type { Lesson, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId, currentTeacherId, getCurrentUser } from "./session";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import { getGroup, getTeacher, byAcademy, teacherGroupScope, fetchTableRLS } from "./_shared";
import { resolveTeacherForGroups } from "./groups";
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
  includeCancelled?: boolean;
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
    includeCancelled = false,
    page = 1,
    pageSize = 12,
  } = filters;
  const now = Date.now();
  let items = await fetchTableRLS<Lesson>("lessons", academyId);
  if (!includeCancelled) items = items.filter((lesson) => lesson.is_cancelled !== true);
  // Teachers only see lessons in their groups. Resolve the teacher from the
  // tenant-scoped server data when the request-local snapshot is incomplete.
  const currentUser = getCurrentUser();
  const teacher = teacherProfileId
    ? await resolveTeacherForGroups(academyId, teacherProfileId, currentUser?.email)
    : null;
  const scopedGroups = teacher ? await fetchTableRLS<any>("groups", academyId) : [];
  const scopedAssistants = teacher ? await fetchTableRLS<any>("group_assistants", academyId) : [];
  const tScope = teacher
    ? new Set([
        ...scopedGroups.filter((g: any) => g.academy_id === academyId && g.teacher_id === teacher.id).map((g: any) => g.id),
        ...scopedAssistants
          .filter((ga: any) => ga.teacher_id === teacher.id)
          .map((ga: any) => ga.group_id),
        ...collections().groups.filter((g) => g.academy_id === academyId && g.teacher_id === teacher.id).map((g) => g.id),
        ...collections().groupAssistants
          .filter((ga) => ga.teacher_id === teacher.id)
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
  const currentWallClock = wallClockMinute(new Date(now));
  const startWallClock = (lesson: Lesson) => lessonWallClockMinute(lesson.date, lesson.start_time);
  const endWallClock = (lesson: Lesson) => lessonEndWallClockMinute(lesson.date, lesson.start_time, lesson.end_time);
  if (upcoming) items = items.filter((l) => endWallClock(l) >= currentWallClock);
  if (past) items = items.filter((l) => endWallClock(l) < currentWallClock);
  items.sort((a, b) => startWallClock(b) - startWallClock(a));

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

export function wallClockMinute(date: Date, timeZone = process.env.ACADEMY_TIMEZONE || "Africa/Cairo") {
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
  const daySerial = Math.floor(Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000);
  return daySerial * 24 * 60 + value("hour") * 60 + value("minute");
}

export function lessonWallClockMinute(date: string, time: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  const daySerial = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return daySerial * 24 * 60 + hour * 60 + minute;
}

/**
 * Return the wall-clock end minute, carrying the end into the next day when
 * a lesson crosses midnight (for example 8:00 PM → 6:00 AM).
 */
export function lessonEndWallClockMinute(date: string, start: string, end: string) {
  const startsAt = lessonWallClockMinute(date, start);
  const endsAt = lessonWallClockMinute(date, end);
  return endsAt <= startsAt ? endsAt + 24 * 60 : endsAt;
}

export function isLessonUpcoming(lesson: Pick<Lesson, "date" | "start_time">, now = new Date()) {
  return lessonWallClockMinute(lesson.date, lesson.start_time) >= wallClockMinute(now);
}

export function isLessonActive(
  lesson: Pick<Lesson, "date" | "start_time" | "end_time">,
  now = new Date(),
) {
  const current = wallClockMinute(now);
  const startsAt = lessonWallClockMinute(lesson.date, lesson.start_time);
  const endsAt = lessonEndWallClockMinute(lesson.date, lesson.start_time, lesson.end_time);
  return startsAt <= current && current <= endsAt;
}

function validateLessonWindow(date: string, start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
    throw new Error("A valid lesson date is required.");
  }
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    throw new Error("Lesson times must use the HH:MM format.");
  }
  const startMinute = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
  const endMinute = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5));
  if (startMinute > 1439 || endMinute > 1439 || endMinute === startMinute) {
    throw new Error("End time must be after start time, including across midnight.");
  }
}

function assertNoLessonConflict(candidate: Pick<Lesson, "id" | "group_id" | "teacher_id" | "date" | "start_time" | "end_time">) {
  const start = lessonWallClockMinute(candidate.date, candidate.start_time);
  const end = lessonEndWallClockMinute(candidate.date, candidate.start_time, candidate.end_time);
  const conflict = collections().lessons.find((lesson) => {
    if (lesson.id === candidate.id) return false;
    if (lesson.group_id !== candidate.group_id && lesson.teacher_id !== candidate.teacher_id) return false;
    const otherStart = lessonWallClockMinute(lesson.date, lesson.start_time);
    const otherEnd = lessonEndWallClockMinute(lesson.date, lesson.start_time, lesson.end_time);
    return start < otherEnd && end > otherStart;
  });
  if (conflict) throw new Error("This lesson overlaps another lesson for the same group or teacher.");
}

/** Return the single lesson currently in progress for the authenticated teacher. */
export function getActiveLessonForTeacher(now = new Date()): Lesson | null {
  const academyId = currentAcademyId();
  const teacherId = currentTeacherId();
  const scope = teacherId ? teacherGroupScope() : null;
  if (!teacherId || !scope?.size) return null;
  const active = collections().lessons
    .filter((lesson) => lesson.academy_id === academyId && lesson.is_cancelled !== true && scope.has(lesson.group_id))
    .filter((lesson) => isLessonActive(lesson, now))
    .sort((a, b) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time));
  return active[0] ? attach(active[0]) : null;
}

export async function getUpcomingLessons(limit = 5): Promise<Lesson[]> {
  const result = await listLessons({ upcoming: true, pageSize: limit });
  return result.items
    .sort((a, b) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))
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
      is_cancelled: false,
      cancellation_reason: null,
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
    // Persist with the verified tenant scope first. Only update the local
    // snapshot after the durable write succeeds, so a lesson-generation error
    // cannot leave the request believing a lesson was saved.
    await persistInsert("lessons", lesson, resolvedAcademyId);
    collections().lessons.push(lesson);
    existingKeys.add(key);
    created += 1;
  }
  return created;
}

export async function createLesson(input: LessonInput): Promise<Lesson> {
  const academyId = currentAcademyId();
  const group = getGroup(input.group_id);
  if (!group || group.academy_id !== academyId) {
    throw new Error("The selected group is not available in this academy.");
  }

  const scope = teacherGroupScope();
  if (scope && !scope.has(group.id)) {
    throw new Error("You do not have permission to create a lesson for this group.");
  }

  const start = input.start_time.trim();
  const end = input.end_time.trim();
  validateLessonWindow(input.date, start, end);

  const topic = input.topic.trim();
  if (!topic) throw new Error("Topic is required.");

  // The group is the source of truth. Never trust teacher_id from the browser,
  // otherwise a client could create a lesson under another teacher's identity.
  const now = new Date().toISOString();
  const l: Lesson = {
    id: lid(),
    is_cancelled: false,
    cancellation_reason: null,
    academy_id: academyId,
    group_id: group.id,
    teacher_id: group.teacher_id,
    date: input.date,
    start_time: start,
    end_time: end,
    topic,
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  assertNoLessonConflict(l);

  // Persist first. The in-memory snapshot must never report a successful
  // creation when the durable write failed.
  await persistInsert("lessons", l);
  collections().lessons.push(l);
  return attach(l);
}

export async function updateLesson(
  id: string,
  input: Partial<LessonInput>,
): Promise<Lesson | null> {
  const l = collections().lessons.find((x) => x.id === id);
  if (!l) return null;
  const academyId = currentAcademyId();
  if (l.academy_id !== academyId) throw new Error("Lesson is outside the authenticated academy.");
  const scope = teacherGroupScope();
  if (scope && !scope.has(l.group_id)) throw new Error("You do not have permission to edit this lesson.");

  const nextGroup = input.group_id ? getGroup(input.group_id) : getGroup(l.group_id);
  if (!nextGroup || nextGroup.academy_id !== academyId) throw new Error("The selected group is not available in this academy.");
  if (scope && !scope.has(nextGroup.id)) throw new Error("You do not have permission to use this group.");

  const nextDate = input.date ?? l.date;
  const nextStart = (input.start_time ?? l.start_time).trim();
  const nextEnd = (input.end_time ?? l.end_time).trim();
  validateLessonWindow(nextDate, nextStart, nextEnd);
  const next: Lesson = {
    ...l,
    ...input,
    group_id: nextGroup.id,
    teacher_id: nextGroup.teacher_id,
    date: nextDate,
    start_time: nextStart,
    end_time: nextEnd,
    topic: input.topic !== undefined ? input.topic.trim() : l.topic,
    description: input.description !== undefined ? input.description?.trim() || null : l.description,
    notes: input.notes !== undefined ? input.notes?.trim() || null : l.notes,
    updated_at: new Date().toISOString(),
  };
  if (!next.topic) throw new Error("Topic is required.");
  assertNoLessonConflict(next);
  const { id: _id, ...patch } = next;
  await persistUpdate("lessons", id, patch);
  Object.assign(l, next);
  return attach(l);
}

export async function cancelLesson(id: string, reason?: string): Promise<Lesson | null> {
  const l = collections().lessons.find((lesson) => lesson.id === id);
  if (!l) return null;
  const academyId = currentAcademyId();
  if (!academyId || l.academy_id !== academyId) throw new Error("Lesson is outside the authenticated academy.");
  const scope = teacherGroupScope();
  if (scope && !scope.has(l.group_id)) throw new Error("You do not have permission to cancel this lesson.");
  if (l.is_cancelled) return attach(l);
  const patch = {
    is_cancelled: true,
    cancellation_reason: reason?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  await persistUpdate("lessons", id, patch, academyId);
  Object.assign(l, patch);
  return attach(l);
}

export async function deleteLesson(id: string): Promise<boolean> {
  const lesson = collections().lessons.find((l) => l.id === id);
  if (!lesson) return false;
  const academyId = currentAcademyId();
  if (lesson.academy_id !== academyId) throw new Error("Lesson is outside the authenticated academy.");
  const scope = teacherGroupScope();
  if (scope && !scope.has(lesson.group_id)) throw new Error("You do not have permission to delete this lesson.");

  await persistDelete("lessons", { id });
  await persistDelete("attendance", { lesson_id: id });
  collections().lessons = collections().lessons.filter((l) => l.id !== id);
  collections().attendance = collections().attendance.filter((a) => a.lesson_id !== id);
  return true;
}
