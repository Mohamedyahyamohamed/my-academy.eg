"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, GradesService, isLimitedAssistant } from "@/services";
import type { ExamInput } from "@/services/grades";

export async function createExamAction(input: ExamInput) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");
  const e = await GradesService.createExam(input);
  revalidatePath("/grades");
  return e;
}

export async function deleteExamAction(id: string) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage grades.");
  await GradesService.deleteExam(id);
  revalidatePath("/grades");
}

export async function saveGradesAction(
  examId: string,
  entries: { studentId: string; score: number }[],
) {
  const user = await requireScopedRole("TEACHER");
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
    revalidatePath("/dashboard");
  }
  return res;
}
