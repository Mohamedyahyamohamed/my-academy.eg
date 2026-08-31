"use server";

import { revalidatePath } from "next/cache";
import { requireAttendanceTeacher, requireScopedRole, AttendanceService, StudentsService } from "@/services";
import type { AttendanceStatus } from "@/types";
import { audit } from "@/services/audit";
import { setRequestContext } from "@/services/request-context";
import { attendanceErrorCode } from "@/lib/attendance-errors";
import { fullName } from "@/lib/utils";

export async function checkinAction(lessonId: string) {
  const user = await requireScopedRole("STUDENT");
  // Resolve the student record by the logged-in email.
  const { resolveStudent } = await import("@/services/portals");
  const student = resolveStudent(user);
  if (!student) return { ok: false, error: "No student profile linked to your account." };
  // Verify the student is enrolled in the lesson's group.
  const lesson = (await import("@/services/data/store")).collections().lessons.find((l) => l.id === lessonId);
  if (!lesson) return { ok: false, error: "Lesson not found." };
  const enrolled = (await import("@/services/data/store")).collections().groupStudents.some(
    (gs) => gs.group_id === lesson.group_id && gs.student_id === student.id,
  );
  if (!enrolled) return { ok: false, error: "You are not enrolled in this class." };
  await AttendanceService.recordCheckin(lessonId, student.id, "PRESENT");
  revalidatePath(`/lessons/${lessonId}`);
  return { ok: true };
}

/** Teacher scans a student's personal QR → records them present for an explicit or active lesson. */
export async function scanCheckinAction(lessonId: string | null | undefined, studentId: string) {
  let user: Awaited<ReturnType<typeof requireAttendanceTeacher>>;
  try {
    user = await requireAttendanceTeacher();
  } catch (error) {
    console.error("[attendance] QR teacher authentication failed:", error instanceof Error ? error.message : error);
    return { ok: false, errorCode: "TEACHER_LOGIN_REQUIRED" as const, error: "Teacher login is required before scanning." };
  }

  // Keep every QR operation inside a stable result boundary so a server-action
  // rejection never becomes the generic client "Something went wrong" toast.
  // Keep redirects/authentication outside the boundary, but make every remaining
  // QR operation return a stable result. A thrown Server Action becomes a generic
  // client "Network error" and hides whether the scan was actually persisted.
  try {
    // Rate limit QR scans.
    const { rateLimit, LIMITS } = await import("@/lib/rate-limit-redis");
    const rl = await rateLimit(`scan:${user.id}`, LIMITS.checkin.max, LIMITS.checkin.window);
    // Async provider work can detach AsyncLocalStorage in some server-action
    // render paths. Rebind the authenticated tenant/user context before any
    // scoped lesson or attendance lookup.
    setRequestContext(user);
    if (!rl.allowed) return { ok: false, errorCode: "RATE_LIMITED" as const, error: "Too many scans. Please slow down." };

    // Resolve the scanned student's display name before lesson lookup so rejected scans
    // (for example, no active lesson) still show the real student name in the log.
    const scannedStudent = await StudentsService.getStudent(studentId);
    let directStudent: { id: string; first_name: string; last_name: string } | null = null;
    try {
      const { createServerSupabaseClient } = await import("@/lib/supabase/server");
      const client = await createServerSupabaseClient();
      const { data } = await client
        .from("students")
        .select("id,first_name,last_name")
        .eq("id", studentId)
        .eq("academy_id", user.academy_id)
        .maybeSingle();
      directStudent = data as typeof directStudent;
    } catch (error) {
      console.warn("[attendance] direct student-name lookup skipped:", error instanceof Error ? error.message : error);
    }
    const { collections } = await import("@/services/data/store");
    const snapshotStudent = collections().students.find(
      (candidate) => candidate.id === studentId && candidate.academy_id === user.academy_id,
    ) ?? null;
    const resolvedStudent = directStudent ?? scannedStudent ?? snapshotStudent;
    const student = resolvedStudent ? { id: resolvedStudent.id, name: fullName(resolvedStudent) } : null;

    const { LessonsService } = await import("@/services");
    const lesson = lessonId ? await LessonsService.getLesson(lessonId) : await LessonsService.getActiveLessonForTeacher();
    if (!lesson) {
      return {
        ok: false,
        errorCode: lessonId ? "LESSON_NOT_FOUND" as const : "NO_ACTIVE_LESSON" as const,
        error: lessonId ? "Lesson not found." : "No active lesson was found for this teacher.",
        student,
      };
    }

    try {
      await AttendanceService.recordCheckin(lesson.id, studentId, "PRESENT");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to record attendance.";
      const errorCode = attendanceErrorCode(message);
      return { ok: false, errorCode, error: errorCode, lesson: { id: lesson.id, topic: lesson.topic, groupId: lesson.group_id }, student };
    }

    void audit({ action: "attendance.scan" }, user);
    // Cache refresh is non-critical to the scanner response. Never turn a
    // persisted attendance record into a retryable failure if revalidation is
    // unavailable in the current runtime.
    try {
      revalidatePath(`/lessons/${lesson.id}`);
    } catch (error) {
      console.warn("[attendance] QR cache refresh skipped:", error instanceof Error ? error.message : error);
    }
    return {
      ok: true,
      lesson: { id: lesson.id, topic: lesson.topic, groupId: lesson.group_id },
      student,
    };
  } catch (error) {
    console.error("[attendance] QR scan request failed:", error instanceof Error ? error.message : error);
    return { ok: false, errorCode: "REQUEST_FAILED" as const, error: "Unable to process this scan right now. Please retry." };
  }
}

