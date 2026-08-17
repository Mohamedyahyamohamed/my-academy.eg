"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/services/audit";
import { requireScopedRole, isLimitedAssistant } from "@/services/session";
import * as ContentService from "@/services/content";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { measureTenantStorageUsage } from "@/lib/storage-quota";
import { getPlan } from "@/services/saas";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { can } from "@/lib/permissions";

const MAX_CONTENT_FILE_SIZE = 500 * 1024 * 1024;

type SafeContentUpload = { contentType: string; extension: string };

function detectContentUpload(bytes: Uint8Array, fileName: string, declaredType: string): SafeContentUpload | null {
  const lowerName = fileName.toLowerCase();
  const startsWith = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const isPdf = startsWith([0x25, 0x50, 0x44, 0x46]);
  const isPng = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isJpeg = startsWith([0xff, 0xd8, 0xff]);
  const isWebp = startsWith([0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12 && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const isZip = startsWith([0x50, 0x4b, 0x03, 0x04]);
  const isMp4 = bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";

  if (isPdf && lowerName.endsWith(".pdf") && declaredType === "application/pdf") return { contentType: "application/pdf", extension: "pdf" };
  if (isPng && lowerName.endsWith(".png") && declaredType === "image/png") return { contentType: "image/png", extension: "png" };
  if (isJpeg && /\.(jpe?g)$/.test(lowerName) && ["image/jpeg", "image/jpg"].includes(declaredType)) return { contentType: "image/jpeg", extension: "jpg" };
  if (isWebp && lowerName.endsWith(".webp") && declaredType === "image/webp") return { contentType: "image/webp", extension: "webp" };
  if (isZip && lowerName.endsWith(".docx") && declaredType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return { contentType: declaredType, extension: "docx" };
  if (isMp4 && lowerName.endsWith(".mp4") && ["video/mp4", "application/mp4"].includes(declaredType)) return { contentType: "video/mp4", extension: "mp4" };
  return null;
}

function contentPaths(courseId: string) {
  return ["/teacher/content", `/teacher/content/${courseId}`, `/student/content`, `/student/content/${courseId}`];
}

export async function createContentCourseAction(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  if (await isLimitedAssistant(user)) return { ok: false, error: "Assistant accounts cannot create content courses." };
  const result = await ContentService.createCourse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    group_id: String(formData.get("groupId") ?? ""),
    sort_order: Number(formData.get("sortOrder") ?? 0),
    is_published: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  }, user);
  revalidatePath("/teacher/content");
  await audit({ action: "content.course.created", metadata: { courseId: result.id, groupId: result.group_id } }, user);
  return { ok: true, courseId: result.id };
}

export async function createContentLessonAction(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  if (await isLimitedAssistant(user)) return { ok: false, error: "Assistant accounts cannot create content lessons." };
  const result = await ContentService.createLesson({
    course_id: String(formData.get("courseId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    video_url: String(formData.get("videoUrl") ?? ""),
    sort_order: Number(formData.get("sortOrder") ?? 0),
    is_published: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  }, user);
  revalidatePath(`/teacher/content/${result.course_id}`);
  revalidatePath(`/student/content/${result.course_id}`);
  await audit({ action: "content.lesson.created", metadata: { lessonId: result.id, courseId: result.course_id } }, user);
  return { ok: true, lessonId: result.id };
}

export async function uploadContentFile(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  if (await isLimitedAssistant(user)) return { ok: false, error: "Assistant accounts cannot upload content." };
  if (!can(user, "content.upload")) return { ok: false, error: "You are not allowed to upload content." };
  const rl = await rateLimit(`content-upload:${user.id}`, LIMITS.upload.max, LIMITS.upload.window);
  if (!rl.allowed) return { ok: false, error: "Too many uploads. Please slow down." };

  const file = formData.get("file");
  const courseId = String(formData.get("courseId") ?? "");
  const lessonIdRaw = String(formData.get("lessonId") ?? "");
  const lessonId = lessonIdRaw || null;
  if (!(file instanceof File) || !courseId) return { ok: false, error: "A file and course are required." };
  if (file.size <= 0 || file.size > MAX_CONTENT_FILE_SIZE) return { ok: false, error: "File is empty or larger than 500MB." };

  const course = await ContentService.getCourse(courseId, user);
  if (!course) return { ok: false, error: "Course not found or outside your scope." };
  if (lessonId && !course.lessons?.some((lesson) => lesson.id === lessonId)) return { ok: false, error: "Lesson not found or outside your course." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeUpload = detectContentUpload(bytes, file.name, file.type);
  if (!safeUpload) return { ok: false, error: "Unsupported or invalid file. Upload PDF, PNG, JPEG, WEBP, DOCX, or MP4." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage is not configured." };
  const plan = getPlan(user.academy_id);
  const usage = await measureTenantStorageUsage(client, user.academy_id);
  if (!usage.ok) return { ok: false, error: usage.error };
  const limitBytes = plan.maxStorageMb * 1024 * 1024;
  if (usage.bytes + file.size > limitBytes) return { ok: false, error: `Storage quota exceeded. Your plan allows ${plan.maxStorageMb} MB.` };

  const path = `${user.academy_id}/courses/${courseId}/${crypto.randomUUID()}.${safeUpload.extension}`;
  const uploaded = await client.storage.from("content").upload(path, bytes, { contentType: safeUpload.contentType, upsert: false });
  if (uploaded.error) return { ok: false, error: "Upload failed." };

  const inserted = await client.from("content_files").insert({
    academy_id: user.academy_id,
    course_id: courseId,
    lesson_id: lessonId,
    owner_id: user.id,
    name: file.name,
    storage_path: path,
    size: file.size,
    mime_type: safeUpload.contentType,
  }).select("id").single();
  if (inserted.error) {
    await client.storage.from("content").remove([path]);
    return { ok: false, error: "Could not record the uploaded file." };
  }

  const signed = await client.storage.from("content").createSignedUrl(path, 3600);
  if (signed.error || !signed.data?.signedUrl) {
    await client.storage.from("content").remove([path]);
    await client.from("content_files").delete().eq("id", inserted.data.id).eq("academy_id", user.academy_id);
    return { ok: false, error: "Could not create a private download link." };
  }

  for (const pathToRevalidate of contentPaths(courseId)) revalidatePath(pathToRevalidate);
  await audit({ action: "content.file.uploaded", metadata: { courseId, lessonId, size: file.size, mimeType: safeUpload.contentType } }, user);
  return { ok: true, url: signed.data.signedUrl, name: file.name, fileId: inserted.data.id };
}

export async function addContentLink(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  if (await isLimitedAssistant(user)) return { ok: false, error: "Assistant accounts cannot add content links." };
  if (!can(user, "content.upload")) return { ok: false, error: "You are not allowed to add content links." };
  const courseId = String(formData.get("courseId") ?? "");
  const lessonIdRaw = String(formData.get("lessonId") ?? "");
  const lessonId = lessonIdRaw || null;
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!title || !url || !/^https?:\/\//i.test(url)) return { ok: false, error: "A title and a valid HTTP/HTTPS link are required." };
  const course = await ContentService.getCourse(courseId, user);
  if (!course) return { ok: false, error: "Course not found or outside your scope." };
  if (lessonId && !course.lessons?.some((lesson) => lesson.id === lessonId)) return { ok: false, error: "Lesson not found or outside your course." };
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Database is not configured." };
  const inserted = await client.from("content_links").insert({ academy_id: user.academy_id, course_id: courseId, lesson_id: lessonId, owner_id: user.id, title, url }).select("id").single();
  if (inserted.error) return { ok: false, error: "Could not save the content link." };
  for (const pathToRevalidate of contentPaths(courseId)) revalidatePath(pathToRevalidate);
  await audit({ action: "content.link.created", metadata: { courseId, lessonId, linkId: inserted.data.id } }, user);
  return { ok: true, linkId: inserted.data.id };
}

export async function markLessonCompleteAction(formData: FormData) {
  const user = await requireScopedRole("STUDENT");
  const lessonId = String(formData.get("lessonId") ?? "");
  const result = await ContentService.markLessonComplete(lessonId, user);
  revalidatePath("/student/content");
  revalidatePath(`/student/content/${String(formData.get("courseId") ?? "")}`);
  await audit({ action: "content.lesson.completed", metadata: { lessonId: result.lesson_id } }, user);
  return { ok: true };
}
