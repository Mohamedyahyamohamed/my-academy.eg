import { NextRequest, NextResponse } from "next/server";
import { AttendanceService, LessonsService, GroupsService, loadCurrentUser } from "@/services";
import type { Group } from "@/types";
import { collections } from "@/services/data/store";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { requestIpKey } from "@/lib/request-identity";

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

function activeLessonForGroup(groupId: string) {
  const active = LessonsService.getActiveLessonForTeacher();
  return active?.group_id === groupId ? active : null;
}

async function scopedOptions(): Promise<GroupOption[]> {
  const user = await loadCurrentUser();
  if (!user || user.role !== "TEACHER") return [];
  const groups: Group[] = await GroupsService.listGroups("", user.academy_id, user.id);
  return groups
    .filter((group) => group.status !== "INACTIVE")
    .map((group) => {
      const lesson = activeLessonForGroup(group.id);
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
  if (!user || user.role !== "TEACHER") {
    return jsonError("TEACHER_LOGIN_REQUIRED", 401);
  }
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
  if (!user || user.role !== "TEACHER") return jsonError("TEACHER_LOGIN_REQUIRED", 401);

  const rl = await rateLimit(`quick-checkin:${user.id}`, LIMITS.checkin.max, LIMITS.checkin.window);
  const ipRl = await rateLimit(requestIpKey(req, "quick-checkin:ip"), LIMITS.checkin.max, LIMITS.checkin.window);
  if (!rl.allowed || !ipRl.allowed) return jsonError("TOO_MANY_SCANS", 429);

  const body = await req.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const requestedGroupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!studentId) return jsonError("STUDENT_REQUIRED");

  const groups = await scopedOptions();
  const cookieGroupId = req.cookies.get(GROUP_CONTEXT_COOKIE)?.value ?? "";
  const activeGroup = groups.find((group) => group.lesson);
  const group = groups.find((item) => item.id === requestedGroupId)
    ?? groups.find((item) => item.id === cookieGroupId)
    ?? (activeGroup?.lesson ? activeGroup : undefined);
  if (!group) return jsonError("NO_ASSIGNED_GROUP", 403);

  const lesson = activeLessonForGroup(group.id);
  if (!lesson) return jsonError("NO_ACTIVE_LESSON", 409);

  try {
    await AttendanceService.recordCheckin(lesson.id, studentId, "PRESENT");
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHECKIN_FAILED";
    return jsonError(message.includes("not enrolled") || message.includes("enrolled") ? "STUDENT_NOT_ENROLLED" : message, 403);
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
