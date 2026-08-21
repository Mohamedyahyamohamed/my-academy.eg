import { NextRequest, NextResponse } from "next/server";
import { AttendanceService, loadCurrentUser } from "@/services";
import type { Group } from "@/types";
import { collections, ensureStoreLoaded } from "@/services/data/store";
import { setRequestContext } from "@/services/request-context";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { requestIpKey } from "@/lib/request-identity";
import { attendanceErrorCode, isDuplicateAttendanceError } from "@/lib/attendance-errors";
import { isLessonActive, lessonWallClockMinute } from "@/services/lessons";

const GROUP_CONTEXT_COOKIE = "teacher_checkin_group";
const GROUP_CONTEXT_TTL = 30 * 60;

type GroupOption = {
  id: string;
  name: string;
  teacherId: string;
  lesson?: { id: string; topic: string; startTime: string; endTime: string };
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function activeLessonForGroup(groupId: string, academyId: string) {
  return collections().lessons
    .filter((lesson) => lesson.academy_id === academyId && lesson.group_id === groupId)
    .filter((lesson) => isLessonActive(lesson))
    .sort((a, b) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))[0] ?? null;
}

async function scopedOptions(): Promise<GroupOption[]> {
  const user = await loadCurrentUser();
  if (!user || user.role !== "TEACHER") return [];
  // The QR flow authenticates with the app session cookie. Do not rely on
  // Supabase SSR cookies being present on Safari/Chrome after a QR redirect.
  // Hydrate the tenant snapshot with the server-side client, then scope by the
  // authenticated teacher record and academy.
  await ensureStoreLoaded(user.academy_id);
  setRequestContext(user);
  const teacher = collections().teachers.find(
    (item) => item.academy_id === user.academy_id &&
      (item.profile_id === user.id || item.email.toLowerCase() === user.email.toLowerCase()),
  );
  const groups: Group[] = teacher
    ? collections().groups.filter(
        (group) => group.academy_id === user.academy_id &&
          (group.teacher_id === teacher.id || collections().groupAssistants.some(
            (assistant) => assistant.teacher_id === teacher.id && assistant.group_id === group.id,
          )),
      )
    : [];
  return groups
    .filter((group) => group.status !== "INACTIVE")
    .map((group) => {
      const lesson = activeLessonForGroup(group.id, user.academy_id);
      return {
        id: group.id,
        name: group.name,
        teacherId: group.teacher_id,
        ...(lesson
          ? { lesson: { id: lesson.id, topic: lesson.topic, startTime: lesson.start_time, endTime: lesson.end_time } }
          : {}),
      };
    });
}

export async function GET(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user || user.role !== "TEACHER" || !user.academy_id) {
    return jsonError("TEACHER_LOGIN_REQUIRED", 401);
  }
  // Re-bind the authenticated tenant after every async boundary. QR redirects
  // can cross a request context boundary on mobile browsers.
  setRequestContext(user);
  const groups = await scopedOptions();
  const requestedStudentId = req.nextUrl.searchParams.get("studentId") || req.nextUrl.searchParams.get("student") || "";
  const preferredGroupId = req.cookies.get(GROUP_CONTEXT_COOKIE)?.value ?? null;
  const preferred = preferredGroupId ? groups.find((group) => group.id === preferredGroupId) : undefined;
  const active = groups.find((group) => group.lesson);
  return NextResponse.json({
    ok: true,
    role: user.role,
    staffName: user.full_name,
    studentId: requestedStudentId,
    activeLesson: active?.lesson ? { ...active.lesson, groupId: active.id, groupName: active.name } : null,
    preferredGroupId: preferred?.id ?? null,
    groups,
  });
}

export async function POST(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user || user.role !== "TEACHER" || !user.academy_id) return jsonError("TEACHER_LOGIN_REQUIRED", 401);
  // Keep the signed session and academy available to AttendanceService after
  // scopedOptions() has awaited store hydration.
  setRequestContext(user);

  const rl = await rateLimit(`quick-checkin:${user.id}`, LIMITS.checkin.max, LIMITS.checkin.window);
  const ipRl = await rateLimit(requestIpKey(req, "quick-checkin:ip"), LIMITS.checkin.max, LIMITS.checkin.window);
  if (!rl.allowed || !ipRl.allowed) return jsonError("TOO_MANY_SCANS", 429);

  const body = await req.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const requestedGroupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!studentId) return jsonError("STUDENT_REQUIRED");

  const groups = await scopedOptions();
  setRequestContext(user);
  if (requestedGroupId && !groups.some((item) => item.id === requestedGroupId)) {
    return jsonError("GROUP_NOT_ASSIGNED", 403);
  }
  const cookieGroupId = req.cookies.get(GROUP_CONTEXT_COOKIE)?.value ?? "";
  const activeGroup = groups.find((group) => group.lesson);
  const group = groups.find((item) => item.id === requestedGroupId)
    ?? groups.find((item) => item.id === cookieGroupId)
    ?? (activeGroup?.lesson ? activeGroup : undefined);
  if (!group) return jsonError("NO_ASSIGNED_GROUP", 403);

  const lesson = activeLessonForGroup(group.id, user.academy_id);
  if (!lesson) return jsonError("NO_ACTIVE_LESSON", 409);

  const duplicate = collections().attendance.some(
    (entry) => entry.lesson_id === lesson.id && entry.student_id === studentId,
  );
  if (duplicate) return jsonError("ATTENDANCE_ALREADY_RECORDED", 409);

  try {
    await AttendanceService.recordCheckin(lesson.id, studentId, "PRESENT");
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHECKIN_FAILED";
    if (isDuplicateAttendanceError(message)) return jsonError("ATTENDANCE_ALREADY_RECORDED", 409);
    const code = attendanceErrorCode(message);
    return jsonError(code, code === "STUDENT_NOT_ENROLLED" ? 403 : 500);
  }

  const response = NextResponse.json({
    ok: true,
    studentId,
    lesson: { id: lesson.id, topic: lesson.topic, groupId: group.id, groupName: group.name },
  });
  response.cookies.set(GROUP_CONTEXT_COOKIE, group.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GROUP_CONTEXT_TTL,
    path: "/",
  });
  return response;
}
