"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, AttendanceService } from "@/services";
import type { AttendanceStatus } from "@/types";
import { NotificationsService, getCurrentUser } from "@/services";
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

/** Teacher scans a student's personal QR → records them present for a lesson. */
export async function scanCheckinAction(lessonId: string, studentId: string) {
  const user = await requireScopedRole("TEACHER");

  // Rate limit QR scans.
  const { rateLimit, LIMITS } = await import("@/lib/rate-limit-redis");
  const rl = await rateLimit(`scan:${user.id}`, LIMITS.checkin.max, LIMITS.checkin.window);
  if (!rl.allowed) return { ok: false, error: "Too many scans. Please slow down." };
  await AttendanceService.recordCheckin(lessonId, studentId, "PRESENT");
    void audit({ action: "attendance.scan" }, user);
  revalidatePath(`/lessons/${lessonId}`);
  return { ok: true };
}

export async function saveAttendanceAction(
  groupId: string,
  lessonId: string,
  entries: { studentId: string; status: AttendanceStatus }[],
) {
  const user = await requireScopedRole("TEACHER");
  await AttendanceService.saveAttendance(lessonId, entries);
    void audit({ action: "attendance.save" }, user);
  // إشعار Push لأولياء الأمور
  const { notifyAcademy } = await import("@/services/push");
  const absent = entries.filter((e) => e.status === "ABSENT").length;
  void notifyAcademy(user.academy_id, "✅ تم تسجيل الحضور", `تم تسجيل حضور ${entries.length} طالب.${absent > 0 ? ` (${absent} غائب)` : ""}`);
  // إشعار واتساب لأولياء أمور الطلاب الغائبين
  const { notifyParentsWhatsApp } = await import("@/services/whatsapp");
  void notifyParentsWhatsApp(
    entries.filter((e) => e.status === "ABSENT").map((e) => e.studentId),
    "⚠️ تنبيه غياب",
    () => "نود إعلامكم بغياب ابنكم عن الحصة اليوم. برجاء المتابعة.",
    "ATTENDANCE_ABSENCE",
  );
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
}
