import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, resolveStudent } from "@/services";
import { verifyQrSession } from "@/lib/qr-session";
import { collections } from "@/services/data/store";
import { AttendanceService } from "@/services";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";

/** Student self check-in via secure QR token (or legacy lesson param). */
export async function POST(req: NextRequest) {
  const user = getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ ok: false, error: "Must be logged in as a student." }, { status: 401 });
  }

  // Rate limit.
  const rl = await rateLimit(`checkin:${user.id}`, LIMITS.checkin.max, LIMITS.checkin.window);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "Too many check-in attempts." }, { status: 429 });

  const { token, lessonId: lessonIdParam } = await req.json();

  // Verify the QR token (secure path) or fall back to lesson param (legacy).
  let lessonId: string | null = null;
  if (token) {
    const session = verifyQrSession(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "QR token invalid or expired." }, { status: 403 });
    }
    lessonId = session.lessonId;
  } else if (lessonIdParam) {
    // Legacy: no token, just lessonId (less secure, for backward compat).
    lessonId = lessonIdParam;
  }

  if (!lessonId) {
    return NextResponse.json({ ok: false, error: "Missing check-in data." }, { status: 400 });
  }

  // Resolve student.
  const student = resolveStudent(user);
  if (!student) {
    return NextResponse.json({ ok: false, error: "No student profile linked." }, { status: 403 });
  }

  // Verify the lesson exists and student is enrolled.
  const lesson = collections().lessons.find((l) => l.id === lessonId);
  if (!lesson) return NextResponse.json({ ok: false, error: "Lesson not found." }, { status: 404 });

  // Lesson must be active (today or within a time window).
  const lessonDate = new Date(lesson.date);
  const now = new Date();
  const diffHours = Math.abs(now.getTime() - lessonDate.getTime()) / (1000 * 60 * 60);
  if (diffHours > 24) {
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
