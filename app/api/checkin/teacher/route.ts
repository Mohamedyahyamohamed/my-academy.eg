import { NextRequest, NextResponse } from "next/server";
import { AttendanceService, loadCurrentUser } from "@/services";
import type { Group } from "@/types";
import { collections, ensureStoreLoaded } from "@/services/data/store";
import { setRequestContext } from "@/services/request-context";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { requestIpKey } from "@/lib/request-identity";
import { attendanceErrorCode, isDuplicateAttendanceError } from "@/lib/attendance-errors";
import { isLessonActive, isLessonCanceled, lessonWallClockMinute } from "@/services/lessons";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { fullName } from "@/lib/utils";
import { withReadTimeout } from "@/services/_shared";

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

async function activeLessonForGroup(groupId: string, academyId: string) {
  let lessons = collections().lessons
    .filter((lesson) => lesson.academy_id === academyId && lesson.group_id === groupId);

  // QR attendance must not rely on the stale-while-revalidate navigation
  // snapshot. Read this group's lessons live when the server client is
  // available, then fall back to the already hydrated tenant data only if the
  // live read fails.
  if (isSupabaseConfigured()) {
    const admin = nodeSupabaseClient();
    if (admin) {
      try {
        const result = await withReadTimeout<any>(admin
          .from("lessons")
          .select("id,academy_id,group_id,teacher_id,date,start_time,end_time,topic,status,is_cancelled")
          .eq("academy_id", academyId)
          .eq("group_id", groupId)
          .limit(2000));
        if (result && !result.error && result.data) lessons = result.data as any[];
      } catch {
        // Fall back to the hydrated snapshot when the live read is unavailable.
      }
    }
  }

  return lessons
    .filter((lesson) => !isLessonCanceled(lesson))
    .filter((lesson) => isLessonActive(lesson))
    .sort((a, b) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))[0] ?? null;
}

