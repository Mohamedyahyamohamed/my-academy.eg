"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, LessonsService, isLimitedAssistant } from "@/services";
import type { LessonInput } from "@/services/lessons";
import { audit } from "@/services/audit";
import { setRequestContext } from "@/services/request-context";

export async function createLessonAction(input: LessonInput) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage lessons.");
  setRequestContext(user);
  const l = await LessonsService.createLesson(input);
  await audit({ action: "lesson.create" });
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  return l;
}

export async function updateLessonAction(id: string, input: Partial<LessonInput>) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage lessons.");
  setRequestContext(user);
  const l = await LessonsService.updateLesson(id, input);
  await audit({ action: "lesson.update" });
  revalidatePath("/lessons");
  revalidatePath(`/lessons/${id}`);
  return l;
}

export async function cancelLessonAction(id: string, reason?: string) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot cancel lessons.");
  setRequestContext(user);
  const lesson = await LessonsService.cancelLesson(id, reason);
  if (!lesson) throw new Error("Lesson was not found in the authenticated academy.");
  await audit({
    action: "lesson.cancel",
    entity_type: "lesson",
    entity_id: id,
    new_data: { cancellation_reason: lesson.cancellation_reason },
  }, user);
  revalidatePath("/lessons");
  revalidatePath(`/lessons/${id}`);
  revalidatePath("/dashboard");
  revalidatePath(`/groups/${lesson.group_id}`);
  return lesson;
}

export async function deleteLessonAction(id: string) {
  const user = await requireScopedRole("TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage lessons.");
  setRequestContext(user);
  await LessonsService.deleteLesson(id);
  await audit({ action: "lesson.delete" });
  revalidatePath("/lessons");
}
