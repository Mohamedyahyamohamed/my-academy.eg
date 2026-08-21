"use server";

import { audit } from "@/services/audit";
import { requireScopedRole, resolveStudentForDashboard } from "@/services";
import { collections } from "@/services/data/store";
import { fetchGroupStudentIds, fetchTableRLS } from "@/services/_shared";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { measureTenantStorageUsage } from "@/lib/storage-quota";
import { getPlan } from "@/services/saas";
import { hasAllowedExtension, isWithinUploadLimit, MAX_HOMEWORK_UPLOAD_MB } from "@/lib/upload-policy";
import { detectUpload } from "@/lib/upload-validation";
import { isHomeworkStoragePath } from "@/services/homework-files";

async function homeworkUploadContext(formData: FormData) {
  const user = await requireScopedRole("STUDENT", "ADMIN", "TEACHER");
  const homeworkId = String(formData.get("homeworkId") ?? "");
  const requestedStudentId = formData.get("studentId");
  const [homeworkRows, groupRows, studentRows] = await Promise.all([
    fetchTableRLS<{ id: string; academy_id: string | null; group_id: string }>("homework", user.academy_id),
    fetchTableRLS<{ id: string; academy_id: string | null }>("groups", user.academy_id),
    fetchTableRLS<{ id: string; academy_id: string | null; email?: string | null }>("students", user.academy_id),
  ]);
  const homework = homeworkRows.find((item) => item.id === homeworkId && item.academy_id === user.academy_id);
  const group = homework ? groupRows.find((item) => item.id === homework.group_id && item.academy_id === user.academy_id) : null;
  if (!homework || !group) return { ok: false as const, error: "Homework not found." };
  const resolvedStudent = user.role === "STUDENT" ? await resolveStudentForDashboard(user) : null;
  const studentId = user.role === "STUDENT" ? resolvedStudent?.id ?? null : typeof requestedStudentId === "string" && requestedStudentId ? requestedStudentId : null;
  const student = studentId ? studentRows.find((item) => item.id === studentId && item.academy_id === user.academy_id) : null;
  const enrolledStudentIds = await fetchGroupStudentIds(homework.group_id, user.academy_id);
  const enrolled = Boolean(student && enrolledStudentIds.includes(student.id));
  if (!student || !enrolled) return { ok: false as const, error: "Student is not enrolled in this homework group." };
  if (user.role === "STUDENT" && student.email?.toLowerCase() !== user.email.toLowerCase()) return { ok: false as const, error: "You can only upload for your own account." };
  return { ok: true as const, user, homeworkId, studentId: student.id, groupId: homework.group_id };
}

function declaredHomeworkMime(fileName: string, declaredType: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const allowed: Record<string, string[]> = { pdf: ["application/pdf"], png: ["image/png"], jpg: ["image/jpeg", "image/jpg"], jpeg: ["image/jpeg", "image/jpg"], webp: ["image/webp"] };
  return hasAllowedExtension(fileName, "homework") && allowed[extension]?.includes(declaredType) ? declaredType : null;
}

async function readHomeworkStorageHead(client: ReturnType<typeof nodeSupabaseClient>, path: string) {
  if (!client) return null;
  const signed = await client.storage.from("homework").createSignedUrl(path, 120);
  if (signed.error || !signed.data?.signedUrl) return null;
  const response = await fetch(signed.data.signedUrl, { headers: { Range: "bytes=0-63" }, cache: "no-store" });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

export async function createHomeworkUploadIntent(formData: FormData) {
  const context = await homeworkUploadContext(formData);
  if (!context.ok) return context;
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = Number(formData.get("fileSize") ?? 0);
  const declaredType = String(formData.get("contentType") ?? "");
  if (!fileName || !isWithinUploadLimit(fileSize, "homework")) return { ok: false, error: `File is empty or larger than ${MAX_HOMEWORK_UPLOAD_MB}MB.` };
  const contentType = declaredHomeworkMime(fileName, declaredType);
  if (!contentType) return { ok: false, error: "Unsupported or invalid file. Upload a PDF, PNG, JPEG, or WEBP file." };
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage not configured." };
  const plan = getPlan(context.user.academy_id);
  const usage = await measureTenantStorageUsage(client, context.user.academy_id);
  if (!usage.ok) return { ok: false, error: usage.error };
  if (usage.bytes + fileSize > plan.maxStorageMb * 1024 * 1024) return { ok: false, error: `Storage quota exceeded. Your ${plan.name} plan allows ${plan.maxStorageMb} MB.` };
  const extension = fileName.split(".").pop()!.toLowerCase().replace("jpeg", "jpg");
  const path = `${context.user.academy_id}/${context.homeworkId}/${context.studentId}/${crypto.randomUUID()}.${extension}`;
  const signed = await client.storage.from("homework").createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.token) return { ok: false, error: "Could not create a signed upload URL." };
  return { ok: true as const, path, token: signed.data.token, contentType, homeworkId: context.homeworkId, studentId: context.studentId, fileName, fileSize };
}