async function scopedOptions(studentId = ""): Promise<GroupOption[]> {
  const user = await loadCurrentUser();
  if (!user || user.role !== "TEACHER") return [];
  // The QR flow authenticates with the app session cookie. Do not rely on
  // Supabase SSR cookies being present on Safari/Chrome after a QR redirect.
  // Hydrate the tenant snapshot with the server-side client, then scope by the
  // authenticated teacher record and academy.
  await ensureStoreLoaded(user.academy_id);
  setRequestContext(user);
  const admin = isSupabaseConfigured() ? nodeSupabaseClient() : null;
  let teacher = collections().teachers.find(
    (item) => item.academy_id === user.academy_id &&
      (item.profile_id === user.id || item.email.toLowerCase() === user.email.toLowerCase()),
  );
  // The local snapshot can lag behind a newly-created teacher record on mobile.
  if (!teacher && admin) {
    try {
      const result = await withReadTimeout<any>(admin
        .from("teachers")
        .select("id,academy_id,profile_id,email")
        .eq("academy_id", user.academy_id)
        .limit(2000));
      teacher = (result?.data ?? []).find((item: any) =>
        item.profile_id === user.id || String(item.email ?? "").toLowerCase() === user.email.toLowerCase(),
      ) ?? null;
    } catch {
      // Fall back to the hydrated snapshot.
    }
  }
  let enrolledGroupIds: Set<string> | null = null;
  if (studentId) {
    if (admin) {
      try {
        const result = await withReadTimeout<any>(admin
          .from("group_students")
          .select("group_id")
          .eq("student_id", studentId)
          .limit(1000));
        if (result && !result.error) enrolledGroupIds = new Set((result.data ?? []).map((row: any) => row.group_id).filter(Boolean));
      } catch {
        // Use the hydrated membership snapshot if the live read is unavailable.
      }
    }
    if (!enrolledGroupIds) {
      const fallback = new Set(collections().groupStudents.filter((row) => row.student_id === studentId).map((row) => row.group_id));
      if (fallback.size) enrolledGroupIds = fallback;
    }
  }
  let groups: Group[] = teacher
    ? collections().groups.filter(
        (group) => group.academy_id === user.academy_id &&
          (!enrolledGroupIds || enrolledGroupIds.has(group.id)) &&
          (group.teacher_id === teacher.id || collections().groupAssistants.some(
            (assistant) => assistant.teacher_id === teacher.id && assistant.group_id === group.id,
          )),
      )
    : [];
  // Read current assignments too; this removes the stale-group window that was
  // causing the phone flow to show "No active lesson" during a live lesson.
  if (admin && teacher) {
    try {
      const [groupResult, assistantResult] = await Promise.all([
        withReadTimeout<any>(admin.from("groups").select("*").eq("academy_id", user.academy_id).limit(2000)),
        withReadTimeout<any>(admin.from("group_assistants").select("group_id,teacher_id").eq("teacher_id", teacher.id).limit(2000)),
      ]);
      const liveGroups = (groupResult?.data ?? []) as Group[];
      const liveAssistants = (assistantResult?.data ?? []) as { group_id: string; teacher_id: string }[];
      if (!groupResult?.error && liveGroups.length) {
        const assistedIds = new Set(liveAssistants.map((item) => item.group_id));
        groups = liveGroups.filter((group) =>
          (!enrolledGroupIds || enrolledGroupIds.has(group.id)) &&
          (group.teacher_id === teacher!.id || assistedIds.has(group.id)),
        );
      }
    } catch {
      // Keep the hydrated snapshot if live assignment reads are unavailable.
    }
  }
  const groupIds = groups.filter((group) => group.status !== "INACTIVE").map((group) => group.id);
  let lessons = collections().lessons.filter(
    (lesson) => lesson.academy_id === user.academy_id && groupIds.includes(lesson.group_id),
  );
  if (admin && groupIds.length) {
    try {
      const result = await withReadTimeout<any>(admin
        .from("lessons")
        .select("id,academy_id,group_id,teacher_id,date,start_time,end_time,topic,status,is_cancelled")
        .eq("academy_id", user.academy_id)
        .in("group_id", groupIds)
        .limit(5000));
      if (result && !result.error && result.data) lessons = result.data as any[];
    } catch {
      // Use the hydrated lesson snapshot if the live read is unavailable.
    }
  }
  return groups.filter((group) => group.status !== "INACTIVE").map((group) => {
    const lesson = lessons
      .filter((item) => item.group_id === group.id && !isLessonCanceled(item) && isLessonActive(item))
      .sort((a, b) => lessonWallClockMinute(a.date, a.start_time) - lessonWallClockMinute(b.date, b.start_time))[0] ?? null;
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
  const requestedStudentId = req.nextUrl.searchParams.get("studentId") || req.nextUrl.searchParams.get("student") || "";
  const groups = await scopedOptions(requestedStudentId);
  const preferredGroupId = req.cookies.get(GROUP_CONTEXT_COOKIE)?.value ?? null;
  const preferred = preferredGroupId ? groups.find((group) => group.id === preferredGroupId) : undefined;
  const active = groups.find((group) => group.lesson);
  const response = NextResponse.json({
    ok: true,
    role: user.role,
    staffName: user.full_name,
    studentId: requestedStudentId,
    activeLesson: active?.lesson ? { ...active.lesson, groupId: active.id, groupName: active.name } : null,
    preferredGroupId: preferred?.id ?? null,
    groups,
  });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
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

  const groups = await scopedOptions(studentId);
  setRequestContext(user);
  if (requestedGroupId && !groups.some((item) => item.id === requestedGroupId)) {
    return jsonError("GROUP_NOT_ASSIGNED", 403);
  }
  const cookieGroupId = req.cookies.get(GROUP_CONTEXT_COOKIE)?.value ?? "";
  const activeGroup = groups.find((group) => group.lesson);
  // A remembered group is only a preference. It may be stale after the
  // schedule changes, so never let it shadow another group whose lesson is
  // active right now. An explicitly requested group remains authoritative.
  const rememberedGroup = groups.find((item) => item.id === cookieGroupId && item.lesson);
  const group = groups.find((item) => item.id === requestedGroupId)
    ?? rememberedGroup
    ?? (activeGroup?.lesson ? activeGroup : undefined);
  if (!group) return jsonError("NO_ASSIGNED_GROUP", 403);

  const lesson = await activeLessonForGroup(group.id, user.academy_id);
  if (!lesson) return jsonError("NO_ACTIVE_LESSON", 409);

  const duplicate = collections().attendance.some(
    (entry) => entry.lesson_id === lesson.id && entry.student_id === studentId,
  );
  if (duplicate) return jsonError("ATTENDANCE_ALREADY_RECORDED", 409);

  const scannedStudent = collections().students.find(
    (student) => student.id === studentId && student.academy_id === user.academy_id,
  );
  const student = scannedStudent ? { id: scannedStudent.id, name: fullName(scannedStudent) } : null;

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
    student,
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
