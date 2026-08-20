import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser, resolveStudentForDashboard, LessonsService } from "@/services";
import { verifyQrSession } from "@/lib/qr-session";
import { fetchTableRLS } from "@/services/_shared";
import { AttendanceService } from "@/services";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { isLessonActive } from "@/services/lessons";
import { requestIpKey } from "@/lib/request-identity";

/** Student self check-in via a tenant-scoped, short-lived QR token. */
export async function POST(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ ok: false, error: "Must be logged in as a student." }, { status: 401 });
  }

  // Rate limit.
  const userLimit = await rateLimit(`checkin:user:${user.id}`, LIMITS.checkin.max, LIMITS.checkin.window);
  const ipLimit = await rateLimit(requestIpKey(req, "checkin:ip"), LIMITS.checkin.max, LIMITS.checkin.window);
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many check-in attempts." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { token } = await req.json();
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ ok: false, error: "A valid QR token is required." }, { status: 403 });
  }

  const session = verifyQrSession(token);
  if (!session || session.academyId !== user.academy_id) {
    return NextResponse.json({ ok: false, error: "QR token invalid or expired." }, { status: 403 });
  }
  const lessonId = session.lessonId;

  // Resolve student.
  // The in-memory tenant snapshot can be empty in a serverless API request.
  // Resolve from the current tenant-scoped Supabase request, with the same
  // academy + email constraints, before falling back to the local snapshot.
  const student = await resolveStudentForDashboard(user);
  if (!student) {
    return NextResponse.json({ ok: false, error: "No student profile linked." }, { status: 403 });
  }

  // Verify the lesson through the same tenant-scoped service used to create
  // the QR session. A serverless request may not have a hydrated collections
  // snapshot, so never use collections().lessons as the source of truth here.
  const lesson = await LessonsService.getLesson(lessonId, user.academy_id);
  if (!lesson) return NextResponse.json({ ok: false, error: "Lesson not found." }, { status: 404 });

  // QR self-check-in is valid only while the lesson is in progress.
  if (!isLessonActive(lesson)) {
    return NextResponse.json({ ok: false, error: "This lesson is not active right now." }, { status: 403 });
  }

  const groupStudents = await fetchTableRLS<{ group_id: string; student_id: string }>(
    "group_students",
    user.academy_id,
  );
  const enrolled = groupStudents.some(
    (gs) => gs.group_id === lesson.group_id && gs.student_id === student.id,
  );
  if (!enrolled) {
    return NextResponse.json({ ok: false, error: "You are not enrolled in this class." }, { status: 403 });
  }

  // Check if already checked in (replay prevention).
  const attendance = await fetchTableRLS<{ lesson_id: string; student_id: string }>(
    "attendance",
    user.academy_id,
  );
  const existing = attendance.find(
    (a) => a.lesson_id === lessonId && a.student_id === student.id,
  );
  if (existing) {
    return NextResponse.json({ ok: false, error: "You already checked in for this lesson." }, { status: 409 });
  }

  // Record.
  await AttendanceService.recordCheckin(lessonId, student.id, "PRESENT");
  return NextResponse.json({ ok: true });
}
