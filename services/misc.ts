/**
 * Courses, Parents, Teachers, Notes, Search & Settings services.
 */
import type {
  Course,
  Note,
  Parent,
  Teacher,
  Academy,
} from "@/types";
import { collections } from "./data/store";
import { persistInsert, persistDelete } from "./data/store";
import { fullName, groupsForStudent, byAcademy, fetchTableRLS } from "./_shared";
import { currentAcademyId } from "./session";
import { APP_CONFIG } from "@/lib/constants";
import { isSupabaseConfigured } from "./supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

/* ---------------- Courses ---------------- */

export async function listCourses(academyId?: string): Promise<Course[]> {
  return fetchTableRLS<Course>("courses", academyId);
}

export async function createCourse(input: { academy_id?: string; name: string; description?: string | null; color?: string | null }): Promise<Course> {
  const now = new Date().toISOString();
  const c: Course = {
    id: crypto.randomUUID(),
    academy_id: input.academy_id ?? currentAcademyId(),
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
  const c = collections().courses.find((x) => x.id === id);
  if (!c) return null;
  Object.assign(c, { ...input, updated_at: new Date().toISOString() });
  return c;
}

export async function deleteCourse(id: string): Promise<boolean> {
  const before = collections().courses.length;
  collections().courses = collections().courses.filter((c) => c.id !== id);
  await persistDelete("courses", { id });
  return collections().courses.length < before;
}

/* ---------------- Parents ---------------- */

export async function listParents(academyId?: string): Promise<Parent[]> {
  const items = await fetchTableRLS<Parent>("parents", academyId);
  return items.slice().sort((a, b) => fullName(a).localeCompare(fullName(b)));
}

export async function createParent(input: Omit<Parent, "id" | "academy_id" | "created_at" | "updated_at">): Promise<Parent> {
  const now = new Date().toISOString();
  const p: Parent = {
    ...input,
    id: crypto.randomUUID(),
    academy_id: currentAcademyId(),
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

export function notesForStudent(studentId: string): Note[] {
  return byAcademy(collections().notes)
    .filter((n) => n.student_id === studentId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function addNote(
  studentId: string,
  authorId: string,
  authorName: string,
  content: string,
): Promise<Note> {
  const n: Note = {
    id: crypto.randomUUID(),
    academy_id: currentAcademyId(),
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

export async function deleteNote(id: string): Promise<boolean> {
  const before = collections().notes.length;
  collections().notes = collections().notes.filter((n) => n.id !== id);
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
    const client = nodeSupabaseClient();
    if (!client) throw new Error("Supabase server client is unavailable.");
    const { data, error } = await client
      .from("academies")
      .select("*")
      .eq("id", activeAcademyId)
      .maybeSingle();
    if (!error && data) return data as Academy;
  }

  throw new Error("Academy data is unavailable for the active session.");
}

export function updateAcademy(input: Partial<Academy>): Academy {
  const a = getAcademy();
  Object.assign(a, { ...input, updated_at: new Date().toISOString() });
  return a;
}

export function listProfiles(academyId?: string) {
  return byAcademy(collections().profiles, academyId);
}

export { APP_CONFIG };
