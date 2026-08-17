import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/services/data/store";
import { currentTeacherId, loadCurrentUser } from "@/services";
import { createQrSession } from "@/lib/qr-session";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { requestIpKey } from "@/lib/request-identity";

/** Generate a signed, short-lived QR session token for an owned lesson. */
export async function POST(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["TEACHER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const lesson = collections().lessons.find(
    (item) => item.id === lessonId && item.academy_id === user.academy_id,
  );
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  if (user.role === "TEACHER" && lesson.teacher_id !== currentTeacherId()) {
    return NextResponse.json({ error: "You do not own this lesson" }, { status: 403 });
  }

  try {
    return NextResponse.json(createQrSession(user.academy_id, lesson.id));
  } catch {
    return NextResponse.json({ error: "QR signing is not configured" }, { status: 503 });
  }
}
