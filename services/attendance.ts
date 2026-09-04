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
import { persistDelete, persistInsert, persistUpdate } from "./data/store";
import { studentsInGroup, fullName, teacherGroupScope } from "./_shared";
import { percentage } from "@/lib/utils";
import { currentAcademyId, getCurrentUser } from "./session";
import { can, hasAcademyWideScope } from "@/lib/permissions";
import { isLessonCanceled } from "./lessons";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export interface AttendanceEntry {
  student: Student;
  status: AttendanceStatus | null;
}

// ─── Timezone Helpers (Africa/Cairo) ────────────────────────────
function getCairoDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }); // YYYY-MM-DD
}
// ─────────────────────────────────────────────────────────────────

function lessonInCurrentAcademy(lessonId: string) {
  const academyId = currentAcademyId();
  const lesson = collections().lessons.find((item) => item.id === lessonId);
  const group = lesson ? collections().groups.find((item) => item.id === lesson.group_id) : null;
  const lessonAcademyId = lesson?.academy_id ?? group?.academy_id;
  if (!academyId || !lesson || !group || lessonAcademyId !== academyId || group.academy_id !== academyId) {
    throw new Error("Lesson is outside the authenticated academy.");
  }
  return { lesson, group };
}

function assertAttendanceManager(lessonId: string) {
  const user = getCurrentUser();
  if (!user || !can(user, "attendance.record")) {
    throw new Error("You are not allowed to record attendance.");
  }
  const { lesson, group } = lessonInCurrentAcademy(lessonId);
  if (isLessonCanceled(lesson)) throw new Error("Cannot record attendance for a cancelled lesson.");
  if (!hasAcademyWideScope(user.role) && !teacherGroupScope()?.has(group.id)) {
    throw new Error("You can only record attendance for an assigned group.");
  }
  return { user, lesson, group };
}

function assertStudentEnrolled(lessonId: string, studentId: string) {
  const { lesson, group } = lessonInCurrentAcademy(lessonId);
  const student = collections().students.find((item) => item.id === studentId && item.academy_id === group.academy_id);
  const enrolled = collections().groupStudents.some((item) => item.group_id === group.id && item.student_id === studentId);
  if (!student || !enrolled) throw new Error("Student is not enrolled in this lesson group.");
  return { lesson, group, student };
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
  const { group } = assertAttendanceManager(lessonId);
  const uniqueStudentIds = new Set(entries.map((entry) => entry.studentId));
  if (uniqueStudentIds.size !== entries.length) throw new Error("Duplicate student attendance entries are not allowed.");
  
  // تحسين الأداء (O(N) بدلًا من O(N^2)) لتجنب البحث المتكرر لكل طالب
  const groupStudentsSet = new Set(
    collections().groupStudents.filter(item => item.group_id === group.id).map(item => item.student_id)
  );
  const validAcademyStudentsSet = new Set(
    collections().students.filter(item => item.academy_id === group.academy_id).map(item => item.id)
  );
  
  for (const entry of entries) {
    if (!groupStudentsSet.has(entry.studentId) || !validAcademyStudentsSet.has(entry.studentId)) {
      throw new Error("Student is not enrolled in this lesson group.");
    }
  }

  const now = new Date().toISOString();
  // remove existing
  collections().attendance = collections().attendance.filter(
    (a) => a.lesson_id !== lessonId,
  );
  // Await delete BEFORE insert to avoid a fire-and-forget race.
  await persistDelete("attendance", { lesson_id: lessonId });
  const rows = entries.map((e) => ({
    lesson_id: lessonId,
    academy_id: group.academy_id,
    student_id: e.studentId,
    status: e.status,
    note: null,
    notes: null,
    recorded_at: now,
  }));
  for (const r of rows) {
    collections().attendance.push({ id: `att-${lessonId}-${r.student_id}`, ...r });
  }
  if (rows.length) await persistInsert("attendance", rows);
}

export type AttendanceStatusUpdateResult =
  | { ok: true; attendanceId: string; previousStatus: AttendanceStatus | null; status: AttendanceStatus; note: string | null }
  | { ok: false; code: string; field: string; message: string; details?: string };

