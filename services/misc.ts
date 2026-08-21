/**
 * Courses, Parents, Teachers, Notes, Search & Settings services.
 */
import type {
  Course,
  Note,
  Parent,
  Teacher,
  Academy,
  Profile,
} from "@/types";
import { collections } from "./data/store";
import { persistInsert, persistUpdate, persistDelete } from "./data/store";
import { fullName, groupsForStudent, byAcademy, fetchTableRLS } from "./_shared";
import { currentAcademyId } from "./session";
import { APP_CONFIG } from "@/lib/constants";
import { isSupabaseConfigured } from "./supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/* ---------------- Courses ---------------- */

export async function listCourses(academyId?: string): Promise<Course[]> {
  return fetchTableRLS<Course>("courses", academyId);
}

export async function createCourse(input: { academy_id?: string; name: string; description?: string | null; color?: string | null }): Promise<Course> {
  const now = new Date().toISOString();
  const academyId = currentAcademyId();
  if (input.academy_id && input.academy_id !== academyId) {
    throw new Error("Course academy scope mismatch.");
  }
  const c: Course = {
    id: crypto.randomUUID(),
    academy_id: academyId,
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? "#7c5cfc",
    created_at: now,
    updated_at: now,
  };
  collections().courses.push(c);
  await persistInsert("courses", c);
  return c;
}

export async function updateCourse(id: string, input: Partial<Course>): Promise<Course | null> {
  const academyId = currentAcademyId();
  const c = collections().courses.find((x) => x.id === id && x.academy_id === academyId);
  if (!c) return null;
  if (input.academy_id && input.academy_id !== academyId) {
    throw new Error("Course academy scope mismatch.");
  }
  const patch = { ...input } as Partial<Course>;
  delete patch.academy_id;
  Object.assign(c, { ...patch, updated_at: new Date().toISOString() });
  await persistUpdate("courses", id, { ...patch, updated_at: c.updated_at });
  return c;
}

export async function deleteCourse(id: string): Promise<boolean> {
  const academyId = currentAcademyId();
  const target = collections().courses.find((c) => c.id === id && c.academy_id === academyId);
  if (!target) return false;
  await persistDelete("courses", { id });
  const before = collections().courses.length;
  collections().courses = collections().courses.filter((c) => c.id !== id || c.academy_id !== academyId);
  return collections().courses.length < before;
}

/* ---------------- Parents ---------------- */

export async function listParents(academyId?: string): Promise<Parent[]> {
  const items = await fetchTableRLS<Parent>("parents", academyId);
  return items.slice().sort((a, b) => fullName(a).localeCompare(fullName(b)));
}

export async function createParent(input: Omit<Parent, "id" | "academy_id" | "created_at" | "updated_at"> & { academy_id?: string }): Promise<Parent> {
  const academyId = currentAcademyId();
  if (!academyId) throw new Error("An authenticated academy scope is required.");
  if (input.academy_id && input.academy_id !== academyId) {
    throw new Error("The requested academy is outside the authenticated scope.");
  }
  const now = new Date().toISOString();
  const p: Parent = {
    ...input,
    id: crypto.randomUUID(),
    academy_id: academyId,
    created_at: now,
    updated_at: now,
  };
  collections().parents.push(p);
  await persistInsert("parents", p);
  return p;
}

export function childrenOf(parentId: string) {
  return byAcademy(collections().students)
    .filter((s) => s.parent_id === parentId)
    .map((s) => ({ ...s, groups: groupsForStudent(s.id) }));
}

/* ---------------- Teachers ---------------- */

export async function listTeachers(academyId?: string): Promise<Teacher[]> {
  const items = await fetchTableRLS<Teacher>("teachers", academyId);
  return items.filter((t) => t.is_active);
}

/* ---------------- Notes ---------------- */

