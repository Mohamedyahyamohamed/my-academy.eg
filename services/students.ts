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
} from "@/types";
import { collections } from "./data/store";
import { currentAcademyId } from "./session";
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
} from "./_shared";
import { percentage, round } from "@/lib/utils";
import { isSupabaseConfigured } from "./supabase/config";
import { canCreate } from "./saas";

function attachRelations(s: Student): Student {
  return {
    ...s,
    parent: getParent(s.parent_id) ?? null,
    groups: groupsForStudent(s.id),
  };
}

// ─── CACHE FALLBACKS (used when Supabase not configured) ──────────

function listStudentsFromCache(
  filters: StudentFilters = {},
): PaginatedResult<Student> {
  const {
    search = "",
    status = "ALL",
    groupId = "ALL",
    page = 1,
    pageSize = 10,
    sortBy = "name",
    sortDir = "asc",
  } = filters;

  let items = byAcademy(collections().students);
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
export async function listStudents(
  filters: StudentFilters = {},
): Promise<PaginatedResult<Student>> {
  if (!isSupabaseConfigured()) {
    return listStudentsFromCache(filters);
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = createServerSupabaseClient();

  const {
    search = "",
    status = "ALL",
    groupId = "ALL",
    page = 1,
    pageSize = 10,
    sortBy = "name",
    sortDir = "asc",
  } = filters;

  let query = client.from("students").select("*", { count: "exact" });

  // RLS filters by academy_id automatically.
  if (status !== "ALL") query = query.eq("status", status);

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
    console.error("listStudents RLS error:", error.message);
    // Fallback to cache on error.
    return listStudentsFromCache(filters);
  }

  const total = count ?? 0;
  const items = (data ?? []).map((s) => attachRelations(s as Student));
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
  const client = createServerSupabaseClient();

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
  if (tScope && !tScope.has(id)) return null;

  return {
    ...attachRelations(student),
    stats: computeStudentStats(student.id),
  };
}

/**
 * Get a single student — RLS-enforced.
 */
export async function getStudent(id: string): Promise<Student | null> {
  if (!isSupabaseConfigured()) {
    return getStudentFromCache(id);
  }

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = createServerSupabaseClient();

  const { data, error } = await client
    .from("students")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const student = data as Student;
  const tScope = teacherStudentScope();
  if (tScope && !tScope.has(id)) return null;
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

// ─── Mutations ────────────────────────────────────────────────────

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

export async function createStudent(input: StudentInput): Promise<Student> {
  // SaaS usage limit check (server-enforced).
  const check = canCreate("students");
  if (!check.allowed) {
    throw new Error(`Limit reached: ${check.current}/${check.limit} students. Upgrade your plan.`);
  }
  const { groupIds = [], ...rest } = input;
  const now = new Date().toISOString();
  const student: Student = {
    id: uid(),
    academy_id: currentAcademyId(),
    first_name: rest.first_name,
    last_name: rest.last_name,
    phone: rest.phone ?? null,
    email: rest.email ?? null,
    // التغيير هنا: || بدل ?? عشان النص الفاضي ("") يبقى null
    date_of_birth: rest.date_of_birth || null,
    gender: rest.gender ?? null,
    parent_id: rest.parent_id ?? null,
    school: rest.school ?? null,
    grade: rest.grade ?? null,
    notes: rest.notes ?? null,
    status: rest.status ?? "ACTIVE",
    consent_given: rest.consent_given ?? false,
    consent_version: "v1",
    enrolled_at: now,
    created_at: now,
    updated_at: now,
  };
  collections().students.push(student);
  await persistInsert("students", student);
  for (const gid of groupIds) {
    collections().groupStudents.push({
      group_id: gid,
      student_id: student.id,
      joined_at: now,
    });
  }
  return attachRelations(student);
}

export function updateStudent(
  id: string,
  input: Partial<StudentInput>,
): Student | null {
  const s = collections().students.find((x) => x.id === id);
  if (!s) return null;
  Object.assign(s, {
    ...input,
    updated_at: new Date().toISOString(),
  });
  const { groupIds: _g, ...patch } = input;
  void _g;
  // التغيير هنا: حوّل التاريخ الفاضي ("") لـ null عشان الداتابيز يقبلّه
  if (patch.date_of_birth === "") patch.date_of_birth = null;
  void persistUpdate("students", id, { ...patch, updated_at: new Date().toISOString() });
  if (input.groupIds) {
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

export function setStudentStatus(
  id: string,
  status: Student["status"],
): Student | null {
  return updateStudent(id, { status });
}