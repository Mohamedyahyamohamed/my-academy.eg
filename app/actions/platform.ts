"use server";

import { revalidatePath } from "next/cache";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { requireScopedRole } from "@/services/session";

const OWNER_EMAIL = "mohamedyahya13579@gmail.com";
type ActionResult = { ok: true } | { ok: false; error: string };

async function adminClient() {
  await requireScopedRole("SUPER_ADMIN");
  const client = nodeSupabaseClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  return client;
}

export async function setPlatformUserStatus(profileId: string, isActive: boolean): Promise<ActionResult> {
  const client = await adminClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,email,role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError || !profile) return { ok: false, error: "المستخدم غير موجود." };
  if (profile.email?.toLowerCase() === OWNER_EMAIL || profile.role === "SUPER_ADMIN") {
    return { ok: false, error: "لا يمكن تعطيل مالك المنصة." };
  }

  const { error } = await client.from("profiles").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform");
  revalidatePath("/settings");
  return { ok: true };
}

export async function deletePlatformUser(profileId: string): Promise<ActionResult> {
  const client = await adminClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,email,role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError || !profile) return { ok: false, error: "المستخدم غير موجود." };
  if (profile.email?.toLowerCase() === OWNER_EMAIL || profile.role === "SUPER_ADMIN") {
    return { ok: false, error: "لا يمكن حذف مالك المنصة." };
  }

  const { error } = await client.auth.admin.deleteUser(profileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform");
  revalidatePath("/settings");
  return { ok: true };
}

export async function setPlatformAcademyStatus(academyId: string, isActive: boolean, reason?: string): Promise<ActionResult> {
  const client = await adminClient();
  const { data: ownerProfile } = await client.from("profiles").select("id,academy_id").eq("email", OWNER_EMAIL).maybeSingle();
  if (ownerProfile?.academy_id === academyId) return { ok: false, error: "لا يمكن إيقاف أكاديمية المالك الأساسية." };

  const { data: academy, error: academyError } = await client.from("academies").select("id").eq("id", academyId).maybeSingle();
  if (academyError || !academy) return { ok: false, error: "الأكاديمية غير موجودة." };

  const { error } = await client.from("academies").update({
    is_active: isActive,
    suspension_reason: isActive ? null : (reason?.trim() || "تم الإيقاف بواسطة مالك المنصة"),
    suspended_at: isActive ? null : new Date().toISOString(),
    suspended_by: isActive ? null : (ownerProfile?.id ?? null),
    updated_at: new Date().toISOString(),
  }).eq("id", academyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePlatformAcademy(academyId: string): Promise<ActionResult> {
  const client = await adminClient();
  const { data: ownerProfile } = await client
    .from("profiles")
    .select("academy_id")
    .eq("email", OWNER_EMAIL)
    .maybeSingle();
  if (ownerProfile?.academy_id === academyId) return { ok: false, error: "لا يمكن حذف أكاديمية المالك الأساسية." };

  const { data: academy, error: academyError } = await client
    .from("academies")
    .select("id")
    .eq("id", academyId)
    .maybeSingle();
  if (academyError || !academy) return { ok: false, error: "الأكاديمية غير موجودة." };

  const { error } = await client.from("academies").delete().eq("id", academyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/platform");
  revalidatePath("/dashboard");
  return { ok: true };
}