/** Update one student's attendance without changing other students or lessons. */
export async function updateAttendanceStatus(
  groupId: string,
  lessonId: string,
  studentId: string,
  status: AttendanceStatus,
  note?: string | null,
): Promise<AttendanceStatusUpdateResult> {
  try {
    if (!["PRESENT", "ABSENT", "LATE"].includes(status)) {
      return {
        ok: false,
        code: "INVALID_STATUS",
        field: "status",
        message: "حالة الحضور غير صحيحة.",
        details: "اختر حاضر أو متأخر أو غائب.",
      };
    }
    const { lesson, group } = assertAttendanceManager(lessonId);
    if (isLessonCanceled(lesson)) {
      return {
        ok: false,
        code: "LESSON_CANCELLED",
        field: "lessonId",
        message: "لا يمكن تسجيل الحضور لحصة ملغاة.",
        details: "أعد جدولة الحصة أو ألغِ الإلغاء أولًا قبل تعديل الحضور.",
      };
    }
    if (group.id !== groupId) {
      return {
        ok: false,
        code: "GROUP_MISMATCH",
        field: "groupId",
        message: "المجموعة المحددة لا تطابق مجموعة الحصة.",
        details: "افتح الحضور من نفس الحصة واختر طالبًا من قائمتها.",
      };
    }
    const { student } = assertStudentEnrolled(lessonId, studentId);
    const existing = collections().attendance.find(
      (record) => record.lesson_id === lessonId && record.student_id === student.id,
    );
    const previousStatus = existing?.status ?? null;
    const now = new Date().toISOString();
    const attendanceId = existing?.id ?? crypto.randomUUID();
    const row = {
      id: attendanceId,
      lesson_id: lessonId,
      student_id: student.id,
      status,
      note: note !== undefined ? (note?.trim() || null) : (existing?.note ?? existing?.notes ?? null),
      notes: note !== undefined ? (note?.trim() || null) : (existing?.notes ?? existing?.note ?? null),
      recorded_at: now,
    };

    if (existing) {
      const { id: _id, ...patch } = row;
      await persistUpdate("attendance", existing.id, patch);
    } else await persistInsert("attendance", row);

    if (existing) Object.assign(existing, row);
    else collections().attendance.push(row);
    return { ok: true, attendanceId, previousStatus, status, note: row.note };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "تعذر تعديل الحضور.";
    const message = raw.includes("not enrolled")
      ? "الطالب غير مسجل في مجموعة هذه الحصة."
      : raw.includes("assigned group")
        ? "لا تملك صلاحية تعديل حضور هذه المجموعة."
        : raw.includes("cancelled")
          ? "لا يمكن تعديل حضور حصة ملغاة."
          : raw.includes("outside") || raw.includes("academy")
          ? "الحصة أو الطالب خارج نطاق الأكاديمية الحالية."
          : "تعذر حفظ تعديل الحضور في قاعدة البيانات.";
    return {
      ok: false,
      code: raw.includes("cancelled") ? "LESSON_CANCELLED" : "ATTENDANCE_UPDATE_FAILED",
      field: raw.includes("cancelled") ? "lessonId" : raw.includes("not enrolled") ? "studentId" : "attendance",
      message,
      details: raw,
    };
  }
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
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication is required.");
  const { student, lesson } = assertStudentEnrolled(lessonId, studentId);
  if (isLessonCanceled(lesson)) throw new Error("Cannot record attendance for a cancelled lesson.");
  if (user.role === "STUDENT") {
    if (student.email?.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error("Students can only check in for themselves.");
    }
  } else {
    assertAttendanceManager(lessonId);
  }
  
  const admin = nodeSupabaseClient();
  if (admin) {
    const { data: existing } = await admin
      .from("attendance")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("student_id", studentId)
      .eq("academy_id", currentAcademyId())
      .maybeSingle();
    // تم الالتزام الحرفي بالنص الإلزامي للـ QR
    if (existing) throw new Error("تم تسجيل الطالب لهذه الحصة من قبل");
  } else if (collections().attendance.some((a) => a.lesson_id === lessonId && a.student_id === studentId)) {
    throw new Error("تم تسجيل الطالب لهذه الحصة من قبل");
  }
  
  const now = new Date().toISOString();
  // Persist first. If the durable write fails, do not mutate the request snapshot
  // or return a false-success response to the QR client.
  await persistInsert("attendance", {
    lesson_id: lessonId,
    student_id: studentId,
    status,
    note: null,
    notes: null,
    recorded_at: now,
  });
  
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
      notes: null,
      recorded_at: now,
    });
  }
}

/** Return true when the academy configured the lesson date as a holiday. */
export function isAcademyHoliday(date: string, academyId?: string): boolean {
  const academy = collections().academies.find((item: any) => item.id === academyId);
  const holidays = Array.isArray((academy as any)?.holidays) ? (academy as any).holidays : [];
  return holidays.includes(String(date).slice(0, 10));
}

/** Attendance summary for a single student. */
export function studentAttendanceSummary(
  studentId: string,
  academyId?: string,
): AttendanceSummary & { byLesson: AttendanceRecord[] } {
  const authenticatedAcademyId = currentAcademyId();
  const requestedAcademyId = academyId ?? authenticatedAcademyId;
  if (!authenticatedAcademyId || requestedAcademyId !== authenticatedAcademyId) {
    return { ...summarize([]), byLesson: [] };
  }
  const student = collections().students.find((item) => item.id === studentId && item.academy_id === authenticatedAcademyId);
  if (!student) return { ...summarize([]), byLesson: [] };
  const recs = collections().attendance.filter((a) => {
    if (a.student_id !== studentId) return false;
    const lesson = collections().lessons.find((item) => item.id === a.lesson_id);
    return Boolean(lesson && lesson.academy_id === authenticatedAcademyId && !isLessonCanceled(lesson) && !isAcademyHoliday(lesson.date, authenticatedAcademyId));
  });
  return { ...summarize(recs), byLesson: recs };
}

/** Lessons for a group that still have no attendance taken. */
export function lessonsNeedingAttendance(groupId?: string): Lesson[] {
  const todayString = getCairoDateString();
  let lessons = collections().lessons.filter(
    // تم تغيير Date.now() إلى توقيت القاهرة لضمان ظهور حصص اليوم بعد منتصف الليل
    (l) => String(l.date).slice(0, 10) <= todayString && !isLessonCanceled(l),
  );
  if (groupId) lessons = lessons.filter((l) => l.group_id === groupId);
  return lessons.filter(
    (l) => !collections().attendance.some((a) => a.lesson_id === l.id),
  );
}
