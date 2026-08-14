"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, LessonsService } from "@/services";
import type { LessonInput } from "@/services/lessons";
import { audit } from "@/services/audit";

export async function createLessonAction(input: LessonInput) {
  await requireScopedRole("TEACHER");
  const l = await LessonsService.createLesson(input);
    void audit({ action: "lesson.create" });
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  return l;
}

export async function updateLessonAction(id: string, input: Partial<LessonInput>) {
  await requireScopedRole("TEACHER");
  const l = LessonsService.updateLesson(id, input);
    void audit({ action: "lesson.update" });
  revalidatePath("/lessons");
  revalidatePath(`/lessons/${id}`);
  return l;
}

export async function deleteLessonAction(id: string) {
  await requireScopedRole("TEACHER");
  LessonsService.deleteLesson(id);
    void audit({ action: "lesson.delete" });
  revalidatePath("/lessons");
}