export function notesForStudent(studentId: string, academyId?: string): Note[] {
  return byAcademy(collections().notes, academyId)
    .filter((n) => n.student_id === studentId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function addNote(
  studentId: string,
  authorId: string,
  authorName: string,
  content: string,
): Promise<Note> {
  const academyId = currentAcademyId();
  const students = await fetchTableRLS<{ id: string }>("students", academyId);
  if (!students.some((student) => student.id === studentId)) {
    throw new Error("Student is outside the authenticated academy.");
  }
  const n: Note = {
    id: crypto.randomUUID(),
    academy_id: academyId,
    student_id: studentId,
    author_id: authorId,
    author_name: authorName,
    content,
    created_at: new Date().toISOString(),
  };
  collections().notes.push(n);
  await persistInsert("notes", n);
  return n;
}

export async function deleteNote(id: string, studentId: string): Promise<boolean> {
  const academyId = currentAcademyId();
  const note = byAcademy(collections().notes, academyId)
    .find((item) => item.id === id && item.student_id === studentId);
  if (!note) return false;
  const before = collections().notes.length;
  collections().notes = collections().notes.filter((item) => item.id !== id);
  await persistDelete("notes", { id });
  return collections().notes.length < before;
}

/* ---------------- Search ---------------- */

export interface SearchResult {
  type: "student" | "group" | "lesson" | "payment";
  id: string;
  label: string;
  subtitle: string;
  href: string;
}

export function globalSearch(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];

  for (const s of byAcademy(collections().students)) {
    if (fullName(s).toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
      results.push({ type: "student", id: s.id, label: fullName(s), subtitle: s.grade ?? "Student", href: `/students/${s.id}` });
  }
  for (const g of byAcademy(collections().groups)) {
    if (g.name.toLowerCase().includes(q))
      results.push({ type: "group", id: g.id, label: g.name, subtitle: "Group", href: `/groups/${g.id}` });
  }
  const lessonIds = new Set(byAcademy(collections().lessons).map((l) => l.id));
  for (const l of collections().lessons) {
    if (lessonIds.has(l.id) && l.topic.toLowerCase().includes(q))
      results.push({ type: "lesson", id: l.id, label: l.topic, subtitle: "Lesson", href: `/lessons/${l.id}` });
  }
  return results.slice(0, 10);
}

/* ---------------- Settings ---------------- */

export function getAcademy(academyId?: string): Academy {
  const activeAcademyId = academyId ?? currentAcademyId();
  const academy = collections().academies.find((item) => item.id === activeAcademyId);
  if (!academy) throw new Error("Academy data is unavailable for the active session.");
  return academy;
}

/**
 * Resolve academy metadata for async Server Components. The in-memory snapshot
 * remains the fast path, while the direct request-bound query prevents a
 * transient AsyncLocalStorage/hydration miss from taking down the whole app.
 */
export async function getAcademyAsync(academyId?: string): Promise<Academy> {
  const activeAcademyId = academyId ?? currentAcademyId();
  const cached = collections().academies.find((item) => item.id === activeAcademyId);
  if (cached) return cached;

  if (isSupabaseConfigured()) {
    // Use the request-bound client first so the active user's Supabase session
    // and RLS policies remain the primary authorization boundary.
    const requestClient = await createServerSupabaseClient();
    const requestResult = await requestClient
      .from("academies")
      .select("*")
      .eq("id", activeAcademyId)
      .maybeSingle();
    if (!requestResult.error && requestResult.data) return requestResult.data as Academy;

    // A service-role read is only a narrowly keyed server fallback for cold
    // starts where the SSR auth cookie is unavailable to the query client.
    const admin = nodeSupabaseClient();
    if (admin) {
      const adminResult = await admin
        .from("academies")
        .select("*")
        .eq("id", activeAcademyId)
        .maybeSingle();
      if (!adminResult.error && adminResult.data) return adminResult.data as Academy;
    }
  }

  throw new Error("Academy data is unavailable for the active session.");
}

export function updateAcademy(input: Partial<Academy>): Academy {
  const a = getAcademy();
  Object.assign(a, { ...input, updated_at: new Date().toISOString() });
  return a;
}

export async function listProfiles(academyId?: string): Promise<Profile[]> {
  return fetchTableRLS<Profile>("profiles", academyId);
}

export { APP_CONFIG };
