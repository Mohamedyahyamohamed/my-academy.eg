"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, LessonsService, isLimitedAssistant } from "@/services";
import type { LessonInput } from "@/services/lessons";
import { audit } from "@/services/audit";

export async function createLessonAction(input: LessonInput) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage lessons.");
  const l = await LessonsService.createLesson(input);
  await audit({ action: "lesson.create" });
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  return l;
}

export async function updateLessonAction(id: string, input: Partial<LessonInput>) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage lessons.");
  const l = await LessonsService.updateLesson(id, input);
  await audit({ action: "lesson.update" });
  revalidatePath("/lessons");
  revalidatePath(`/lessons/${id}`);
  return l;
}

export async function deleteLessonAction(id: string) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage lessons.");
  await LessonsService.deleteLesson(id);
  await audit({ action: "lesson.delete" });
  revalidatePath("/lessons");
}
