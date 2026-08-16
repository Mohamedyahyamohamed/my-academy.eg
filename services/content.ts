import type { ContentCourse, ContentFile, ContentLesson, ContentProgress, SessionUser } from "@/types";
import type { ContentLink } from "@/types";
import { collections, persistInsert, persistUpdate } from "./data/store";
import { currentAcademyId, currentTeacherId, getCurrentUser } from "./session";
import { can, hasAcademyWideScope } from "@/lib/permissions";
import { fetchTableRLS, teacherGroupScope } from "./_shared";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { canCreate } from "./saas";

function now() {
  return new Date().toISOString();
}

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function currentStudentId(user: SessionUser): string | null {
  const student = collections().students.find(
    (item) => item.academy_id === user.academy_id && item.email?.toLowerCase() === user.email.toLowerCase(),
  );
  return student?.id ?? null;
}

function parentStudentIds(user: SessionUser): Set<string> {
  const parent = collections().parents.find(
    (item) => item.academy_id === user.academy_id && (item.profile_id === user.id || item.email.toLowerCase() === user.email.toLowerCase()),
  );
  return new Set(
    collections().students.filter((student) => student.academy_id === user.academy_id && student.parent_id === parent?.id).map((student) => student.id),
  );
}

function studentGroupIds(studentId: string, academyId: string): Set<string> {
  const studentIds = new Set(collections().students.filter((student) => student.academy_id === academyId).map((student) => student.id));
  return new Set(
    collections().groupStudents
      .filter((row) => row.student_id === studentId && studentIds.has(row.student_id))
      .map((row) => row.group_id),
  );
}

function accessibleGroupIds(user: SessionUser): Set<string> | null {
  const groups = collections().groups.filter((group) => group.academy_id === user.academy_id);
  if (hasAcademyWideScope(user.role)) return new Set(groups.map((group) => group.id));
  if (user.role === "TEACHER") return teacherGroupScope() ?? new Set();
  if (user.role === "STUDENT") {
    const studentId = currentStudentId(user);
    return studentId ? studentGroupIds(studentId, user.academy_id) : new Set();
  }
  if (user.role === "PARENT") {
    const ids = new Set<string>();
    for (const studentId of parentStudentIds(user)) {
      for (const groupId of studentGroupIds(studentId, user.academy_id)) ids.add(groupId);
    }
    return ids;
  }
  return new Set();
}

function assertContentPermission(user: SessionUser, permission: "read" | "write") {
  const allowed = permission === "read" ? can(user, "courses.read") : can(user, "courses.write");
  if (!allowed) throw new Error("You are not allowed to access educational content.");
}

function assertGroupAccess(user: SessionUser, groupId: string, write = false) {
  const group = collections().groups.find((item) => item.id === groupId && item.academy_id === user.academy_id);
  if (!group) throw new Error("The selected group is outside the authenticated academy.");
  const scope = accessibleGroupIds(user);
  if (!scope?.has(groupId)) throw new Error("You do not have access to this group.");
  if (write && user.role === "TEACHER" && group.teacher_id !== currentTeacherId()) {
    throw new Error("You can only manage content for your assigned groups.");
  }
  return group;
}

function attachCourse(course: ContentCourse, lessons: ContentLesson[] = [], files: ContentFile[] = [], links: ContentLink[] = []): ContentCourse {
  const group = collections().groups.find((item) => item.id === course.group_id && item.academy_id === course.academy_id);
  const teacher = collections().teachers.find((item) => item.id === course.teacher_id && item.academy_id === course.academy_id);
  return { ...course, group, teacher, lessons, files, links };
}

async function contentRows<T>(table: string, academyId: string): Promise<T[]> {
  const rows = await fetchTableRLS<T>(table, academyId);
  return rows.filter((row: any) => row.academy_id === academyId);
}

export async function listCourses(user: SessionUser): Promise<ContentCourse[]> {
  assertContentPermission(user, "read");
  const scope = accessibleGroupIds(user);
  if (!scope) return [];
  const courses = await contentRows<ContentCourse>("content_courses", user.academy_id);
  return courses
    .filter((course) => scope.has(course.group_id) && (hasAcademyWideScope(user.role) || user.role === "TEACHER" || course.is_published))
    .sort((a, b) => a.sort_order - b.sort_order || +new Date(a.created_at) - +new Date(b.created_at))
    .map((course) => attachCourse(course));
}

