/**
 * Attendance service.
 */
import type {
  AttendanceRecord,
  AttendanceStatus,
  Lesson,
  Student,
} from "@/types";
import { collections } from "./data/store";
import { persistDelete, persistInsert } from "./data/store";
import { studentsInGroup, fullName } from "./_shared";
import { percentage } from "@/lib/utils";

export interface AttendanceEntry {
  student: Student;
  status: AttendanceStatus | null;
}

/** Load a roster for a group/lesson with current attendance state. */
export function getAttendanceSheet(
  groupId: string,
  lessonId: string,
): AttendanceEntry[] {
  const students = studentsInGroup(groupId);
  const records = collections().attendance.filter(
    (a) => a.lesson_id === lessonId,
  );
  return students
    .sort((a, b) => fullName(a).localeCompare(fullName(b)))
    .map((student) => ({
      student,
      status: records.find((r) => r.student_id === student.id)?.status ?? null,
    }));
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export function summarize(records: { status: AttendanceStatus }[]): AttendanceSummary {
  const present = records.filter((r) => r.status === "PRESENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const total = records.length;
  return {
    total,
    present,
    late,
    absent,
    rate: total ? percentage(present + late, total) : 0,
  };
}

/** Bulk save attendance for a lesson (replaces existing records). */
export async function saveAttendance(
  lessonId: string,
  entries: { studentId: string; status: AttendanceStatus }[],
): Promise<void> {
  const now = new Date().toISOString();
  // remove existing
  collections().attendance = collections().attendance.filter(
    (a) => a.lesson_id !== lessonId,
  );
  // Await delete BEFORE insert to avoid a fire-and-forget race.
  await persistDelete("attendance", { lesson_id: lessonId });
  const rows = entries.map((e) => ({
    lesson_id: lessonId,
    student_id: e.studentId,
    status: e.status,
    note: null,
    recorded_at: now,
  }));
  for (const r of rows) {
    collections().attendance.push({ id: `att-${lessonId}-${r.student_id}`, ...r });
  }
  if (rows.length) await persistInsert("attendance", rows);
}

/** Export attendance for a lesson as a { studentId: status } map. */
export function attendanceForLessonExport(
  lessonId: string,
): Record<string, AttendanceStatus> {
  const out: Record<string, AttendanceStatus> = {};
  for (const a of collections().attendance.filter((x) => x.lesson_id === lessonId)) {
    out[a.student_id] = a.status;
  }
  return out;
}

/** Self check-in (QR): upsert a single attendance record for a student. */
export async function recordCheckin(
  lessonId: string,
  studentId: string,
  status: AttendanceStatus = "PRESENT",
): Promise<void> {
  const now = new Date().toISOString();
  const existing = collections().attendance.find(
    (a) => a.lesson_id === lessonId && a.student_id === studentId,
  );
  if (existing) {
    existing.status = status;
    existing.recorded_at = now;
  } else {
    collections().attendance.push({
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      student_id: studentId,
      status,
      note: null,
      recorded_at: now,
    });
  }
  // best-effort persist (upsert by lesson+student)
  try {
    const client = (await import("./data/store")).persistInsert;
    await client("attendance", {
      lesson_id: lessonId,
      student_id: studentId,
      status,
      note: null,
      recorded_at: now,
    });
  } catch {
    /* ignore */
  }
}

/** Attendance summary for a single student. */
export function studentAttendanceSummary(
  studentId: string,
): AttendanceSummary & { byLesson: AttendanceRecord[] } {
  const recs = collections().attendance.filter(
    (a) => a.student_id === studentId,
  );
  return { ...summarize(recs), byLesson: recs };
}

/** Lessons for a group that still have no attendance taken. */
export function lessonsNeedingAttendance(groupId?: string): Lesson[] {
  let lessons = collections().lessons.filter(
    (l) => +new Date(l.date) <= Date.now(),
  );
  if (groupId) lessons = lessons.filter((l) => l.group_id === groupId);
  return lessons.filter(
    (l) => !collections().attendance.some((a) => a.lesson_id === l.id),
  );
}
