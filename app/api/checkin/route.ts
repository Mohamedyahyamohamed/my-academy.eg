import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser, resolveStudentForDashboard } from "@/services";
import { verifyQrSession } from "@/lib/qr-session";
import { collections } from "@/services/data/store";
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

  // Verify the lesson exists and student is enrolled.
  const lesson = collections().lessons.find(
    (l) => l.id === lessonId && l.academy_id === user.academy_id,
  );
  if (!lesson) return NextResponse.json({ ok: false, error: "Lesson not found." }, { status: 404 });

  // QR self-check-in is valid only while the lesson is in progress.
  if (!isLessonActive(lesson)) {
    return NextResponse.json({ ok: false, error: "This lesson is not active right now." }, { status: 403 });
  }

  const enrolled = collections().groupStudents.some(
    (gs) => gs.group_id === lesson.group_id && gs.student_id === student.id,
  );
  if (!enrolled) {
    return NextResponse.json({ ok: false, error: "You are not enrolled in this class." }, { status: 403 });
  }

  // Check if already checked in (replay prevention).
  const existing = collections().attendance.find(
    (a) => a.lesson_id === lessonId && a.student_id === student.id,
  );
  if (existing) {
    return NextResponse.json({ ok: false, error: "You already checked in for this lesson." }, { status: 409 });
  }

  // Record.
  await AttendanceService.recordCheckin(lessonId, student.id, "PRESENT");
  return NextResponse.json({ ok: true });
}
