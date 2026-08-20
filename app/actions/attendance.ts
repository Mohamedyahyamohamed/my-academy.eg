"use server";

import { revalidatePath } from "next/cache";
import { requireAttendanceTeacher, requireScopedRole, AttendanceService } from "@/services";
import type { AttendanceStatus } from "@/types";
import { audit } from "@/services/audit";

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
  const user = await requireAttendanceTeacher();

  // Rate limit QR scans.
  const { rateLimit, LIMITS } = await import("@/lib/rate-limit-redis");
  const rl = await rateLimit(`scan:${user.id}`, LIMITS.checkin.max, LIMITS.checkin.window);
  if (!rl.allowed) return { ok: false, errorCode: "RATE_LIMITED" as const, error: "Too many scans. Please slow down." };

  const { LessonsService } = await import("@/services");
  const lesson = lessonId ? await LessonsService.getLesson(lessonId) : LessonsService.getActiveLessonForTeacher();
  if (!lesson) {
    return {
      ok: false,
      errorCode: lessonId ? "LESSON_NOT_FOUND" as const : "NO_ACTIVE_LESSON" as const,
      error: lessonId ? "Lesson not found." : "No active lesson was found for this teacher.",
    };
  }

  try {
    await AttendanceService.recordCheckin(lesson.id, studentId, "PRESENT");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record attendance.";
    const errorCode = message.includes("not enrolled") ? "STUDENT_NOT_ENROLLED" as const : "CHECKIN_FAILED" as const;
    return { ok: false, errorCode, error: message, lesson: { id: lesson.id, topic: lesson.topic, groupId: lesson.group_id } };
  }

  void audit({ action: "attendance.scan" }, user);
  revalidatePath(`/lessons/${lesson.id}`);
  return {
    ok: true,
    lesson: { id: lesson.id, topic: lesson.topic, groupId: lesson.group_id },
  };
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
