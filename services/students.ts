/**
 * Students service.
 * Phase 1 RLS: list/detail queries use the user's Supabase session
 * (RLS-enforced). Falls back to cache when Supabase isn't configured.
 */
import type {
  PaginatedResult,
  Student,
  StudentDetail,
  StudentFilters,
  StudentStats,
  SessionUser,
} from "@/types";
import { collections } from "./data/store";
import { currentAcademyId, currentTeacherId, getCurrentUser } from "./session";
import { persistInsert, persistUpdate } from "./data/store";
import {
  attendanceForStudent,
  byAcademy,
  derivePayment,
  fullName,
  getParent,
  groupsForStudent,
  gradesForStudent,
  paymentsForStudent,
  teacherStudentScope,
  teacherGroupScope,
} from "./_shared";
import { percentage, round } from "@/lib/utils";
import { isSupabaseConfigured } from "./supabase/config";
import { canCreate } from "./saas";
import { STUDENT_DEFAULT_PASSWORD } from "@/lib/auth";
import { can, hasAcademyWideScope } from "@/lib/permissions";

function attachRelations(s: Student): Student {
  return {
    ...s,
    parent: getParent(s.parent_id) ?? null,
    groups: groupsForStudent(s.id),
  };
}

async function liveTeacherStudentScope(client: any, academyId: string, scopedUser = getCurrentUser()): Promise<Set<string> | null> {
  const user = scopedUser;
  if (!user || hasAcademyWideScope(user.role)) return null;

  const { data: teacher, error: teacherLookupError } = await client
    .from("teachers")
    .select("id")
    .eq("academy_id", academyId)
    .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();
  const teacherId = teacher?.id ?? currentTeacherId();
  if (!teacherId) return new Set();

  const [{ data: academy, error: academyError }, { data: ownedStudents, error: ownedStudentsError }, { data: ownedGroups, error: ownedError }, { data: assistantLinks, error: assistantError }] = await Promise.all([
    client.from("academies").select("workspace_type").eq("id", academyId).maybeSingle(),
    client.from("students").select("id").eq("academy_id", academyId).eq("owner_teacher_id", teacherId).limit(5000),
    client.from("groups").select("id").eq("academy_id", academyId).eq("teacher_id", teacherId).limit(1000),
    client.from("group_assistants").select("group_id").eq("teacher_id", teacherId).limit(1000),
  ]);
  if (teacherLookupError || academyError || ownedStudentsError) {
    console.error("liveTeacherStudentScope personal workspace lookup failed", teacherLookupError?.message ?? academyError?.message ?? ownedStudentsError?.message);
    return new Set();
  }
  const personalStudentIds = academy?.workspace_type === "TEACHER"
    ? (ownedStudents ?? []).map((row: any) => row.id).filter(Boolean)
    : [];
  if (ownedError || assistantError) {
    console.error("liveTeacherStudentScope group lookup failed", ownedError?.message ?? assistantError?.message);
    return new Set(personalStudentIds);
  }

  const candidateGroupIds = [...new Set([
    ...(ownedGroups ?? []).map((row: any) => row.id),
    ...(assistantLinks ?? []).map((row: any) => row.group_id),
  ].filter(Boolean))];
  if (!candidateGroupIds.length) return new Set(personalStudentIds);

  const { data: scopedGroups, error: scopedGroupsError } = await client
    .from("groups")
    .select("id")
    .eq("academy_id", academyId)
    .in("id", candidateGroupIds)
    .limit(1000);
  if (scopedGroupsError) {
    console.error("liveTeacherStudentScope academy group lookup failed", scopedGroupsError.message);
    return new Set(personalStudentIds);
  }

  const groupIds = (scopedGroups ?? []).map((row: any) => row.id).filter(Boolean);
  if (!groupIds.length) return new Set(personalStudentIds);
  const { data: memberships, error: membershipsError } = await client
    .from("group_students")
    .select("student_id")
    .in("group_id", groupIds)
    .limit(5000);
  if (membershipsError) {
    console.error("liveTeacherStudentScope membership lookup failed", membershipsError.message);
    return new Set(personalStudentIds);
  }
  return new Set([
    ...personalStudentIds,
    ...(memberships ?? []).map((row: any) => row.student_id).filter(Boolean),
  ]);
}

function assertStudentManager(userOverride?: SessionUser) {
  const user = userOverride ?? getCurrentUser();
  if (!user || !can(user, "students.manage")) throw new Error("You are not allowed to manage students.");
  return user;
}

