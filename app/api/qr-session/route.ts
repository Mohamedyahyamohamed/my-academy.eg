import { NextRequest, NextResponse } from "next/server";
import { LessonsService, requireAttendanceTeacher } from "@/services";
import { createQrSession } from "@/lib/qr-session";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { isLessonActive } from "@/services/lessons";
import { requestIpKey } from "@/lib/request-identity";
import { collections, persistInsert } from "@/services/data/store";
import { buildRecurringLessonRows } from "@/lib/lesson-generation";

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

  const { lessonId, groupId } = await req.json();
  if (typeof lessonId !== "string" || !lessonId) {
    return NextResponse.json({ error: "Missing lessonId" }, { status: 400 });
  }

  // Resolve through the same tenant-scoped service used by the attendance page.
  // The request-local collections snapshot is not guaranteed to be hydrated in an API request.
  let lesson = await LessonsService.getLesson(lessonId, user.academy_id);
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  // The attendance page can remain open with an older lesson selected. Resolve
  // the current lesson for the same group before rejecting QR generation.
  if (!isLessonActive(lesson) && typeof groupId === "string" && groupId === lesson.group_id) {
    const candidates = await LessonsService.listLessons(
      { groupId, pageSize: 500 },
      user.academy_id,
      user.id,
    );
    const current = candidates.items.find((item) => isLessonActive(item));
    if (current) lesson = current;
    else {
      const group = lesson.group;
      const generated = group
        ? buildRecurringLessonRows(group, user.academy_id, 1, new Date()).find((item) => isLessonActive(item))
        : null;
      if (generated) {
        try {
          await persistInsert("lessons", generated, user.academy_id);
          collections().lessons.push(generated);
          lesson = generated;
        } catch {
          // Another request may have created today's lesson concurrently.
        }
      }
    }
  }

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