export async function finalizeHomeworkUpload(formData: FormData) {
  const context = await homeworkUploadContext(formData);
  if (!context.ok) return context;
  const path = String(formData.get("path") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = Number(formData.get("fileSize") ?? 0);
  const declaredType = String(formData.get("contentType") ?? "");
  if (!isHomeworkStoragePath(path, context.user.academy_id, context.homeworkId, context.studentId) || !fileName || !isWithinUploadLimit(fileSize, "homework")) return { ok: false, error: "Invalid upload metadata." };
  const contentType = declaredHomeworkMime(fileName, declaredType);
  if (!contentType) return { ok: false, error: "Unsupported or invalid file." };
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage not configured." };
  const head = await readHomeworkStorageHead(client, path);
  const safeUpload = head ? detectUpload(head, fileName, contentType, "homework") : null;
  if (!safeUpload) { await client.storage.from("homework").remove([path]); return { ok: false, error: "Uploaded object failed file validation." }; }
  const inserted = await client.from("files").insert({ academy_id: context.user.academy_id, owner_id: context.user.id, name: fileName, url: path, size: fileSize, mime_type: safeUpload.contentType }).select("id").single();
  if (inserted.error) { await client.storage.from("homework").remove([path]); return { ok: false, error: "Could not record the uploaded file." }; }
  const downloadUrl = `/api/homework/files/${inserted.data.id}`;
  void audit({ action: "upload.completed", metadata: { userId: context.user.id, academyId: context.user.academy_id, directUpload: true, homeworkId: context.homeworkId, size: fileSize, fileId: inserted.data.id } }, context.user);
  return { ok: true, url: downloadUrl, fileId: inserted.data.id, name: fileName };
}

/** Upload a homework attachment using tenant-validated private storage. */
export async function uploadHomeworkFile(formData: FormData) {
  const rateLimitUser = await requireScopedRole("STUDENT", "ADMIN", "TEACHER");
  const rl = await rateLimit(`upload:${rateLimitUser.id}`, LIMITS.upload.max, LIMITS.upload.window);
  if (!rl.allowed) return { ok: false, error: "Too many uploads. Please slow down." };

  const file = formData.get("file");
  const requestedHomeworkId = formData.get("homeworkId");
  if (!(file instanceof File) || typeof requestedHomeworkId !== "string" || !requestedHomeworkId) {
    return { ok: false, error: "A file and homework are required." };
  }
  if (!isWithinUploadLimit(file.size, "homework")) {
    return { ok: false, error: `File too large or empty (max ${MAX_HOMEWORK_UPLOAD_MB}MB).` };
  }

  const context = await homeworkUploadContext(formData);
  if (!context.ok) return context;
  const { user, homeworkId, studentId } = context;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeUpload = detectUpload(bytes, file.name, file.type, "homework");
  if (!safeUpload) {
    return { ok: false, error: "Unsupported or invalid file. Upload a PDF, PNG, JPEG, or WEBP file." };
  }

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Storage not configured." };

  const plan = getPlan(user.academy_id);
  const storageUsage = await measureTenantStorageUsage(client, user.academy_id);
  if (!storageUsage.ok) return { ok: false, error: storageUsage.error };

  const incomingBytes = file.size;
  const storageLimitBytes = plan.maxStorageMb * 1024 * 1024;
  if (storageUsage.bytes + incomingBytes > storageLimitBytes) {
    return {
      ok: false,
      error: `Storage quota exceeded. Your ${plan.name} plan allows ${plan.maxStorageMb} MB.`,
    };
  }
  if (storageUsage.bytes + incomingBytes >= storageLimitBytes * 0.8) {
    void audit(
      {
        action: "storage.quota.warning",
        metadata: {
          userId: user.id,
          academyId: user.academy_id,
          usedBytes: storageUsage.bytes + incomingBytes,
          limitBytes: storageLimitBytes,
          usagePercent: Math.round(((storageUsage.bytes + incomingBytes) / storageLimitBytes) * 100),
        },
      },
      user,
    );
  }

  const path = `${user.academy_id}/${homeworkId}/${studentId}/${crypto.randomUUID()}.${safeUpload.extension}`;
  void audit(
    { action: "upload.attempt", metadata: { userId: user.id, academyId: user.academy_id } },
    user,
  );
  const { error } = await client.storage
    .from("homework")
    .upload(path, bytes, { contentType: safeUpload.contentType, upsert: false });
  if (error) return { ok: false, error: "Upload failed." };

  const fileRecord = await client.from("files").insert({
    academy_id: user.academy_id,
    owner_id: user.id,
    name: file.name,
    url: path,
    size: file.size,
    mime_type: safeUpload.contentType,
  }).select("id").single();
  if (fileRecord.error) {
    await client.storage.from("homework").remove([path]);
    return { ok: false, error: "Could not record the uploaded file." };
  }

  const fileId = fileRecord.data?.id;
  if (!fileId) {
    await client.storage.from("homework").remove([path]);
    await client.from("files").delete().eq("academy_id", user.academy_id).eq("url", path);
    return { ok: false, error: "Could not identify the uploaded file." };
  }

  void audit(
    { action: "upload.completed", metadata: { userId: user.id, academyId: user.academy_id, fileId } },
    user,
  );
  return { ok: true, url: `/api/homework/files/${fileId}`, fileId, name: file.name };
}

/**
 * Remove an upload that was interrupted before finalization or explicitly
 * detached from the submission dialog. The path, tenant, homework, student,
 * and registry owner are all revalidated server-side before deletion.
 */
export async function discardHomeworkUpload(formData: FormData) {
  const context = await homeworkUploadContext(formData);
  if (!context.ok) return context;
  const path = String(formData.get("path") ?? "");
  const fileId = String(formData.get("fileId") ?? "").trim();
  if (!isHomeworkStoragePath(path, context.user.academy_id, context.homeworkId, context.studentId)) {
    return { ok: false as const, error: "Invalid upload path." };
  }

  const client = nodeSupabaseClient();
  if (!client) return { ok: false as const, error: "Storage not configured." };

  const fileQuery = client
    .from("files")
    .select("id, url, owner_id")
    .eq("academy_id", context.user.academy_id)
    .eq("owner_id", context.user.id)
    .eq("url", path);
  const { data: file, error: fileError } = fileId
    ? await fileQuery.eq("id", fileId).maybeSingle()
    : await fileQuery.maybeSingle();
  if (fileError) return { ok: false as const, error: "Could not verify attachment state." };
  if (file && file.url !== path) return { ok: false as const, error: "Attachment not found." };

  if (file) {
    const { data: linkedSubmission, error: submissionError } = await client
      .from("homework_submissions")
      .select("id")
      .eq("file_id", file.id)
      .limit(1)
      .maybeSingle();
    if (submissionError) return { ok: false as const, error: "Could not verify attachment state." };
    if (linkedSubmission) return { ok: false as const, error: "Submitted attachments cannot be detached." };

    const { error: deleteFileError } = await client
      .from("files")
      .delete()
      .eq("id", file.id)
      .eq("academy_id", context.user.academy_id)
      .eq("owner_id", context.user.id);
    if (deleteFileError) return { ok: false as const, error: "Could not remove the file record." };
  } else if (fileId) {
    return { ok: false as const, error: "Attachment not found." };
  }

  const { error: storageError } = await client.storage.from("homework").remove([path]);
  if (storageError) return { ok: false as const, error: "Could not remove the uploaded object." };
  void audit({ action: "upload.discarded", metadata: { userId: context.user.id, academyId: context.user.academy_id, homeworkId: context.homeworkId, fileId: fileId || null } }, context.user);
  return { ok: true as const };
}
