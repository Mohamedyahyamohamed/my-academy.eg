"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { MiscService, requireScopedRole, currentAcademyId } from "@/services";
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

/**
 * Remove a user from THIS academy. Deletes the academy_membership, and if the
 * user has no other academy memberships, removes the profile + auth account.
 * Guards: cannot delete yourself, and cannot delete the last ADMIN.
 */
export async function deleteUserAction(userId: string) {
  try {
    const user = await requireScopedRole("ADMIN");
    const aid = user.academy_id ?? currentAcademyId();
    if (userId === user.id) return { ok: false as const, error: "لا يمكنك حذف حسابك الخاص." };

    const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
    const client = nodeSupabaseClient();
    if (!client) return { ok: false as const, error: "Supabase غير مهيأ." };

    // Prevent deleting the last admin of the academy.
    const { data: admins } = await client
      .from("academy_memberships")
      .select("profile_id")
      .eq("academy_id", aid)
      .eq("role", "ADMIN")
      .eq("status", "ACTIVE");
    if (admins && admins.length <= 1 && admins.some((a: { profile_id: string }) => a.profile_id === userId)) {
      return { ok: false as const, error: "لا يمكن حذف آخر مدرّس مدير في الأكاديمية." };
    }

    // Role-specific cleanup within this academy.
    const { data: profile } = await client.from("profiles").select("role").eq("id", userId).eq("academy_id", aid).maybeSingle();
    const role = profile?.role;
    if (role === "TEACHER") {
      await client.from("teachers").delete().eq("profile_id", userId).eq("academy_id", aid);
    } else if (role === "PARENT") {
      await client.from("parents").delete().eq("profile_id", userId).eq("academy_id", aid);
    }

    // Remove membership for this academy only (academy isolation preserved).
    await client.from("academy_memberships").delete().eq("profile_id", userId).eq("academy_id", aid);

    // If the user belongs to no other academy, purge the account entirely.
    const { data: others } = await client
      .from("academy_memberships")
      .select("academy_id")
      .eq("profile_id", userId);
    if (!others || others.length === 0) {
      await client.from("profiles").delete().eq("id", userId);
      await client.auth.admin.deleteUser(userId);
    }

    void audit({ action: "user.delete", entity_type: "profile", entity_id: userId }, user);
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[deleteUserAction] FAILED:", message);
    return { ok: false as const, error: "تعذّر حذف المستخدم. حاول مرة أخرى." };
  }
}
