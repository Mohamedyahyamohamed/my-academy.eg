"use server";

import { revalidatePath } from "next/cache";
import { requireRole, GradesService } from "@/services";
import type { ExamInput } from "@/services/grades";

export async function createExamAction(input: ExamInput) {
  requireRole("ADMIN", "TEACHER");
  const e = await GradesService.createExam(input);
  revalidatePath("/grades");
  return e;
}

export async function deleteExamAction(id: string) {
  requireRole("ADMIN", "TEACHER");
  GradesService.deleteExam(id);
  revalidatePath("/grades");
}

export async function saveGradesAction(
  examId: string,
  entries: { studentId: string; score: number }[],
) {
  const user = requireRole("ADMIN", "TEACHER");
  const res = GradesService.saveGrades(examId, entries);
  if (res.ok) {
    await import("@/services/audit").then((m) => m.audit(
      { action: "grades.save", entity_type: "exam", entity_id: examId, new_data: { count: entries.length } },
      user,
    ));
    // إشعار Push لأولياء الأمور
    const { notifyAcademy } = await import("@/services/push");
    void notifyAcademy(user.academy_id, "📊 درجات جديدة", `تم تسجيل درجات ${entries.length} طالب في الامتحان.`);
    // إشعار واتساب لأولياء أمور الطلاب المُقيّمة درجاتهم
    const { notifyParentsWhatsApp } = await import("@/services/whatsapp");
    void notifyParentsWhatsApp(
      entries.map((e) => e.studentId),
      "📊 درجات جديدة",
      () => "تم تسجيل درجات جديدة لابنك. برجاء متابعة بوابة أولياء الأمور.",
    );
    revalidatePath("/grades");
    revalidatePath(`/exams/${examId}`);
    revalidatePath("/dashboard");
  }
  return res;
}