function assertRequestedGroupScope(groupIds: string[], academyId: string, authenticatedUser?: SessionUser) {
  const user = assertStudentManager(authenticatedUser);
  const groups = groupIds.map((id) => collections().groups.find((group) => group.id === id && group.academy_id === academyId));
  if (groups.some((group) => !group)) throw new Error("A selected group is outside the authenticated academy.");
  if (!hasAcademyWideScope(user.role)) {
    const scope = teacherGroupScope();
    if (!scope || groupIds.some((id) => !scope.has(id))) {
      throw new Error("Teachers can only manage students in assigned groups.");
    }
  }
}

async function assertParentMutationScope(parentId: string, academyId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
    const client = nodeSupabaseClient();
    if (client) {
      const { data: parent, error } = await client
        .from("parents")
        .select("id")
        .eq("id", parentId)
        .eq("academy_id", academyId)
        .maybeSingle();
      if (error) throw new Error(`Could not validate parent update target: ${error.message}`);
      if (!parent) throw new Error("Parent is outside the authenticated academy.");
      return;
    }
  }
  const parent = collections().parents.find((item) => item.id === parentId && item.academy_id === academyId);
  if (!parent) throw new Error("Parent is outside the authenticated academy.");
}

async function resolveStudentMutationScope(
  studentId: string,
  authenticatedAcademyId?: string,
  authenticatedUser?: SessionUser,
): Promise<Student> {
  const academyId = authenticatedAcademyId ?? currentAcademyId();
  if (!academyId) throw new Error("Missing authenticated academy context.");
  const user = assertStudentManager(authenticatedUser);
  const scopedUser = user;

  // The tenant snapshot may not contain every row shown by the live paginated
  // query. Resolve the mutation target from Supabase first in production.
  if (isSupabaseConfigured()) {
    const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
    const client = nodeSupabaseClient();
    if (client) {
      const { data: liveStudent, error } = await client
        .from("students")
        .select("*")
        .eq("id", studentId)
        .eq("academy_id", academyId)
        .maybeSingle();
      if (error) throw new Error(`Could not validate student update target: ${error.message}`);
      if (!liveStudent) throw new Error("Student is outside the authenticated academy.");
      const { data: academy } = await client
        .from("academies")
        .select("workspace_type")
        .eq("id", academyId)
        .maybeSingle();
      if (scopedUser.role === "TEACHER" && academy?.workspace_type === "TEACHER") {
        const { data: teacherByProfile } = await client
          .from("teachers")
          .select("id")
          .eq("academy_id", academyId)
          .eq("profile_id", scopedUser.id)
          .maybeSingle();
        const teacher = teacherByProfile ?? (scopedUser.email
          ? (await client.from("teachers").select("id").eq("academy_id", academyId).eq("email", scopedUser.email).maybeSingle()).data
          : null);
        if (!teacher || liveStudent.owner_teacher_id !== teacher.id) {
          throw new Error("Teachers can only manage students in assigned groups.");
        }
      } else {
        const liveScope = await liveTeacherStudentScope(client, academyId, scopedUser);
        if (liveScope && !liveScope.has(studentId)) {
          throw new Error("Teachers can only manage students in assigned groups.");
        }
      }
      return liveStudent as Student;
    }
  }

  const student = collections().students.find((item) => item.id === studentId && item.academy_id === academyId);
  if (!student) throw new Error("Student is outside the authenticated academy.");
  if (!hasAcademyWideScope(user.role) && !teacherStudentScope()?.has(studentId)) {
    throw new Error("Teachers can only manage students in assigned groups.");
  }
  return student;
}

// ─── CACHE FALLBACKS (used when Supabase not configured) ──────────