export async function getCourse(id: string, user: SessionUser): Promise<ContentCourse | null> {
  const courses = await listCourses(user);
  const course = courses.find((item) => item.id === id);
  if (!course) return null;
  const lessons = await listLessons(id, user);
  const files = await listContentFiles(id, user);
  const links = await listContentLinks(id, user);
  return attachCourse(course, lessons, files.filter((file) => !file.lesson_id), links.filter((link) => !link.lesson_id));
}

export interface CreateCourseInput {
  title: string;
  description?: string | null;
  group_id: string;
  sort_order?: number;
  is_published?: boolean;
}

export async function createCourse(input: CreateCourseInput, user: SessionUser): Promise<ContentCourse> {
  assertContentPermission(user, "write");
  if (user.role !== "TEACHER" && !hasAcademyWideScope(user.role)) throw new Error("Only teachers or academy administrators can create content.");
  const group = assertGroupAccess(user, input.group_id, true);
  const courseLimit = canCreate("courses", user.academy_id);
  if (!courseLimit.allowed) throw new Error(`Course limit reached for the current plan (${courseLimit.limit}).`);
  const teacherId = user.role === "TEACHER" ? currentTeacherId() : group.teacher_id;
  if (!teacherId) throw new Error("No teacher profile is linked to this account.");
  const duplicate = (await contentRows<ContentCourse>("content_courses", user.academy_id)).some(
    (item) => item.group_id === group.id && item.title.toLowerCase() === normalizeText(input.title).toLowerCase(),
  );
  if (!normalizeText(input.title) || duplicate) throw new Error(duplicate ? "A course with this title already exists for the group." : "A course title is required.");
  const course: ContentCourse = {
    id: crypto.randomUUID(),
    academy_id: user.academy_id,
    teacher_id: teacherId,
    group_id: group.id,
    title: normalizeText(input.title),
    description: normalizeText(input.description) || null,
    sort_order: Math.max(0, Number(input.sort_order ?? 0)),
    is_published: Boolean(input.is_published),
    created_at: now(),
    updated_at: now(),
  };
  (collections() as any).contentCourses?.push(course);
  await persistInsert("content_courses", course);
  return attachCourse(course);
}

export interface CreateLessonInput {
  course_id: string;
  title: string;
  description?: string | null;
  video_url?: string | null;
  sort_order?: number;
  is_published?: boolean;
}

export async function createLesson(input: CreateLessonInput, user: SessionUser): Promise<ContentLesson> {
  assertContentPermission(user, "write");
  const course = (await contentRows<ContentCourse>("content_courses", user.academy_id)).find((item) => item.id === input.course_id);
  if (!course) throw new Error("Course not found.");
  assertGroupAccess(user, course.group_id, true);
  const title = normalizeText(input.title);
  if (!title) throw new Error("A lesson title is required.");
  const lessonLimit = canCreate("lessons", user.academy_id);
  if (!lessonLimit.allowed) throw new Error(`Lesson limit reached for the current plan (${lessonLimit.limit}).`);
  const lesson: ContentLesson = {
    id: crypto.randomUUID(),
    academy_id: user.academy_id,
    course_id: course.id,
    title,
    description: normalizeText(input.description) || null,
    video_url: normalizeText(input.video_url) || null,
    sort_order: Math.max(0, Number(input.sort_order ?? 0)),
    is_published: Boolean(input.is_published),
    created_at: now(),
    updated_at: now(),
  };
  (collections() as any).contentLessons?.push(lesson);
  await persistInsert("content_lessons", lesson);
  return lesson;
}

export async function listLessons(courseId: string, user: SessionUser): Promise<ContentLesson[]> {
  assertContentPermission(user, "read");
  const course = (await contentRows<ContentCourse>("content_courses", user.academy_id)).find((item) => item.id === courseId);
  if (!course) return [];
  const scope = accessibleGroupIds(user);
  if (!scope?.has(course.group_id)) return [];
  const lessons = await contentRows<ContentLesson>("content_lessons", user.academy_id);
  const progress = user.role === "STUDENT" ? await listProgressForStudent(user) : [];
  const completedIds = new Set(progress.map((item) => item.lesson_id));
  return lessons
    .filter((lesson) => lesson.course_id === courseId && (hasAcademyWideScope(user.role) || user.role === "TEACHER" || lesson.is_published))
    .sort((a, b) => a.sort_order - b.sort_order || +new Date(a.created_at) - +new Date(b.created_at))
    .map((lesson) => ({ ...lesson, completed: completedIds.has(lesson.id) }));
}

