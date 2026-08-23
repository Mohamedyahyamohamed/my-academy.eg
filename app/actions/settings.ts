"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { MiscService, requireScopedRole } from "@/services";
import type { AcademyValues, CourseValues } from "@/schemas";
import { audit } from "@/services/audit";

export async function updateAcademyAction(input: AcademyValues) {
  await requireScopedRole("ADMIN");
  await MiscService.updateAcademy(input);
    void audit({ action: "settings.update_academy" });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function completeOnboardingAction(metadata: { hasAcademy: boolean; hasCourse: boolean; hasGroup: boolean; importedStudents?: number }) {
  const user = await requireScopedRole("ADMIN");
  const cookieStore = await cookies();
  cookieStore.set("myacademy_onboarding_done", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  void audit({ action: "onboarding.complete", entity_type: "academy", metadata });
  return { ok: true, userId: user.id };
}

export async function createCourseAction(input: CourseValues) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  const c = await MiscService.createCourse({ ...input, academy_id: user.academy_id }, user.academy_id);
    void audit({ action: "course.create" });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return c;
}

export async function updateCourseAction(id: string, input: Partial<CourseValues>) {
  await requireScopedRole("ADMIN");
  await MiscService.updateCourse(id, input);
  revalidatePath("/settings");
}

export async function deleteCourseAction(id: string) {
  await requireScopedRole("ADMIN");
  await MiscService.deleteCourse(id);
  revalidatePath("/settings");
}