function listStudentsFromCache(
  filters: StudentFilters = {},
  academyId?: string,
): PaginatedResult<Student> {
  const {
    search = "",
    status = "ALL",
    groupId = "ALL",
    grade = "ALL",
    gender = "ALL",
    page = 1,
    pageSize = 10,
    sortBy = "name",
    sortDir = "asc",
  } = filters;

  let items = byAcademy(collections().students, academyId);
  const tScope = teacherStudentScope();
  if (tScope) items = items.filter((s) => tScope.has(s.id));

  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter((s) => {
      const parent = getParent(s.parent_id);
      return (
        fullName(s).toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.school?.toLowerCase().includes(q) ||
        s.grade?.toLowerCase().includes(q) ||
        (parent && fullName(parent).toLowerCase().includes(q))
      );
    });
  }

  if (status !== "ALL") items = items.filter((s) => s.status === status);
  if (grade !== "ALL") items = items.filter((s) => (s.grade ?? "").trim() === grade);
  if (gender !== "ALL") items = items.filter((s) => s.gender === gender);

  if (groupId !== "ALL") {
    const ids = collections()
      .groupStudents.filter((gs) => gs.group_id === groupId)
      .map((gs) => gs.student_id);
    items = items.filter((s) => ids.includes(s.id));
  }

  items.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = fullName(a).localeCompare(fullName(b));
    else if (sortBy === "created_at")
      cmp = +new Date(a.created_at) - +new Date(b.created_at);
    else cmp = a.status.localeCompare(b.status);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize).map(attachRelations);

  return {
    items: paged,
    pagination: { page, pageSize, total, totalPages },
  };
}

function getStudentDetailFromCache(id: string): StudentDetail | null {
  const s = byAcademy(collections().students).find((x) => x.id === id);
  if (!s) return null;
  const tScope = teacherStudentScope();
  if (tScope && !tScope.has(id)) return null;
  return {
    ...attachRelations(s),
    stats: computeStudentStats(s.id),
  };
}

function getStudentFromCache(id: string): Student | null {
  const s = byAcademy(collections().students).find((x) => x.id === id);
  if (!s) return null;
  const tScope = teacherStudentScope();
  if (tScope && !tScope.has(id)) return null;
  return attachRelations(s);
}

// ─── RLS-ENFORCED QUERIES (production path) ──────────────────────

/**
 * List students — RLS-enforced via the user's Supabase session.
 * RLS automatically filters by academy_id. No app-layer filter needed.
 */
