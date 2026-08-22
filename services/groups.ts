/**
 * Groups service.
 */
import type { Group, PaginatedResult } from "@/types";
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
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
  let items = teacher
    ? scopedItems.filter((g) => g.teacher_id === teacher.id || scopedAssistants.some((ga: any) => ga.teacher_id === teacher.id && ga.group_id === g.id))
    : teacherProfileId
      ? []
      : applyTeacherGroupScope(scopedItems);
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
    created_at: now,
    updated_at: now,
  };
  collections().groups.push(g);
  await persistInsert("groups", g, academyId);
  return attach(g);
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

export async function deleteGroup(id: string): Promise<boolean> {
  const academyId = currentAcademyId();
  const group = collections().groups.find((g) => g.id === id);
  if (!group) return false;
  if (!academyId || group.academy_id !== academyId) {
    throw new Error("Group is outside the authenticated academy.");
  }
  await persistDelete("groups", { id });
  const before = collections().groups.length;
  collections().groups = collections().groups.filter((g) => g.id !== id);
  collections().groupStudents = collections().groupStudents.filter(
    (gs) => gs.group_id !== id,
  );
  return collections().groups.length < before;
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
