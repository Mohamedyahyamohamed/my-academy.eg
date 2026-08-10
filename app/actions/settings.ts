"use server";

import { revalidatePath } from "next/cache";
import { MiscService, requireRole } from "@/services";
import type { AcademyValues, CourseValues } from "@/schemas";
import { audit } from "@/services/audit";

export async function updateAcademyAction(input: AcademyValues) {
  requireRole("ADMIN");
  MiscService.updateAcademy(input);
    void audit({ action: "settings.update_academy" });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function createCourseAction(input: CourseValues) {
  requireRole("ADMIN", "TEACHER");
  const c = await MiscService.createCourse(input);
    void audit({ action: "course.create" });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return c;
}

export async function updateCourseAction(id: string, input: Partial<CourseValues>) {
  requireRole("ADMIN");
  MiscService.updateCourse(id, input);
  revalidatePath("/settings");
}

export async function deleteCourseAction(id: string) {
  requireRole("ADMIN");
  MiscService.deleteCourse(id);
  revalidatePath("/settings");
}
