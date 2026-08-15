"use server";

import { audit } from "@/services/audit";
import { requireScopedRole, resolveStudent } from "@/services";
import { collections } from "@/services/data/store";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { measureTenantStorageUsage } from "@/lib/storage-quota";
import { getPlan } from "@/services/saas";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type SafeUpload = { contentType: string; extension: string };

function detectSafeUpload(bytes: Uint8Array, fileName: string, declaredType: string): SafeUpload | null {
  const lowerName = fileName.toLowerCase();
  const startsWith = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const isPdf = startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]);
  const isPng = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isJpeg = startsWith([0xff, 0xd8, 0xff]);
  const isWebp = startsWith([0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isPdf && lowerName.endsWith(".pdf") && declaredType === "application/pdf") {
    return { contentType: "application/pdf", extension: "pdf" };
  }
  if (isPng && lowerName.endsWith(".png") && declaredType === "image/png") {
    return { contentType: "image/png", extension: "png" };
  }
  if (isJpeg && /\.(jpe?g)$/.test(lowerName) && ["image/jpeg", "image/jpg"].includes(declaredType)) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (isWebp && lowerName.endsWith(".webp") && declaredType === "image/webp") {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

/** Upload a homework attachment using tenant-validated private storage. */
export async function uploadHomeworkFile(formData: FormData) {
  const user = await requireScopedRole("STUDENT", "ADMIN", "TEACHER");
  const rl = await rateLimit(`upload:${user.id}`, LIMITS.upload.max, LIMITS.upload.window);
  if (!rl.allowed) return { ok: false, error: "Too many uploads. Please slow down." };

  const file = formData.get("file");
  const homeworkId = formData.get("homeworkId");
  if (!(file instanceof File) || typeof homeworkId !== "string" || !homeworkId) {
    return { ok: false, error: "A file and homework are required." };
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "File too large or empty (max 10MB)." };
  }

  const homework = collections().homework.find(
    (item) => item.id === homeworkId && item.academy_id === user.academy_id,
  );
  const group = homework
    ? collections().groups.find((item) => item.id === homework.group_id && item.academy_id === user.academy_id)
    : null;
  if (!homework || !group) return { ok: false, error: "Homework not found." };

  let studentId: string | null = null;
  if (user.role === "STUDENT") {
    studentId = resolveStudent(user)?.id ?? null;
  } else {
    const requestedStudentId = formData.get("studentId");
    studentId = typeof requestedStudentId === "string" && requestedStudentId ? requestedStudentId : null;
  }
  const student = studentId
    ? collections().students.find((item) => item.id === studentId && item.academy_id === user.academy_id)
    : null;
  const enrolled = Boolean(student && collections().groupStudents.some(
    (item) => item.group_id === homework.group_id && item.student_id === student.id,
  ));
  if (!student || !enrolled) return { ok: false, error: "Student is not enrolled in this homework group." };
  if (user.role === "STUDENT" && student.email?.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "You can only upload for your own account." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeUpload = detectSafeUpload(bytes, file.name, file.type);
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

  const path = `${user.academy_id}/${homeworkId}/${student.id}/${crypto.randomUUID()}.${safeUpload.extension}`;
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
  });
  if (fileRecord.error) {
    await client.storage.from("homework").remove([path]);
    return { ok: false, error: "Could not record the uploaded file." };
  }

  const signed = await client.storage.from("homework").createSignedUrl(path, 3600);
  if (signed.error || !signed.data?.signedUrl) {
    await client.storage.from("homework").remove([path]);
    await client.from("files").delete().eq("academy_id", user.academy_id).eq("url", path);
    return { ok: false, error: "Could not create a private download link." };
  }

  void audit(
    { action: "upload.completed", metadata: { userId: user.id, academyId: user.academy_id } },
    user,
  );
  return { ok: true, url: signed.data.signedUrl, name: file.name };
}