export async function updateAttendanceStatusAction(
  groupId: string,
  lessonId: string,
  studentId: string,
  status: AttendanceStatus,
  note?: string | null,
) {
  const user = await requireAttendanceTeacher();
  setRequestContext(user);
  const result = await AttendanceService.updateAttendanceStatus(groupId, lessonId, studentId, status, note);
  if (result.ok) {
    void audit({
      action: "attendance.manual_override",
      entity_type: "attendance",
      entity_id: result.attendanceId,
      old_data: { status: result.previousStatus },
      new_data: { status: result.status, note: result.note },
      metadata: { source: "manual_override", lesson_id: lessonId, student_id: studentId, note: result.note },
    }, user);
    revalidatePath(`/lessons/${lessonId}`);
    revalidatePath(`/attendance?group=${groupId}&lesson=${lessonId}`);
    revalidatePath(`/students/${studentId}`);
  }
  return result;
}

export type AttendanceSaveResult =
  | { ok: true; saved: number }
  | { ok: false; error: string };

export async function saveAttendanceAction(
  groupId: string,
  lessonId: string,
  entries: { studentId: string; status: AttendanceStatus }[],
): Promise<AttendanceSaveResult> {
  // Keep authentication/authorization redirects outside the error boundary. Next.js
  // implements redirects by throwing a control-flow error that must propagate.
  const user = await requireAttendanceTeacher();
  setRequestContext(user);

  try {
    await AttendanceService.saveAttendance(lessonId, entries);
    void audit({ action: "attendance.save" }, user);

    // Notifications are best-effort. A notification provider outage must not turn a
    // successful attendance write into a failed Server Action / RSC render.
    try {
      const { notifyAcademy } = await import("@/services/push");
      const absent = entries.filter((e) => e.status === "ABSENT").length;
      void notifyAcademy(
        user.academy_id,
        "✅ تم تسجيل الحضور",
        `تم تسجيل حضور ${entries.length} طالب.${absent > 0 ? ` (${absent} غائب)` : ""}`,
      );

      const { notifyParentsWhatsApp } = await import("@/services/whatsapp");
      void notifyParentsWhatsApp(
        entries.filter((e) => e.status === "ABSENT").map((e) => e.studentId),
        "⚠️ تنبيه غياب",
        () => "نود إعلامكم بغياب ابنكم عن الحصة اليوم. برجاء المتابعة.",
        "ATTENDANCE_ABSENCE",
      );
    } catch (notificationError) {
      console.error(
        "[attendance] notification dispatch failed after attendance save:",
        notificationError instanceof Error ? notificationError.message : notificationError,
      );
    }

    revalidatePath(`/lessons/${lessonId}`);
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/dashboard");
    return { ok: true, saved: entries.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save attendance.";
    console.error("[attendance] save failed:", message);
    return { ok: false, error: message };
  }
}
