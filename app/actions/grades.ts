"use server";

import { revalidatePath } from "next/cache";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { measureTenantStorageUsage } from "@/lib/storage-quota";
import { getPlan } from "@/services/saas";
import { requireScopedRole, GradesService, isLimitedAssistant } from "@/services";
import { setRequestContext } from "@/services/request-context";
import type { ExamInput } from "@/services/grades";

export async function createExamAction(input: ExamInput) {
  const user = await requireScopedRole("TEACHER");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");
  const e = await GradesService.createExam(input);
  revalidatePath("/grades");
  revalidatePath(`/groups/${input.group_id}`);
  return e;
}

export async function deleteExamAction(id: string) {
  const user = await requireScopedRole("TEACHER");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");

  // Clean up uploaded exam papers (storage objects + registry rows) so no orphans remain.
  const client = nodeSupabaseClient();
  let deletedPapers = 0;
  if (client) {
    const { data: papers } = await client
      .from("files")
      .select("id, url")
      .eq("exam_id", id)
      .eq("academy_id", user.academy_id!);
    if (papers && papers.length > 0) {
      const paths = papers.map((f: { url: string | null }) => f.url).filter((u: string | null): u is string => Boolean(u));
      if (paths.length > 0) await client.storage.from("exam-papers").remove(paths);
      await client.from("files").delete().eq("exam_id", id).eq("academy_id", user.academy_id!);
      deletedPapers = papers.length;
    }
  }

  await GradesService.deleteExam(id);
  revalidatePath("/grades");
  revalidatePath("/dashboard");
  return { ok: true as const, deletedPapers };
}

export async function saveGradesAction(
  examId: string,
  entries: { studentId: string; score: number; notes?: string | null }[],
) {
  const user = await requireScopedRole("TEACHER");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");
  const res = await GradesService.saveGrades(examId, entries);
  if (res.ok) {
    await import("@/services/audit").then((m) => m.audit(
      { action: "grades.save", entity_type: "exam", entity_id: examId, new_data: { count: entries.length } },
      user,
    ));
    // إشعار Push لأولياء الأمور
    const { notifyAcademy } = await import("@/services/push");
    void notifyAcademy(user.academy_id, "📊 درجات جديدة", `تم تسجيل درجات ${entries.length} طالب في الامتحان.`);
    // WhatsApp notifications remain post-launch and are intentionally disabled
    // during production audit/testing; the in-app notification above is retained.
    revalidatePath("/grades");
    revalidatePath(`/exams/${examId}`);
    revalidatePath(`/grades/${examId}`);
    revalidatePath("/dashboard");
  }
  return res;
}


const EXAM_PAPER_MAX_MB = 10;
const EXAM_PAPER_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function examPaperMime(fileName: string): string | null {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  return EXAM_PAPER_TYPES[ext] ?? null;
}

/** Teacher uploads an exam sheet (image/PDF) students can review later. */
export async function uploadExamPaperAction(formData: FormData) {
  const user = await requireScopedRole("TEACHER");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");

  const examId = String(formData.get("examId") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = Number(formData.get("fileSize") ?? 0);
  if (!examId || !fileName) return { ok: false as const, error: "Missing exam or file." };
  const mime = examPaperMime(fileName);
  if (!mime) return { ok: false as const, error: "Only PDF, PNG, JPG, or WEBP files are allowed." };
  if (!fileSize || fileSize > EXAM_PAPER_MAX_MB * 1024 * 1024)
    return { ok: false as const, error: `File must be smaller than ${EXAM_PAPER_MAX_MB}MB.` };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false as const, error: "Storage is not configured." };
  const { data: exam, error: examError } = await client
    .from("exams")
    .select("id, academy_id")
    .eq("id", examId)
    .eq("academy_id", user.academy_id!)
    .maybeSingle();
  if (examError || !exam) return { ok: false as const, error: "Exam not found." };

  const usage = await measureTenantStorageUsage(client, user.academy_id!);
  if (!usage.ok) return { ok: false as const, error: usage.error };
  const plan = getPlan(user.academy_id!);
  if (usage.bytes + fileSize > plan.maxStorageMb * 1024 * 1024)
    return { ok: false as const, error: `Storage quota exceeded. Your plan allows ${plan.maxStorageMb} MB.` };

  const ext = (fileName.split(".").pop() ?? "pdf").toLowerCase();
  const path = `${user.academy_id}/exams/${examId}/${crypto.randomUUID()}.${ext}`;
  const signed = await client.storage.from("exam-papers").createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.token) return { ok: false as const, error: "Could not create the upload URL." };

  return {
    ok: true as const,
    path,
    token: signed.data.token,
    bucket: "exam-papers",
    contentType: mime,
  };
}

/** Register the uploaded exam paper so students can see it. */
export async function finalizeExamPaperUploadAction(formData: FormData) {
  const user = await requireScopedRole("TEACHER");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");

  const client = nodeSupabaseClient();
  if (!client) return { ok: false as const, error: "Storage is not configured." };

  const examId = String(formData.get("examId") ?? "");
  const path = String(formData.get("path") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = Number(formData.get("fileSize") ?? 0);
  const mime = examPaperMime(fileName);
  const prefix = `${user.academy_id}/exams/${examId}/`;
  if (!examId || !mime || !path.startsWith(prefix) || path.includes(".."))
    return { ok: false as const, error: "Invalid upload metadata." };

  const { data: exam, error: examError } = await client
    .from("exams")
    .select("id")
    .eq("id", examId)
    .eq("academy_id", user.academy_id!)
    .maybeSingle();
  if (examError || !exam) return { ok: false as const, error: "Exam not found." };

  const insert = await client.from("files").insert({
    academy_id: user.academy_id,
    owner_id: user.id,
    name: fileName,
    url: path,
    size: fileSize,
    mime_type: mime,
    exam_id: examId,
  });
  if (insert.error) return { ok: false as const, error: insert.error.message };

  revalidatePath(`/grades/${examId}`);
  revalidatePath("/grades");
  return { ok: true as const };
}

/** Remove an exam paper attachment. */
export async function deleteExamPaperAction(fileId: string, examId: string) {
  const user = await requireScopedRole("TEACHER");
  setRequestContext(user);
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");
  const client = nodeSupabaseClient();
  if (!client) throw new Error("Storage is not configured.");

  const { data: file } = await client
    .from("files")
    .select("id, url, exam_id")
    .eq("id", fileId)
    .eq("academy_id", user.academy_id!)
    .eq("exam_id", examId)
    .maybeSingle();
  if (!file) throw new Error("File not found.");

  await client.storage.from("exam-papers").remove([file.url]);
  await client.from("files").delete().eq("id", fileId);

  revalidatePath(`/grades/${examId}`);
  revalidatePath("/grades");
  return { ok: true as const };
}
