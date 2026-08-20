import { NextRequest, NextResponse } from "next/server";
import { LessonsService, requireAttendanceTeacher } from "@/services";
import { createQrSession } from "@/lib/qr-session";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { isLessonActive } from "@/services/lessons";
import { requestIpKey } from "@/lib/request-identity";

/** Generate a signed, short-lived QR session token for an owned lesson. */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAttendanceTeacher();
  } catch {
    return NextResponse.json({ error: "Attendance QR is available to teachers and their assistants only." }, { status: 403 });
  }

  const userLimit = await rateLimit(`qr:user:${user.id}`, LIMITS.qr.max, LIMITS.qr.window);
  const ipLimit = await rateLimit(requestIpKey(req, "qr:ip"), LIMITS.qr.max, LIMITS.qr.window);
  if (!userLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Too many QR requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { lessonId } = await req.json();
  if (typeof lessonId !== "string" || !lessonId) {
    return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
  }

  // Resolve through the same tenant-scoped service used by the attendance page.
  // The request-local collections snapshot is not guaranteed to be hydrated in an API request.
  const lesson = await LessonsService.getLesson(lessonId, user.academy_id);
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  // Verify that this lesson belongs to a group owned by or assigned to this teacher/assistant.
  const scopedLessons = await LessonsService.listLessons(
    { groupId: lesson.group_id, pageSize: 500 },
    user.academy_id,
    user.id,
  );
  if (!scopedLessons.items.some((item) => item.id === lesson.id)) {
    return NextResponse.json({ error: "You do not own this lesson" }, { status: 403 });
  }

  if (!isLessonActive(lesson)) {
    return NextResponse.json(
      {
        error: "QR_NOT_ACTIVE",
        message: "QR attendance is available only while this lesson is in progress.",
        lessonDate: lesson.date,
        startTime: lesson.start_time,
        endTime: lesson.end_time,
      },
      { status: 409 },
    );
  }

  try {
    return NextResponse.json(createQrSession(user.academy_id, lesson.id));
  } catch {
    return NextResponse.json({ error: "QR signing is not configured" }, { status: 503 });
  }
}
