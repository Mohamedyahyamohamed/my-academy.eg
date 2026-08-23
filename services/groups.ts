/**
 * Groups service.
 */
import type { Group, PaginatedResult, SessionUser } from "@/types";
import { collections, invalidateStore } from "./data/store";
import { currentAcademyId, getCurrentUser } from "./session";
import { setRequestContext } from "./request-context";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import {
  getCourse,
  getTeacher,
  lessonsForGroup,
  studentsInGroup,
  byAcademy,
  applyTeacherGroupScope,
  teacherGroupScope,
  fetchTableRLS,
} from "./_shared";
import { percentage } from "@/lib/utils";
import { attendanceForStudent } from "./_shared";
import { canCreate } from "./saas";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { buildRecurringLessonRows } from "@/lib/lesson-generation";

function studentCount(groupId: string) {
  return studentsInGroup(groupId).length;
}

function attach(g: Group): Group {
  return {
    ...g,
    course: getCourse(g.course_id),
    teacher: getTeacher(g.teacher_id),
    student_count: studentCount(g.id),
  };
}

export async function resolveTeacherForGroups(academyId?: string, teacherProfileId?: string, email?: string) {
  if (!academyId || !teacherProfileId) return null;
  const cached = collections().teachers.find(
    (t) => t.academy_id === academyId && (t.profile_id === teacherProfileId || (!!email && t.email?.toLowerCase() === email.toLowerCase())),
  );
  if (cached || !isSupabaseConfigured()) return cached ?? null;

  const admin = nodeSupabaseClient();
  if (!admin) return null;
  const fields = "id, academy_id, profile_id, email, first_name, last_name";
  const { data: byProfile } = await admin.from("teachers").select(fields).eq("academy_id", academyId).eq("profile_id", teacherProfileId).maybeSingle();
  if (byProfile) return byProfile as any;
  if (email) {
    const { data: byEmail } = await admin.from("teachers").select(fields).eq("academy_id", academyId).ilike("email", email).maybeSingle();
    if (byEmail) return byEmail as any;
  }
  return null;
}

export async function listGroups(search = "", academyId?: string, teacherProfileId?: string, teacherEmail?: string): Promise<Group[]> {
  const teacher = teacherProfileId
    ? await resolveTeacherForGroups(academyId, teacherProfileId, teacherEmail ?? collections().profiles.find((p: any) => p.id === teacherProfileId)?.email)
    : null;

  const scopedItems = await fetchTableRLS<Group>("groups", academyId);
  let scopedAssistants: any[] = [];
  if (teacher && isSupabaseConfigured() && academyId && scopedItems.length) {
    try {
      const admin = nodeSupabaseClient();
      const { data } = await admin
        .from("group_assistants")
        .select("group_id, teacher_id, assigned_at")
        .in("group_id", scopedItems.map((g) => g.id));
      scopedAssistants = data ?? [];
    } catch (error) {
      console.error("listGroups assistant scope failed:", (error as Error)?.message);
    }
  }
  if (!scopedAssistants.length && teacher) {
    scopedAssistants = collections().groupAssistants.filter((ga) => ga.teacher_id === teacher.id);
  }
  const activeItems = scopedItems.filter((group) => group.is_active !== false);
  let items = teacher
    ? activeItems.filter((g) => g.teacher_id === teacher.id || scopedAssistants.some((ga: any) => ga.teacher_id === teacher.id && ga.group_id === g.id))
    : teacherProfileId
      ? []
      : applyTeacherGroupScope(activeItems);
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        getCourse(g.course_id)?.name.toLowerCase().includes(q),
    );
  }
  const admin = academyId && isSupabaseConfigured() ? nodeSupabaseClient() : null;
  if (admin && items.length) {
    try {
      const ids = items.map((g) => g.id);
      const [{ data: courses }, { data: teachers }, { data: memberships }] = await Promise.all([
        admin.from("courses").select("id, name, color").eq("academy_id", academyId),
        admin.from("teachers").select("id, first_name, last_name, email").eq("academy_id", academyId),
        admin.from("group_students").select("group_id").in("group_id", ids),
      ]);
      const courseById = new Map<string, any>((courses ?? []).map((c: any) => [c.id, c] as [string, any]));
      const teacherById = new Map<string, any>((teachers ?? []).map((t: any) => [t.id, t] as [string, any]));
      const studentCounts = new Map<string, number>();
      for (const row of memberships ?? []) studentCounts.set(row.group_id, (studentCounts.get(row.group_id) ?? 0) + 1);
      return items.map((g) => ({
        ...attach(g),
        course: getCourse(g.course_id) ?? courseById.get(g.course_id),
        teacher: getTeacher(g.teacher_id) ?? teacherById.get(g.teacher_id),
        student_count: studentCounts.get(g.id) ?? studentCount(g.id),
      }));
    } catch (error) {
      console.error("listGroups relationship enrichment failed:", (error as Error)?.message);
    }
  }
  return items.map(attach);
}

