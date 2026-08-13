"use server";

import { revalidatePath } from "next/cache";
import { MiscService, requireScopedRole } from "@/services";
import type { AcademyValues, CourseValues } from "@/schemas";
import { audit } from "@/services/audit";

export async function updateAcademyAction(input: AcademyValues) {
  await requireScopedRole("ADMIN");
  MiscService.updateAcademy(input);
    void audit({ action: "settings.update_academy" });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function completeOnboardingAction(metadata: { hasAcademy: boolean; hasCourse: boolean; hasGroup: boolean; importedStudents?: number }) {
  const user = await requireScopedRole("ADMIN");
  void audit({ action: "onboarding.complete", entity_type: "academy", metadata });
  return { ok: true, userId: user.id };
}

export async function createCourseAction(input: CourseValues) {
  await requireScopedRole("ADMIN", "TEACHER");
  const c = await MiscService.createCourse(input);
    void audit({ action: "course.create" });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return c;
}

export async function updateCourseAction(id: string, input: Partial<CourseValues>) {
  await requireScopedRole("ADMIN");
  MiscService.updateCourse(id, input);
  revalidatePath("/settings");
}

export async function deleteCourseAction(id: string) {
  await requireScopedRole("ADMIN");
  MiscService.deleteCourse(id);
  revalidatePath("/settings");
}