export async function listContentFiles(courseId: string, user: SessionUser, lessonId?: string): Promise<ContentFile[]> {
  assertContentPermission(user, "read");
  const course = (await contentRows<ContentCourse>("content_courses", user.academy_id)).find((item) => item.id === courseId);
  if (!course || !accessibleGroupIds(user)?.has(course.group_id)) return [];
  const files = await contentRows<ContentFile>("content_files", user.academy_id);
  const filtered = files.filter((file) => file.course_id === courseId && (lessonId === undefined ? true : file.lesson_id === lessonId));
  const client = nodeSupabaseClient();
  if (!client) return filtered;
  const withUrls: ContentFile[] = [];
  for (const file of filtered) {
    const signed = await client.storage.from("content").createSignedUrl(file.storage_path, 3600);
    withUrls.push({ ...file, download_url: signed.data?.signedUrl ?? undefined });
  }
  return withUrls;
}

export async function listContentLinks(courseId: string, user: SessionUser, lessonId?: string): Promise<ContentLink[]> {
  assertContentPermission(user, "read");
  const course = (await contentRows<ContentCourse>("content_courses", user.academy_id)).find((item) => item.id === courseId);
  if (!course || !accessibleGroupIds(user)?.has(course.group_id)) return [];
  const links = await contentRows<ContentLink>("content_links", user.academy_id);
  return links
    .filter((link) => link.course_id === courseId && (lessonId === undefined ? true : link.lesson_id === lessonId))
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
}

export async function markLessonComplete(lessonId: string, user: SessionUser): Promise<ContentProgress> {
  if (user.role !== "STUDENT" || !can(user, "content.progress")) throw new Error("Only the enrolled student can update progress.");
  const studentId = currentStudentId(user);
  if (!studentId) throw new Error("Student profile not found.");
  const lessons = await contentRows<ContentLesson>("content_lessons", user.academy_id);
  const lesson = lessons.find((item) => item.id === lessonId && item.is_published);
  if (!lesson) throw new Error("Lesson not found.");
  const courses = await contentRows<ContentCourse>("content_courses", user.academy_id);
  const course = courses.find((item) => item.id === lesson.course_id && item.is_published);
  if (!course || !studentGroupIds(studentId, user.academy_id).has(course.group_id)) throw new Error("This lesson is outside your enrolled groups.");
  const existing = (collections() as any).contentProgress?.find((item: ContentProgress) => item.student_id === studentId && item.lesson_id === lessonId);
  const progress: ContentProgress = existing ?? {
    id: crypto.randomUUID(), academy_id: user.academy_id, student_id: studentId, lesson_id: lessonId, completed_at: now(),
  };
  if (!existing) {
    (collections() as any).contentProgress?.push(progress);
    await persistInsert("content_progress", progress);
  } else {
    existing.completed_at = progress.completed_at;
    await persistUpdate("content_progress", progress.id, { completed_at: progress.completed_at });
  }
  return progress;
}

export async function listProgressForStudent(user: SessionUser): Promise<ContentProgress[]> {
  const studentId = currentStudentId(user);
  if (!studentId) return [];
  const rows = await contentRows<ContentProgress>("content_progress", user.academy_id);
  return rows.filter((item) => item.student_id === studentId);
}

export async function listProgressForParent(user: SessionUser, studentId?: string): Promise<Array<ContentProgress & { student_name?: string }>> {
  if (user.role !== "PARENT" && !hasAcademyWideScope(user.role)) throw new Error("Only a parent or academy administrator can view progress.");
  const children = parentStudentIds(user);
  const targetIds = hasAcademyWideScope(user.role) ? new Set(collections().students.filter((s) => s.academy_id === user.academy_id).map((s) => s.id)) : children;
  if (studentId && !targetIds.has(studentId)) throw new Error("This student is outside your family scope.");
  const rows = await contentRows<ContentProgress>("content_progress", user.academy_id);
  return rows.filter((item) => targetIds.has(item.student_id) && (!studentId || item.student_id === studentId)).map((item) => ({
    ...item,
    student_name: (() => { const s = collections().students.find((student) => student.id === item.student_id); return s ? `${s.first_name} ${s.last_name}` : undefined; })(),
  }));
}

export function contentCurrentUser(): SessionUser {
  const user = getCurrentUser();
  if (!user) throw new Error("Authentication required.");
  return user;
}

export { currentAcademyId };