export async function getGroup(id: string, academyIdOverride?: string): Promise<Group | null> {
  const items = await fetchTableRLS<Group>("groups");
  const g = items.find((x) => x.id === id);
  if (g) return attach(g);

  // A teacher can arrive here from a dashboard link while the request-local
  // snapshot is empty on mobile. Resolve only this id through the server-side
  // tenant-scoped client instead of returning a misleading 404.
  if (isSupabaseConfigured()) {
    const academyId = academyIdOverride ?? currentAcademyId();
    const admin = nodeSupabaseClient();
    if (academyId && admin) {
      const { data } = await admin
        .from("groups")
        .select("*")
        .eq("id", id)
        .eq("academy_id", academyId)
        .maybeSingle();
      if (data) return attach(data as Group);
    }
  }
  return null;
}

export interface GroupInput {
  /** Authoritative tenant id supplied by the scoped server action when available. */
  academy_id?: string;
  name: string;
  course_id: string;
  teacher_id: string;
  monthly_fee: number;
  schedule: string;
  room?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

function gid() {
  return crypto.randomUUID();
}

export async function createGroup(input: GroupInput, academyIdOverride?: string): Promise<Group> {
  const academyId = academyIdOverride ?? currentAcademyId();
  if (!academyId) throw new Error("An authenticated academy scope is required.");
  if (input.academy_id && input.academy_id !== academyId) {
    throw new Error("The requested academy is outside the authenticated scope.");
  }
  let course = collections().courses.find((item) => item.id === input.course_id && item.academy_id === academyId);
  let teacher = collections().teachers.find((item) => item.id === input.teacher_id && item.academy_id === academyId);
  // Server Actions run in separate requests. A course created immediately
  // before the group action may be durable in Supabase while the in-memory
  // tenant snapshot is still stale, so validate the IDs live before rejecting.
  const client = isSupabaseConfigured() ? nodeSupabaseClient() : null;
  if ((!course || !teacher) && client) {
    const [{ data: liveCourse, error: courseError }, { data: liveTeacher, error: teacherError }] = await Promise.all([
      client.from("courses").select("id, academy_id, name, description, color, created_at, updated_at").eq("id", input.course_id).eq("academy_id", academyId).maybeSingle(),
      client.from("teachers").select("id, academy_id, profile_id, email, first_name, last_name").eq("id", input.teacher_id).eq("academy_id", academyId).maybeSingle(),
    ]);
    if (courseError) throw new Error(`Could not validate the selected course: ${courseError.message}`);
    if (teacherError) throw new Error(`Could not validate the selected teacher: ${teacherError.message}`);
    if (!course && liveCourse) course = liveCourse as any;
    if (!teacher && liveTeacher) teacher = liveTeacher as any;
  }
  if (!course) throw new Error("The selected course was not found inside the authenticated academy.");
  if (!teacher) throw new Error("The selected teacher was not found inside the authenticated academy.");
  const check = canCreate("groups", academyId);
  if (!check.allowed) {
    throw new Error(`Limit reached: ${check.current}/${check.limit} groups. Upgrade your plan.`);
  }
  const now = new Date().toISOString();
  const g: Group = {
    id: gid(),
    academy_id: academyId,
    name: input.name,
    course_id: input.course_id,
    teacher_id: input.teacher_id,
    monthly_fee: Math.max(0, input.monthly_fee),
    schedule: input.schedule,
    room: input.room ?? null,
    status: input.status ?? "ACTIVE",
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  // Persist first. The local snapshot is updated only after the durable write
  // succeeds, preventing a failed insert from leaving a ghost group in memory.
  await persistInsert("groups", g, academyId);
  collections().groups.push(g);
  return attach(g);
}

export async function createGroupWithLessons(
  input: GroupInput,
  academyIdOverride: string | undefined,
  actorId: string,
  weeks = 12,
): Promise<{ group: Group; lessonCount: number }> {
  const academyId = academyIdOverride ?? currentAcademyId();
  if (!academyId) throw new Error("An authenticated academy scope is required.");
  if (input.academy_id && input.academy_id !== academyId) {
    throw new Error("The requested academy is outside the authenticated scope.");
  }

  let course = collections().courses.find((item) => item.id === input.course_id && item.academy_id === academyId);
  let teacher = collections().teachers.find((item) => item.id === input.teacher_id && item.academy_id === academyId);
  const client = isSupabaseConfigured() ? nodeSupabaseClient() : null;
  if ((!course || !teacher) && client) {
    const [{ data: liveCourse, error: courseError }, { data: liveTeacher, error: teacherError }] = await Promise.all([
      client.from("courses").select("id, academy_id, name, description, color, created_at, updated_at").eq("id", input.course_id).eq("academy_id", academyId).maybeSingle(),
      client.from("teachers").select("id, academy_id, profile_id, email, first_name, last_name").eq("id", input.teacher_id).eq("academy_id", academyId).maybeSingle(),
    ]);
    if (courseError) throw new Error(`Could not validate the selected course: ${courseError.message}`);
    if (teacherError) throw new Error(`Could not validate the selected teacher: ${teacherError.message}`);
    if (!course && liveCourse) course = liveCourse as any;
    if (!teacher && liveTeacher) teacher = liveTeacher as any;
  }
  if (!course) throw new Error("The selected course was not found inside the authenticated academy.");
  if (!teacher) throw new Error("The selected teacher was not found inside the authenticated academy.");
  const check = canCreate("groups", academyId);
  if (!check.allowed) throw new Error(`Limit reached: ${check.current}/${check.limit} groups. Upgrade your plan.`);

  const now = new Date().toISOString();
  const group: Group = {
    id: gid(),
    academy_id: academyId,
    name: input.name.trim(),
    course_id: input.course_id,
    teacher_id: input.teacher_id,
    monthly_fee: Math.max(0, input.monthly_fee),
    schedule: input.schedule,
    room: input.room ?? null,
    status: input.status ?? "ACTIVE",
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  const lessonRows = buildRecurringLessonRows(group, academyId, weeks);

  if (client) {
    const { error } = await client.rpc("create_group_with_lessons", {
      p_group_id: group.id,
      p_academy_id: academyId,
      p_actor_id: actorId,
      p_name: group.name,
      p_course_id: group.course_id,
      p_teacher_id: group.teacher_id,
      p_monthly_fee: group.monthly_fee,
      p_schedule: group.schedule,
      p_room: group.room,
      p_status: group.status,
      p_lessons: lessonRows,
    });
    if (error) throw new Error(`Could not create group and lessons atomically: ${error.message}`);
  } else if (isSupabaseConfigured()) {
    throw new Error("Database create is not configured for groups.");
  } else {
    await persistInsert("groups", group, academyId);
    try {
      if (lessonRows.length) await persistInsert("lessons", lessonRows, academyId);
    } catch (error) {
      collections().groups = collections().groups.filter((row) => row.id !== group.id);
      throw error;
    }
  }

  collections().groups.push(group);
  collections().lessons.push(...lessonRows);
  invalidateStore(academyId);
  return { group: attach(group), lessonCount: lessonRows.length };
}

export async function updateGroup(id: string, input: Partial<GroupInput>): Promise<Group | null> {
  const g = collections().groups.find((x) => x.id === id);
  if (!g) return null;
  const academyId = currentAcademyId();
  if (!academyId || g.academy_id !== academyId) {
    throw new Error("Group is outside the authenticated academy.");
  }
  if (input.academy_id && input.academy_id !== academyId) {
    throw new Error("The requested academy is outside the authenticated scope.");
  }
  const updatedAt = new Date().toISOString();
  const next = {
    ...input,
    academy_id: academyId,
    monthly_fee:
      input.monthly_fee !== undefined ? Math.max(0, input.monthly_fee) : g.monthly_fee,
    updated_at: updatedAt,
  };
  const { academy_id: _academyId, ...patch } = next;
  await persistUpdate("groups", id, patch);
  Object.assign(g, next);
  return attach(g);
}

export type GroupDeleteResult = {
  ok: true;
  mode: "hard_deleted" | "archived";
  relationCount: number;
};

/**
 * Permanently delete a group and every group-owned child row.
 *
 * Production uses one SECURITY DEFINER PostgreSQL function so all deletes run
 * in one transaction. The service still validates the current academy and the
 * teacher's assigned-group scope before calling it. Students are never deleted;
 * only group_students membership rows are removed.
 */
function collectLocalGroupRelationIds(id: string) {
  const local = collections();
  const lessonIds = new Set(local.lessons.filter((row) => row.group_id === id).map((row) => row.id));
  const homeworkIds = new Set(local.homework.filter((row) => row.group_id === id).map((row) => row.id));
  const examIds = new Set(local.exams.filter((row) => row.group_id === id).map((row) => row.id));
  const paymentIds = new Set(local.payments.filter((row) => row.group_id === id).map((row) => row.id));
  const contentCourseIds = new Set(local.contentCourses.filter((row) => row.group_id === id).map((row) => row.id));
  const contentLessonIds = new Set(local.contentLessons.filter((row) => contentCourseIds.has(row.course_id)).map((row) => row.id));
  return { lessonIds, homeworkIds, examIds, paymentIds, contentCourseIds, contentLessonIds };
}

function removeLocalGroupCascade(id: string, relationIds: ReturnType<typeof collectLocalGroupRelationIds>) {
  const local = collections();
  local.attendance = local.attendance.filter((row) => !relationIds.lessonIds.has(row.lesson_id));
  local.transactions = local.transactions.filter((row) => !relationIds.paymentIds.has(row.payment_id));
  local.grades = local.grades.filter((row) => !relationIds.examIds.has(row.exam_id));
  local.submissions = local.submissions.filter((row) => !relationIds.homeworkIds.has(row.homework_id));
  local.contentProgress = local.contentProgress.filter((row) => !relationIds.contentLessonIds.has(row.lesson_id));
  local.contentFiles = local.contentFiles.filter((row) => !relationIds.contentCourseIds.has(row.course_id) && (row.lesson_id == null || !relationIds.contentLessonIds.has(row.lesson_id)));
  local.contentLessons = local.contentLessons.filter((row) => !relationIds.contentLessonIds.has(row.id));
  local.contentCourses = local.contentCourses.filter((row) => !relationIds.contentCourseIds.has(row.id));
  local.homework = local.homework.filter((row) => !relationIds.homeworkIds.has(row.id));
  local.exams = local.exams.filter((row) => !relationIds.examIds.has(row.id));
  local.payments = local.payments.filter((row) => !relationIds.paymentIds.has(row.id));
  local.groupAssistants = local.groupAssistants.filter((row) => row.group_id !== id);
  local.groupStudents = local.groupStudents.filter((row) => row.group_id !== id);
  local.lessons = local.lessons.filter((row) => !relationIds.lessonIds.has(row.id));
  local.groups = local.groups.filter((row) => row.id !== id);
}

export async function deleteGroup(
  id: string,
  authenticatedAcademyId?: string,
  authenticatedUser?: SessionUser,
): Promise<GroupDeleteResult> {
  // The action has already authenticated and hydrated this actor. Prefer that
  // explicit value over AsyncLocalStorage, which can be lost across an awaited
  // store hydration in Next.js Server Actions. Re-bind it before any helper
  // (teacherGroupScope, collections, or persist guards) reads request context.
  const user = authenticatedUser ?? getCurrentUser();
  const academyId = authenticatedAcademyId ?? user?.academy_id ?? null;
  if (!academyId || !user || user.academy_id !== academyId) {
    throw new Error("Missing authenticated academy context.");
  }
  setRequestContext(user);

  const client = isSupabaseConfigured() ? nodeSupabaseClient() : null;
  let group = collections().groups.find((g) => g.id === id && g.academy_id === academyId);
  const localOrphan = collections().groups.find((g: any) => g.id === id && g.academy_id == null) as Group | undefined;

  // Legacy cleanup is deliberately narrower than ordinary deletion. We fetch
  // the candidate by id with the server client, then let the service-role-only
  // RPC verify: null academy_id, zero memberships, and actor/teacher academy.
  if (!group && client) {
    const { data: candidate, error: candidateError } = await client
      .from("groups")
      .select("id, academy_id, teacher_id")
      .eq("id", id)
      .maybeSingle();
    if (candidateError) throw new Error(`Could not inspect group: ${candidateError.message}`);
    if (candidate?.academy_id == null) {
      const { data, error } = await client.rpc("delete_orphan_group_cascade", {
        p_group_id: id,
        p_academy_id: academyId,
        p_actor_id: user.id,
      });
      if (error) throw new Error(`Could not clean up orphan group: ${error.message}`);
      const result = Array.isArray(data) ? data[0] : data;
      const relationIds = collectLocalGroupRelationIds(id);
      removeLocalGroupCascade(id, relationIds);
      invalidateStore(academyId);
      return {
        ok: true,
        mode: "hard_deleted",
        relationCount: Number(result?.deleted_attendance ?? 0) + Number(result?.deleted_lessons ?? 0),
      };
    }
    if (candidate && candidate.academy_id !== academyId) {
      throw new Error("Group is outside the authenticated academy.");
    }
    group = candidate as Group | undefined;
  }

  if (!group && localOrphan && !isSupabaseConfigured()) {
    if (collections().groupStudents.some((row) => row.group_id === id)) {
      throw new Error("The orphan group has students and cannot be force-cleaned.");
    }
    const owner = collections().teachers.find((teacher) =>
      teacher.id === localOrphan.teacher_id
      && teacher.academy_id === academyId
      && (user.role === "ADMIN" || teacher.profile_id === user.id),
    );
    if (!owner) throw new Error("Group is outside the authenticated academy.");
    const relationIds = collectLocalGroupRelationIds(id);
    const relationCount = relationIds.lessonIds.size + relationIds.homeworkIds.size + relationIds.examIds.size + relationIds.paymentIds.size;
    removeLocalGroupCascade(id, relationIds);
    invalidateStore(academyId);
    return { ok: true, mode: "hard_deleted", relationCount };
  }

  if (!group || group.academy_id !== academyId) {
    throw new Error("Group is outside the authenticated academy.");
  }
  const scope = teacherGroupScope();
  if (scope && !scope.has(id)) {
    const owner = collections().teachers.find((teacher) =>
      teacher.id === group?.teacher_id
      && teacher.academy_id === academyId
      && (user.role === "ADMIN" || teacher.profile_id === user.id),
    );
    if (!owner) throw new Error("Teachers can only manage their assigned groups.");
  }

  const [memberships, lessons, attendance, payments, transactions, exams, grades, homework, submissions, assistants, contentCourses, contentLessons, contentFiles, contentProgress] = await Promise.all([
    fetchTableRLS<any>("group_students", academyId),
    fetchTableRLS<any>("lessons", academyId),
    fetchTableRLS<any>("attendance", academyId),
    fetchTableRLS<any>("payments", academyId),
    fetchTableRLS<any>("payment_transactions", academyId),
    fetchTableRLS<any>("exams", academyId),
    fetchTableRLS<any>("grades", academyId),
    fetchTableRLS<any>("homework", academyId),
    fetchTableRLS<any>("homework_submissions", academyId),
    fetchTableRLS<any>("group_assistants", academyId),
    fetchTableRLS<any>("content_courses", academyId),
    fetchTableRLS<any>("content_lessons", academyId),
    fetchTableRLS<any>("content_files", academyId),
    fetchTableRLS<any>("content_progress", academyId),
  ]);

  const lessonIds = new Set(lessons.filter((row) => row.group_id === id).map((row) => row.id));
  const homeworkIds = new Set(homework.filter((row) => row.group_id === id).map((row) => row.id));
  const examIds = new Set(exams.filter((row) => row.group_id === id).map((row) => row.id));
  const paymentIds = new Set(payments.filter((row) => row.group_id === id).map((row) => row.id));
  const contentCourseIds = new Set(contentCourses.filter((row) => row.group_id === id).map((row) => row.id));
  const contentLessonIds = new Set(contentLessons.filter((row) => contentCourseIds.has(row.course_id)).map((row) => row.id));
  const relationCount = [
    memberships.filter((row) => row.group_id === id).length,
    lessons.filter((row) => row.group_id === id).length,
    attendance.filter((row) => lessonIds.has(row.lesson_id)).length,
    payments.filter((row) => row.group_id === id).length,
    transactions.filter((row) => paymentIds.has(row.payment_id)).length,
    exams.filter((row) => row.group_id === id).length,
    grades.filter((row) => examIds.has(row.exam_id)).length,
    homework.filter((row) => row.group_id === id).length,
    submissions.filter((row) => homeworkIds.has(row.homework_id)).length,
    assistants.filter((row) => row.group_id === id).length,
    contentCourses.filter((row) => row.group_id === id).length,
    contentLessons.filter((row) => contentCourseIds.has(row.course_id)).length,
    contentFiles.filter((row) => contentCourseIds.has(row.course_id) || contentLessonIds.has(row.lesson_id)).length,
    contentProgress.filter((row) => contentLessonIds.has(row.lesson_id)).length,
  ].reduce((sum, count) => sum + count, 0);

  if (client) {
    const { error } = await client.rpc("delete_group_cascade", {
      p_group_id: id,
      p_academy_id: academyId,
    });
    if (error) throw new Error(`Could not cascade-delete group: ${error.message}`);
  } else if (isSupabaseConfigured()) {
    throw new Error("Database delete is not configured for groups.");
  }

  removeLocalGroupCascade(id, { lessonIds, homeworkIds, examIds, paymentIds, contentCourseIds, contentLessonIds });
  invalidateStore(academyId);

  return { ok: true, mode: "hard_deleted", relationCount };
}

async function verifyGroupStudentScope(groupId: string, studentId: string): Promise<boolean> {
  const academyId = currentAcademyId();
  if (!academyId) return false;

  if (!isSupabaseConfigured()) {
    return collections().groups.some((group) => group.id === groupId && group.academy_id === academyId)
      && collections().students.some((student) => student.id === studentId && student.academy_id === academyId);
  }

  const client = nodeSupabaseClient();
  if (!client) return false;
  const [{ data: group, error: groupError }, { data: student, error: studentError }] = await Promise.all([
    client.from("groups").select("id").eq("id", groupId).eq("academy_id", academyId).maybeSingle(),
    client.from("students").select("id").eq("id", studentId).eq("academy_id", academyId).maybeSingle(),
  ]);
  if (groupError || studentError) {
    console.error("group membership scope check failed", {
      group: groupError?.message,
      student: studentError?.message,
    });
    return false;
  }
  return Boolean(group && student);
}

export async function addStudent(
  groupId: string,
  studentId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!(await verifyGroupStudentScope(groupId, studentId))) {
    return { ok: false, error: "المجموعة أو الطالب خارج نطاق الأكاديمية الحالية." };
  }
  const exists = collections().groupStudents.some(
    (gs) => gs.group_id === groupId && gs.student_id === studentId,
  );
  if (exists) return { ok: false, error: "الطالب في الجروب ده بالفعل." };
  const now = new Date().toISOString();
  const row = {
    group_id: groupId,
    student_id: studentId,
    joined_at: now,
  };
  collections().groupStudents.push(row as any);
  try {
    const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
    const client = nodeSupabaseClient();
    if (client) {
      // insert مباشر (مش upsert) — upsert كان بيتلخبط على group_students
      const r = await client.from("group_students").insert(row);
      if (r.error) return { ok: false, error: r.error.message };
    }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "خطأ غير متوقع" };
  }
  return { ok: true };
}

export type StudentGroupTransferResult =
  | { ok: true; fromGroupId: string; toGroupId: string }
  | { ok: false; code: string; field: string; message: string; details?: string };

/** Replace one student-group membership without creating a second student record. */
export async function transferStudentGroup(
  studentId: string,
  fromGroupId: string,
  toGroupId: string,
): Promise<StudentGroupTransferResult> {
  const academyId = currentAcademyId();
  if (!academyId) {
    return { ok: false, code: "ACADEMY_CONTEXT_MISSING", field: "academy", message: "لا توجد أكاديمية حالية مرتبطة بالجلسة." };
  }
  if (fromGroupId === toGroupId) {
    return { ok: false, code: "SAME_GROUP", field: "toGroupId", message: "المجموعة الجديدة هي نفس المجموعة الحالية.", details: "اختر مجموعة مختلفة لنقل الطالب." };
  }

  const student = collections().students.find((item) => item.id === studentId && item.academy_id === academyId);
  if (!student) {
    return { ok: false, code: "STUDENT_NOT_FOUND", field: "studentId", message: "الطالب غير موجود داخل الأكاديمية الحالية.", details: "لا يمكن نقل طالب من أكاديمية أخرى." };
  }
  const fromGroup = collections().groups.find((item) => item.id === fromGroupId && item.academy_id === academyId);
  if (!fromGroup) {
    return { ok: false, code: "SOURCE_GROUP_NOT_FOUND", field: "fromGroupId", message: "المجموعة الحالية غير موجودة داخل الأكاديمية.", details: "حدّث الصفحة واختر المجموعة الحالية من جديد." };
  }
  const toGroup = collections().groups.find((item) => item.id === toGroupId && item.academy_id === academyId);
  if (!toGroup) {
    return { ok: false, code: "TARGET_GROUP_NOT_FOUND", field: "toGroupId", message: "المجموعة الجديدة غير موجودة داخل الأكاديمية.", details: "اختر مجموعة متاحة من القائمة فقط." };
  }

  const scope = teacherGroupScope();
  if (scope && (!scope.has(fromGroup.id) || !scope.has(toGroup.id))) {
    return { ok: false, code: "GROUP_NOT_ASSIGNED", field: "toGroupId", message: "لا تملك صلاحية النقل إلى إحدى المجموعتين المحددتين.", details: "يجب أن تكون المجموعتان ضمن مجموعاتك المسموح بها." };
  }

  const currentMembership = collections().groupStudents.find(
    (membership) => membership.group_id === fromGroup.id && membership.student_id === student.id,
  );
  if (!currentMembership) {
    return { ok: false, code: "SOURCE_MEMBERSHIP_NOT_FOUND", field: "fromGroupId", message: "الطالب غير مسجل في المجموعة الحالية.", details: "راجع عضوية الطالب ثم حاول النقل مرة أخرى." };
  }
  const targetMembership = collections().groupStudents.some(
    (membership) => membership.group_id === toGroup.id && membership.student_id === student.id,
  );
  if (targetMembership) {
    return { ok: false, code: "TARGET_MEMBERSHIP_EXISTS", field: "toGroupId", message: "الطالب مسجل بالفعل في المجموعة الجديدة.", details: "لم يتم إنشاء عضوية مكررة أو حذف المجموعة الحالية." };
  }

  const nextMembership = { group_id: toGroup.id, student_id: student.id, joined_at: new Date().toISOString() };
  try {
    // Add first, then remove the old membership. If removal fails, delete the
    // new row so a failed transfer cannot leave two memberships behind.
    await persistInsert("group_students", nextMembership);
    try {
      await persistDelete("group_students", { group_id: fromGroup.id, student_id: student.id });
    } catch (removeError) {
      try {
        await persistDelete("group_students", { group_id: toGroup.id, student_id: student.id });
      } catch (rollbackError) {
        console.error("student group transfer rollback failed", rollbackError);
      }
      throw new Error(`TRANSFER_REMOVE_FAILED: ${(removeError as Error)?.message ?? "تعذر حذف العضوية القديمة."}`);
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : "تعذر نقل الطالب.";
    const message = raw.includes("TRANSFER_REMOVE_FAILED")
      ? "تم إيقاف النقل لأن حذف العضوية القديمة فشل، ولم يتم اعتماد المجموعة الجديدة."
      : raw.includes("scope") || raw.includes("academy")
        ? "تم رفض النقل لأن إحدى المجموعتين خارج نطاق الأكاديمية الحالية."
        : "تعذر حفظ نقل الطالب في قاعدة البيانات.";
    return { ok: false, code: "GROUP_TRANSFER_FAILED", field: raw.includes("REMOVE") ? "fromGroupId" : "transfer", message, details: raw };
  }

  collections().groupStudents = collections().groupStudents.filter(
    (membership) => !(membership.group_id === fromGroup.id && membership.student_id === student.id),
  );
  collections().groupStudents.push(nextMembership as any);
  return { ok: true, fromGroupId: fromGroup.id, toGroupId: toGroup.id };
}

export async function removeStudent(groupId: string, studentId: string): Promise<boolean> {
  if (!(await verifyGroupStudentScope(groupId, studentId))) return false;
  const before = collections().groupStudents.length;
  collections().groupStudents = collections().groupStudents.filter(
    (gs) => !(gs.group_id === groupId && gs.student_id === studentId),
  );
  await persistDelete("group_students", { group_id: groupId, student_id: studentId });
  return collections().groupStudents.length < before;
}

export interface GroupDetail extends Group {
  students: ReturnType<typeof studentsInGroup>;
  lessons: ReturnType<typeof lessonsForGroup>;
  attendanceRate: number;
}

export async function getGroupDetail(id: string, academyIdOverride?: string): Promise<GroupDetail | null> {
  const g = await getGroup(id, academyIdOverride);
  if (!g) return null;
  // Teachers can only access their own groups.
  const scope = teacherGroupScope();
  // If the request snapshot has no local groups, getGroup() may have safely
  // resolved this tenant-scoped record through the server fallback above.
  // Do not turn that valid record into a 404 solely because the local scope
  // set was empty during mobile hydration.
  if (scope && scope.size > 0 && !scope.has(id)) return null;
  let students = studentsInGroup(id);
  let lessons = lessonsForGroup(id);
  let attendanceRows = collections().attendance;

  // The mobile/server-component path can have an empty local snapshot even
  // after the group row itself was resolved. Hydrate only this tenant-scoped
  // group through the server client so the detail page never renders a false
  // empty state or 404-like result.
  if (isSupabaseConfigured() && (!students.length || !lessons.length)) {
    const academyId = academyIdOverride ?? currentAcademyId();
    const admin = nodeSupabaseClient();
    if (admin && academyId) {
      const [{ data: memberships }, { data: lessonRows }] = await Promise.all([
        admin.from("group_students").select("student_id").eq("group_id", id),
        admin.from("lessons").select("*").eq("group_id", id).eq("academy_id", academyId),
      ]);
      const studentIds = (memberships ?? []).map((row: any) => row.student_id).filter(Boolean);
      if (studentIds.length) {
        const { data: studentRows } = await admin.from("students").select("*").in("id", studentIds).eq("academy_id", academyId);
        students = (studentRows ?? []) as any;
      }
      if (lessonRows?.length) lessons = lessonRows as any;
      if (lessons.length) {
        const { data: attendanceRowsFromDb } = await admin.from("attendance").select("*").in("lesson_id", lessons.map((l: any) => l.id)).eq("academy_id", academyId);
        attendanceRows = (attendanceRowsFromDb ?? []) as any;
      }
    }
  }

  // attendance rate across the group
  const att = attendanceRows.filter((a) => lessons.some((l) => l.id === a.lesson_id));
  const present = att.filter((a) => a.status !== "ABSENT").length;
  const rate = att.length ? percentage(present, att.length) : 0;
  return { ...g, students, lessons, attendanceRate: rate };
}

/** Average grade for a group across its exams. */
export function groupAverageGrade(groupId: string): number {
  const examIds = collections()
    .exams.filter((e) => e.group_id === groupId)
    .map((e) => e.id);
  const grades = collections().grades.filter((g) =>
    examIds.includes(g.exam_id),
  );
  if (!grades.length) return 0;
  const exams = collections().exams;
  let sumPct = 0;
  for (const grade of grades) {
    const exam = exams.find((e) => e.id === grade.exam_id);
    if (exam) sumPct += (grade.score / exam.max_score) * 100;
  }
  return Math.round(sumPct / grades.length);
}