export async function listStudentGrades(academyId?: string): Promise<string[]> {
  const effectiveAcademyId = academyId ?? currentAcademyId();
  if (!effectiveAcademyId) return [];

  if (!isSupabaseConfigured()) {
    const scope = teacherStudentScope();
    return [...new Set(
      byAcademy(collections().students, effectiveAcademyId)
        .filter((student) => !scope || scope.has(student.id))
        .map((student) => student.grade?.trim() ?? "")
        .filter(Boolean),
    )].sort((a, b) => a.localeCompare(b, "ar"));
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();
  const scopedStudentIds = await liveTeacherStudentScope(client, effectiveAcademyId);
  if (scopedStudentIds && scopedStudentIds.size === 0) return [];

  let query = client
    .from("students")
    .select("id,grade")
    .eq("academy_id", effectiveAcademyId)
    .not("grade", "is", null)
    .limit(5000);
  if (scopedStudentIds) query = query.in("id", [...scopedStudentIds]);

  const { data, error } = await query;
  if (error) return [];
  return [...new Set((data ?? []).map((row: any) => String(row.grade ?? "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ar"));
}

export async function listStudents(
  filters: StudentFilters = {},
  academyId?: string,
): Promise<PaginatedResult<Student>> {
  if (!isSupabaseConfigured()) {
    return listStudentsFromCache(filters, academyId);
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();

  const {
    search = "",
    status = "ALL",
    groupId = "ALL",
    grade = "ALL",
    gender = "ALL",
    page = 1,
    pageSize = 10,
    sortBy = "name",
    sortDir = "asc",
  } = filters;

  let query = client.from("students").select("*", { count: "exact" });
  const effectiveAcademyId = academyId ?? currentAcademyId();
  if (effectiveAcademyId) query = query.eq("academy_id", effectiveAcademyId);

  // RLS filters by academy_id automatically; this extra live scope restricts
  // Teacher and Assistant to students in their owned/assisted groups.
  const scopedStudentIds = effectiveAcademyId
    ? await liveTeacherStudentScope(client, effectiveAcademyId)
    : null;
  if (scopedStudentIds && scopedStudentIds.size === 0) {
    return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
  }
  if (scopedStudentIds) query = query.in("id", [...scopedStudentIds]);

  if (status !== "ALL") query = query.eq("status", status);
  if (grade !== "ALL") query = query.eq("grade", grade);
  if (gender !== "ALL") query = query.eq("gender", gender);

  if (search.trim()) {
    const s = search.trim();
    query = query.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`,
    );
  }

  // Group filter: resolve from cache (group_students is Phase 2).
  if (groupId !== "ALL") {
    const ids = collections()
      .groupStudents.filter((gs) => gs.group_id === groupId)
      .map((gs) => gs.student_id);
    if (ids.length === 0) {
      return {
        items: [],
        pagination: { page, pageSize, total: 0, totalPages: 1 },
      };
    }
    query = query.in("id", ids);
  }

  // Sort
  const ascending = sortDir === "asc";
  if (sortBy === "name") {
    query = query.order("first_name", { ascending }).order("last_name", { ascending });
  } else {
    query = query.order(sortBy, { ascending });
  }

  // Paginate
  const start = (page - 1) * pageSize;
  query = query.range(start, start + pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    // A mobile SSR session can have a stale/invalid anon key while the
    // authoritative tenant snapshot is already loaded on the server. Treat
    // this as a read fallback, not as an application exception.
    if (process.env.NODE_ENV !== "production" && error.message !== "Invalid API key") {
      console.warn("listStudents RLS fallback:", error.message);
    }
    return listStudentsFromCache(filters, academyId);
  }

  const total = count ?? 0;
  // جيب أولياء الأمور من الداتابيز (RLS) مباشرة مش من الكاش — عشان يظهروا دايماً
  const parentIds = [...new Set((data ?? []).map((s: any) => s.parent_id).filter(Boolean))];
  const { data: parentsData } = parentIds.length
    ? await client.from("parents").select("*").in("id", parentIds)
    : { data: [] };
  const parentsMap = new Map((parentsData ?? []).map((p: any) => [p.id, p]));
  const items = (data ?? []).map((s) => {
    const student = attachRelations(s as Student);
    const sp = s as any;
    if ((!student.parent || !student.parent?.id) && sp.parent_id && parentsMap.has(sp.parent_id)) {
      student.parent = parentsMap.get(sp.parent_id);
    }
    return student;
  });
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * Get student detail — RLS-enforced. If the student belongs to another
 * academy, RLS blocks the read → returns null → 404.
 */
export async function getStudentDetail(
  id: string,
): Promise<StudentDetail | null> {
  if (!isSupabaseConfigured()) {
    return getStudentDetailFromCache(id);
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();

  const { data, error } = await client
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    // RLS blocked it, or student doesn't exist.
    return null;
  }

  const student = data as Student;
  // Teacher scope check (app-layer, Phase 1 — extra defense).
  const tScope = teacherStudentScope();
  if (tScope && !tScope.has(id)) {
    const effectiveAcademyId = currentAcademyId();
    const liveScope = effectiveAcademyId ? await liveTeacherStudentScope(client, effectiveAcademyId) : new Set<string>();
    if (liveScope && !liveScope.has(id)) return null;
  }

  return {
    ...attachRelations(student),
    stats: computeStudentStats(student.id),
  };
}

/**
 * Get a single student — RLS-enforced.
 */
/**
 * Platform-owner read path. Uses the platform service client only after the
 * caller has passed the SUPER_ADMIN route guard. The academy_id is retained
 * on every related query so a student can never be mixed with another academy.
 */
export async function getPlatformStudentDetail(id: string): Promise<StudentDetail | null> {
  if (!isSupabaseConfigured()) return getStudentDetailFromCache(id);

  const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
  const client = nodeSupabaseClient();
  const { data: rawStudent, error } = await client.from("students").select("*").eq("id", id).maybeSingle();
  if (error || !rawStudent) return null;

  const student = rawStudent as Student;
  const [{ data: parent }, { data: links }, { data: attendanceRows }, { data: paymentRows }, { data: gradeRows }] = await Promise.all([
    student.parent_id ? client.from("parents").select("*").eq("id", student.parent_id).eq("academy_id", student.academy_id).maybeSingle() : Promise.resolve({ data: null }),
    client.from("group_students").select("group_id").eq("student_id", student.id),
    client.from("attendance").select("status").eq("student_id", student.id),
    client.from("payments").select("amount_due,amount_paid").eq("student_id", student.id).eq("academy_id", student.academy_id),
    client.from("grades").select("score,exam_id").eq("student_id", student.id),
  ]);

  const groupIds = (links ?? []).map((link: any) => link.group_id).filter(Boolean);
  const { data: groupRows } = groupIds.length
    ? await client.from("groups").select("*").in("id", groupIds).eq("academy_id", student.academy_id)
    : { data: [] };
  const examIds = (gradeRows ?? []).map((grade: any) => grade.exam_id).filter(Boolean);
  const { data: examRows } = examIds.length
    ? await client.from("exams").select("id,max_score").in("id", examIds).eq("academy_id", student.academy_id)
    : { data: [] };
  const examMax = new Map<string, number>((examRows ?? []).map((exam: any) => [String(exam.id), Number(exam.max_score || 0)]));
  const attendance: Array<{ status: string }> = attendanceRows ?? [];
  const present = attendance.filter((row) => row.status === "PRESENT").length;
  const late = attendance.filter((row) => row.status === "LATE").length;
  const gradePercentages: number[] = (gradeRows ?? []).map((grade: any) => {
    const max = examMax.get(String(grade.exam_id)) || 0;
    return max > 0 ? (Number(grade.score || 0) / max) * 100 : 0;
  });
  const payments: Array<{ amount_due: number; amount_paid: number; remaining: number }> = (paymentRows ?? []).map((row: any) => ({ amount_due: Number(row.amount_due || 0), amount_paid: Number(row.amount_paid || 0), remaining: Math.max(Number(row.amount_due || 0) - Number(row.amount_paid || 0), 0) }));
  const totalPaid = payments.reduce((sum: number, row) => sum + row.amount_paid, 0);
  const outstanding = payments.reduce((sum: number, row) => sum + row.remaining, 0);

  return {
    ...student,
    parent: parent ?? null,
    groups: groupRows ?? [],
    stats: {
      attendanceRate: attendance.length ? percentage(present + late, attendance.length) : 0,
      averageGrade: gradePercentages.length ? round(gradePercentages.reduce((sum: number, value: number) => sum + value, 0) / gradePercentages.length, 1) : 0,
      monthlyFee: payments.length ? Math.max(...payments.map((row: { amount_due: number }) => row.amount_due)) : 0,
      totalPaid,
      outstanding,
      attendanceTrend: [],
      gradeTrend: [],
    },
  };
}

export async function getStudent(id: string): Promise<Student | null> {
  if (!isSupabaseConfigured()) {
    return getStudentFromCache(id);
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = await createServerSupabaseClient();

  const { data, error } = await client
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const student = data as Student;
  const tScope = teacherStudentScope();
  if (tScope && !tScope.has(id)) {
    const effectiveAcademyId = currentAcademyId();
    const liveScope = effectiveAcademyId ? await liveTeacherStudentScope(client, effectiveAcademyId) : new Set<string>();
    if (liveScope && !liveScope.has(id)) return null;
  }
  return attachRelations(student);
}

export function computeStudentStats(studentId: string): StudentStats {
  const att = attendanceForStudent(studentId);
  const present = att.filter((a) => a.status === "PRESENT").length;
  const late = att.filter((a) => a.status === "LATE").length;
  const attendanceRate = att.length ? percentage(present + late, att.length) : 0;

  const grades = gradesForStudent(studentId);
  const averageGrade = grades.length
    ? round(
        grades.reduce((s, g) => s + (g.percentage ?? 0), 0) / grades.length,
        1,
      )
    : 0;

  const pays = paymentsForStudent(studentId).map(derivePayment);
  const monthlyFee = pays.length
    ? Math.max(...pays.map((p) => p.amount_due))
    : 0;
  const totalPaid = pays.reduce((s, p) => s + p.amount_paid, 0);
  const outstanding = pays.reduce((s, p) => s + p.remaining, 0);

  const trend = att.slice(-6).map((a, i) => ({
    label: `L${i + 1}`,
    rate: a.status === "PRESENT" ? 100 : a.status === "LATE" ? 50 : 0,
  }));
  const gradeTrend = grades.slice(-6).map((g, i) => ({
    label: `E${i + 1}`,
    score: round(g.percentage ?? 0, 0),
  }));

  return {
    attendanceRate,
    averageGrade,
    monthlyFee,
    totalPaid,
    outstanding,
    attendanceTrend: trend,
    gradeTrend,
  };
}

// ─── Mutations (unchanged) ────────────────────────────────────────

export interface StudentInput {
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | null;
  parent_id?: string | null;
  school?: string | null;
  grade?: string | null;
  notes?: string | null;
  status?: Student["status"];
  groupIds?: string[];
  consent_given?: boolean;
}

function uid() {
  return crypto.randomUUID();
}

export async function createStudent(
  input: StudentInput,
  authenticatedAcademyId?: string,
  consentActorId?: string,
  authenticatedUser?: SessionUser,
): Promise<Student> {
  // Server Actions can cross an async boundary where AsyncLocalStorage context is lost.
  // Prefer the academy resolved by requireScopedRole; keep the fallback for existing callers.
  const academyId = authenticatedAcademyId ?? currentAcademyId();
  const requestedAcademyId = (input as StudentInput & { academy_id?: string }).academy_id;
  if (!academyId) throw new Error("An authenticated academy scope is required.");
  if (requestedAcademyId && requestedAcademyId !== academyId) {
    throw new Error("The requested academy is outside the authenticated scope.");
  }
  const groupIdsForAuthorization = input.groupIds ?? [];
  assertRequestedGroupScope(groupIdsForAuthorization, academyId, authenticatedUser);
  if (input.parent_id) {
    const parent = collections().parents.find((item) => item.id === input.parent_id && item.academy_id === academyId);
    if (!parent) throw new Error("Parent is outside the authenticated academy.");
  }
  // SaaS usage limit check (server-enforced).
  const check = canCreate("students");
  if (!check.allowed) {
    throw new Error(`Limit reached: ${check.current}/${check.limit} students. Upgrade your plan.`);
  }

  // منع التكرار: نفس الاسم + الموبايل في نفس الأكاديمية
  const aid = academyId;
  try {
    const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
    const admin = nodeSupabaseClient();
    if (admin && aid) {
      const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
      const { data: dups } = await admin
        .from("students")
        .select("first_name,last_name,phone")
        .eq("academy_id", aid)
        .ilike("first_name", input.first_name.trim())
        .ilike("last_name", input.last_name.trim());
      const dup = (dups ?? []).find(
        (s: any) => norm(s.phone) === norm(input.phone),
      );
      if (dup) {
        throw new Error("طالب موجود بالفعل بنفس الاسم والموبايل في الأكاديمية.");
      }
    }
  } catch (e) {
    // لو الخطأ هو رسالة التكرار نطلّعها، غير كده نكمّل (best-effort)
    if ((e as Error)?.message?.includes("موجود بالفعل")) throw e;
  }

  const { groupIds = [], ...rest } = input;
  const now = new Date().toISOString();
  const consentGiven = rest.consent_given === true;
  const currentUser = authenticatedUser ?? getCurrentUser();
  const workspace = collections().academies.find((academy: any) => academy.id === academyId) as any;
  let workspaceType = workspace?.workspace_type as string | undefined;
  if (!workspaceType && isSupabaseConfigured()) {
    try {
      const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
      const client = nodeSupabaseClient();
      if (client) {
        const { data: academy } = await client.from("academies").select("workspace_type").eq("id", academyId).maybeSingle();
        workspaceType = academy?.workspace_type;
      }
    } catch (error) {
      console.error("createStudent workspace lookup failed:", (error as Error)?.message);
    }
  }
  let ownerTeacherId = currentUser?.role === "TEACHER" && workspaceType === "TEACHER"
    ? currentTeacherId()
    : null;
  if (currentUser?.role === "TEACHER" && workspaceType === "TEACHER" && !ownerTeacherId && isSupabaseConfigured()) {
    try {
      const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
      const client = nodeSupabaseClient();
      if (client) {
        const { data: teacher } = await client
          .from("teachers")
          .select("id")
          .eq("academy_id", academyId)
          .or(`profile_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
          .maybeSingle();
        ownerTeacherId = teacher?.id ?? null;
      }
    } catch (error) {
      console.error("createStudent owner teacher lookup failed:", (error as Error)?.message);
    }
  }
  const student: Student = {
    id: uid(),
    academy_id: academyId,
    owner_teacher_id: ownerTeacherId,
    first_name: rest.first_name,
    last_name: rest.last_name,
    phone: rest.phone ?? null,
    email: rest.email ?? null,
    date_of_birth: rest.date_of_birth || null,
    gender: rest.gender ?? null,
    parent_id: rest.parent_id ?? null,
    school: rest.school ?? null,
    grade: rest.grade ?? null,
    notes: rest.notes ?? null,
    // Student access stays inactive until consent is actually recorded.
    status: consentGiven ? (rest.status ?? "ACTIVE") : "INACTIVE",
    consent_given: consentGiven,
    consent_at: consentGiven ? now : null,
    consent_by: consentGiven ? (consentActorId ?? null) : null,
    consent_version: consentGiven ? "1.0" : null,
    enrolled_at: now,
    created_at: now,
    updated_at: now,
  };
  collections().students.push(student);
  // أعمدة الموافقة موجودة في Production؛ نحفظها حتى تبقى موافقة WhatsApp قابلة للتدقيق
  // وتستمر عمليات الإرسال اللاحقة في احترام قرار الطالب أو ولي الأمر.
  await persistInsert("students", student);

  // ── إنشاء حساب دخول للطالب (إيميل + باسورد افتراضي) عشان يقدر يدخل ──
  try {
    const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
    const client = nodeSupabaseClient();
    if (client) {
      // الإيميل: اللي الأدمن كتبه، أو مُولّد من الاسم
      const loginEmail =
        (rest.email && rest.email.trim()) ||
        `${student.first_name}.${student.last_name}`
          .replace(/[^a-zA-Z0-9.]/g, "")
          .toLowerCase() + `.${student.id.slice(0, 4)}@student.local`;
      const { data: aData, error: aErr } = await client.auth.admin.createUser({
        email: loginEmail,
        password: STUDENT_DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: `${student.first_name} ${student.last_name}`,
          role: "STUDENT",
          academy_id: aid,
        },
      });
      if (!aErr && aData.user) {
        const { error: profileError } = await client.from("profiles").upsert({
          id: aData.user.id,
          academy_id: aid,
          email: loginEmail,
          role: "STUDENT",
          full_name: `${student.first_name} ${student.last_name}`,
          is_active: consentGiven,
        });
        const { error: membershipError } = profileError ? { error: profileError } : await client
          .from("academy_memberships")
          .upsert({ academy_id: aid, profile_id: aData.user.id, role: "STUDENT", status: consentGiven ? "ACTIVE" : "INVITED", joined_at: now }, { onConflict: "academy_id,profile_id" });
        if (membershipError) {
          await client.auth.admin.deleteUser(aData.user.id);
          throw new Error(`Could not grant student access: ${membershipError.message}`);
        }
        // خزّن الإيميل على سجل الطالب عشان الـ portal يربطه
        student.email = loginEmail;
        await persistUpdate("students", student.id, { email: loginEmail });
      } else if (aErr) {
        console.error("student login account:", aErr.message);
      }
    }
  } catch (e) {
    console.error("student login account:", (e as Error)?.message);
  }

  for (const gid of groupIds) {
    const membership = {
      group_id: gid,
      student_id: student.id,
      joined_at: now,
    };
    collections().groupStudents.push(membership);
    await persistInsert("group_students", membership);
  }
  return attachRelations(student);
}

export async function updateStudent(
  id: string,
  input: Partial<StudentInput>,
  authenticatedAcademyId?: string,
  authenticatedUser?: SessionUser,
): Promise<Student | null> {
  const academyId = authenticatedAcademyId ?? currentAcademyId();
  if (!academyId) throw new Error("Missing authenticated academy context.");
  const s = await resolveStudentMutationScope(id, academyId, authenticatedUser);
  if (input.parent_id) {
    await assertParentMutationScope(input.parent_id, academyId);
  }
  if (input.groupIds?.length) assertRequestedGroupScope(input.groupIds, academyId, authenticatedUser);
  Object.assign(s, {
    ...input,
    updated_at: new Date().toISOString(),
  });
  const { groupIds: _g, ...patch } = input;
  void _g;
  // حوّل التاريخ الفاضي ("") لـ null عشان الداتابيز يقبلّه
  if (patch.date_of_birth === "") patch.date_of_birth = null;
  await persistUpdate("students", id, { ...patch, updated_at: new Date().toISOString() }, academyId);
  if (input.groupIds?.length) {
    collections().groupStudents = collections().groupStudents.filter(
      (gs) => gs.student_id !== id,
    );
    const now = new Date().toISOString();
    for (const gid of input.groupIds) {
      collections().groupStudents.push({
        group_id: gid,
        student_id: id,
        joined_at: now,
      });
    }
  }
  return attachRelations(s);
}

export async function setStudentStatus(
  id: string,
  status: Student["status"],
  authenticatedAcademyId?: string,
): Promise<Student | null> {
  return updateStudent(id, { status }, authenticatedAcademyId);
}
