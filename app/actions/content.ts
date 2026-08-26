"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/services/audit";
import { requireScopedRole, isLimitedAssistant } from "@/services/session";
import { setRequestContext } from "@/services/request-context";
import * as ContentService from "@/services/content";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { measureTenantStorageUsage } from "@/lib/storage-quota";
import { getPlan } from "@/services/saas";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { can } from "@/lib/permissions";
import { hasAllowedExtension, isWithinUploadLimit, MAX_CONTENT_UPLOAD_MB } from "@/lib/upload-policy";
import { detectUpload } from "@/lib/upload-validation";

const CONTENT_STORAGE_TIMEOUT_MS = 20_000;
type ContentInsertResult = { data: { id: string } | null; error: { message?: string } | null };

async function withContentTimeout<T>(operation: PromiseLike<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out.`)), CONTENT_STORAGE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function contentPaths(courseId: string) {
  return ["/teacher/content", `/teacher/content/${courseId}`, `/student/content`, `/student/content/${courseId}`];
}

export async function createContentCourseAction(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  setRequestContext(user);
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
  setRequestContext(user);
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

async function contentUploadContext(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) return { ok: false as const, error: "Assistant accounts cannot upload content." };
  if (!can(user, "content.upload")) return { ok: false as const, error: "You are not allowed to upload content." };
  const courseId = String(formData.get("courseId") ?? "");
  const lessonIdRaw = String(formData.get("lessonId") ?? "");
  const lessonId = lessonIdRaw || null;
  const course = courseId ? await ContentService.getCourse(courseId, user) : null;
  if (!course) return { ok: false as const, error: "Course not found or outside your scope." };
  if (lessonId && !course.lessons?.some((lesson) => lesson.id === lessonId)) return { ok: false as const, error: "Lesson not found or outside your course." };
  return { ok: true as const, user, courseId, lessonId };
}

function declaredContentMime(fileName: string, declaredType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const allowed: Record<string, string[]> = {
    pdf: ["application/pdf"],
    png: ["image/png"],
    jpg: ["image/jpeg", "image/jpg"],
    jpeg: ["image/jpeg", "image/jpg"],
    webp: ["image/webp"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    mp4: ["video/mp4", "application/mp4"],
  };
  return hasAllowedExtension(fileName, "content") && allowed[extension]?.includes(declaredType) ? declaredType : null;
}

async function readStorageHead(client: ReturnType<typeof nodeSupabaseClient>, bucket: string, path: string) {
  if (!client) return null;
  const signed = await withContentTimeout<{ data: { signedUrl: string } | null; error: { message?: string } | null }>(client.storage.from(bucket).createSignedUrl(path, 120), "Creating a signed read URL");
  if (signed.error || !signed.data?.signedUrl) return null;
  const response = await withContentTimeout(fetch(signed.data.signedUrl, { headers: { Range: "bytes=0-63" }, cache: "no-store" }), "Reading uploaded file metadata");
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

export async function createContentUploadIntent(formData: FormData) {
  const context = await contentUploadContext(formData);
  if (!context.ok) return context;
  const user = context.user;
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = Number(formData.get("fileSize") ?? 0);
  const declaredType = String(formData.get("contentType") ?? "");
  if (!fileName || !isWithinUploadLimit(fileSize, "content")) return { ok: false, error: `File is empty or larger than ${MAX_CONTENT_UPLOAD_MB}MB.` };
  const contentType = declaredContentMime(fileName, declaredType);
  if (!contentType) return { ok: false, error: "Unsupported file type." };
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage is not configured." };
  const usage = await measureTenantStorageUsage(client, user.academy_id);
  if (!usage.ok) return { ok: false, error: usage.error };
  const plan = getPlan(user.academy_id);
  const limitBytes = plan.maxStorageMb * 1024 * 1024;
  if (usage.bytes + fileSize > limitBytes) return { ok: false, error: `Storage quota exceeded. Your plan allows ${plan.maxStorageMb} MB.` };
  const extension = fileName.split(".").pop()!.toLowerCase().replace("jpeg", "jpg");
  const path = `${user.academy_id}/courses/${context.courseId}/${crypto.randomUUID()}.${extension}`;
  let signed: { data: { token: string } | null; error: { message?: string } | null };
  try {
    signed = await withContentTimeout<{ data: { token: string } | null; error: { message?: string } | null }>(client.storage.from("content").createSignedUploadUrl(path, { upsert: false }), "Creating a signed upload URL");
  } catch (error) {
    console.error("[content upload intent]", (error as Error)?.message);
    return { ok: false, error: "Storage is taking too long to respond. Please try again." };
  }
  if (signed.error || !signed.data?.token) return { ok: false, error: "Could not create a signed upload URL." };
  return { ok: true as const, path, token: signed.data.token, contentType, courseId: context.courseId, lessonId: context.lessonId, fileName, fileSize };
}

export async function finalizeContentUpload(formData: FormData) {
  const context = await contentUploadContext(formData);
  if (!context.ok) return context;
  const user = context.user;
  const path = String(formData.get("path") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = Number(formData.get("fileSize") ?? 0);
  const declaredType = String(formData.get("contentType") ?? "");
  const prefix = `${user.academy_id}/courses/${context.courseId}/`;
  if (!path.startsWith(prefix) || path.includes("..") || !fileName || !isWithinUploadLimit(fileSize, "content")) return { ok: false, error: "Invalid upload metadata." };
  const contentType = declaredContentMime(fileName, declaredType);
  if (!contentType) return { ok: false, error: "Unsupported file type." };
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage is not configured." };
  let head: Uint8Array | null = null;
  try {
    head = await readStorageHead(client, "content", path);
  } catch (error) {
    console.error("[content upload validation]", (error as Error)?.message);
    await withContentTimeout(client.storage.from("content").remove([path]), "Cleaning up uploaded content").catch(() => undefined);
    return { ok: false, error: "Storage validation is taking too long. Please try again." };
  }
  const safeUpload = head ? detectUpload(head, fileName, contentType, "content") : null;
  if (!safeUpload) {
    await withContentTimeout(client.storage.from("content").remove([path]), "Cleaning up uploaded content").catch(() => undefined);
    return { ok: false, error: "Uploaded object failed file validation." };
  }
  let inserted: ContentInsertResult;
  try {
    inserted = await withContentTimeout<ContentInsertResult>(client.from("content_files").insert({ academy_id: user.academy_id, course_id: context.courseId, lesson_id: context.lessonId, owner_id: user.id, name: fileName, storage_path: path, size: fileSize, mime_type: safeUpload.contentType }).select("id").single(), "Recording uploaded content");
  } catch (error) {
    console.error("[content upload record]", (error as Error)?.message);
    await withContentTimeout(client.storage.from("content").remove([path]), "Cleaning up uploaded content").catch(() => undefined);
    return { ok: false, error: "Recording the upload is taking too long. Please try again." };
  }
  if (inserted.error || !inserted.data?.id) {
    await withContentTimeout(client.storage.from("content").remove([path]), "Cleaning up uploaded content").catch(() => undefined);
    return { ok: false, error: "Could not record the uploaded file." };
  }
  const downloadUrl = `/api/content/files/${inserted.data.id}`;
  for (const pathToRevalidate of contentPaths(context.courseId)) revalidatePath(pathToRevalidate);
  await audit({ action: "content.file.uploaded", metadata: { courseId: context.courseId, lessonId: context.lessonId, size: fileSize, mimeType: safeUpload.contentType, directUpload: true, fileId: inserted.data.id } }, user);
  return { ok: true, url: downloadUrl, name: fileName, fileId: inserted.data.id };
}

export async function uploadContentFile(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) return { ok: false, error: "Assistant accounts cannot upload content." };
  if (!can(user, "content.upload")) return { ok: false, error: "You are not allowed to upload content." };
  const rl = await rateLimit(`content-upload:${user.id}`, LIMITS.upload.max, LIMITS.upload.window);
  if (!rl.allowed) return { ok: false, error: "Too many uploads. Please slow down." };

  const file = formData.get("file");
  const courseId = String(formData.get("courseId") ?? "");
  const lessonIdRaw = String(formData.get("lessonId") ?? "");
  const lessonId = lessonIdRaw || null;
  if (!(file instanceof File) || !courseId) return { ok: false, error: "A file and course are required." };
  if (!isWithinUploadLimit(file.size, "content")) return { ok: false, error: `File is empty or larger than ${MAX_CONTENT_UPLOAD_MB}MB.` };

  const course = await ContentService.getCourse(courseId, user);
  if (!course) return { ok: false, error: "Course not found or outside your scope." };
  if (lessonId && !course.lessons?.some((lesson) => lesson.id === lessonId)) return { ok: false, error: "Lesson not found or outside your course." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeUpload = detectUpload(bytes, file.name, file.type, "content");
  if (!safeUpload) return { ok: false, error: "Unsupported or invalid file. Upload PDF, PNG, JPEG, WEBP, DOCX, or MP4." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage is not configured." };
  const plan = getPlan(user.academy_id);
  const usage = await measureTenantStorageUsage(client, user.academy_id);
  if (!usage.ok) return { ok: false, error: usage.error };
  const limitBytes = plan.maxStorageMb * 1024 * 1024;
  if (usage.bytes + file.size > limitBytes) return { ok: false, error: `Storage quota exceeded. Your plan allows ${plan.maxStorageMb} MB.` };

  const path = `${user.academy_id}/courses/${courseId}/${crypto.randomUUID()}.${safeUpload.extension}`;
  let uploaded: { error: { message?: string } | null };
  try {
    uploaded = await withContentTimeout<{ error: { message?: string } | null }>(client.storage.from("content").upload(path, bytes, { contentType: safeUpload.contentType, upsert: false }), "Uploading content");
  } catch (error) {
    console.error("[content upload]", (error as Error)?.message);
    return { ok: false, error: "Storage is taking too long to respond. Please try again." };
  }
  if (uploaded.error) return { ok: false, error: "Upload failed." };

  let inserted: ContentInsertResult;
  try {
    inserted = await withContentTimeout<ContentInsertResult>(client.from("content_files").insert({
    academy_id: user.academy_id,
    course_id: courseId,
    lesson_id: lessonId,
    owner_id: user.id,
    name: file.name,
    storage_path: path,
    size: file.size,
    mime_type: safeUpload.contentType,
    }).select("id").single(), "Recording uploaded content");
  } catch (error) {
    console.error("[content upload record]", (error as Error)?.message);
    await withContentTimeout(client.storage.from("content").remove([path]), "Cleaning up uploaded content").catch(() => undefined);
    return { ok: false, error: "Recording the upload is taking too long. Please try again." };
  }
  if (inserted.error || !inserted.data?.id) {
    await withContentTimeout(client.storage.from("content").remove([path]), "Cleaning up uploaded content").catch(() => undefined);
    return { ok: false, error: "Could not record the uploaded file." };
  }

  const downloadUrl = `/api/content/files/${inserted.data.id}`;
  for (const pathToRevalidate of contentPaths(courseId)) revalidatePath(pathToRevalidate);
  await audit({ action: "content.file.uploaded", metadata: { courseId, lessonId, size: file.size, mimeType: safeUpload.contentType, fileId: inserted.data.id } }, user);
  return { ok: true, url: downloadUrl, name: file.name, fileId: inserted.data.id };
}

export async function addContentLink(formData: FormData) {
  const user = await requireScopedRole("TEACHER", "ADMIN");
  setRequestContext(user);
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
  setRequestContext(user);
  const lessonId = String(formData.get("lessonId") ?? "");
  const result = await ContentService.markLessonComplete(lessonId, user);
  revalidatePath("/student/content");
  revalidatePath(`/student/content/${String(formData.get("courseId") ?? "")}`);
  await audit({ action: "content.lesson.completed", metadata: { lessonId: result.lesson_id } }, user);
  return { ok: true };
}
