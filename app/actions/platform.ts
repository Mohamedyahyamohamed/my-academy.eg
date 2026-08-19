"use server";

import { revalidatePath } from "next/cache";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { requireScopedRole } from "@/services/session";

const OWNER_EMAIL = "mohamedyahya13579@gmail.com";
type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
type PlatformSubscriptionAction = "suspend_service" | "resume_service" | "cancel_at_period_end" | "undo_cancel";

async function adminClient() {
  await requireScopedRole("SUPER_ADMIN");
  const client = nodeSupabaseClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  return client;
}

async function stripeSetCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<ActionResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Stripe غير مهيأ على الخادم." };

  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ cancel_at_period_end: String(cancelAtPeriodEnd) }).toString(),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) {
    console.error("Stripe subscription update failed", response.status, payload?.error?.message);
    return { ok: false, error: "تعذر تحديث اشتراك Stripe. لم يتم تغيير حالة الاشتراك محليًا." };
  }
  return { ok: true };
}

async function writePlatformAudit(
  client: any,
  owner: { id?: string | null; academy_id?: string | null } | null,
  academyId: string,
  action: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
) {
  await client.from("audit_logs").insert({
    academy_id: owner?.academy_id ?? academyId,
    actor_user_id: owner?.id ?? null,
    actor_role: "SUPER_ADMIN",
    action,
    entity_type: "subscription",
    entity_id: academyId,
    old_data: oldData,
    new_data: newData,
    metadata: { control_plane: "platform_owner" },
  });
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

export async function setPlatformSubscriptionAction(academyId: string, action: PlatformSubscriptionAction): Promise<ActionResult> {
  const client = await adminClient();
  const [{ data: ownerProfile }, { data: academy, error: academyError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    client.from("profiles").select("id,academy_id").eq("email", OWNER_EMAIL).maybeSingle(),
    client.from("academies").select("id,name,is_active").eq("id", academyId).maybeSingle(),
    client.from("subscriptions").select("academy_id,status,provider,provider_subscription_id,cancel_at_period_end,canceled_at,metadata").eq("academy_id", academyId).maybeSingle(),
  ]);

  if (ownerProfile?.academy_id === academyId) return { ok: false, error: "لا يمكن إدارة اشتراك أكاديمية المالك الأساسية من هنا." };
  if (academyError || !academy) return { ok: false, error: "الأكاديمية غير موجودة." };
  if (subscriptionError) return { ok: false, error: "تعذر قراءة اشتراك الأكاديمية." };

  const now = new Date().toISOString();
  const oldData = {
    academy_is_active: academy.is_active !== false,
    status: subscription?.status ?? null,
    cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
    canceled_at: subscription?.canceled_at ?? null,
  };

  if (action === "suspend_service" || action === "resume_service") {
    const isActive = action === "resume_service";
    const { error } = await client.from("academies").update({
      is_active: isActive,
      suspension_reason: isActive ? null : "تم إيقاف الخدمة بواسطة مالك المنصة",
      suspended_at: isActive ? null : now,
      suspended_by: isActive ? null : (ownerProfile?.id ?? null),
      updated_at: now,
    }).eq("id", academyId);
    if (error) return { ok: false, error: "تعذر تحديث حالة خدمة الأكاديمية." };

    await writePlatformAudit(client, ownerProfile, academyId, `platform.subscription.${action}`, oldData, { academy_is_active: isActive });
    revalidatePath("/platform");
    revalidatePath("/dashboard");
    return { ok: true };
  }

  if (!subscription) return { ok: false, error: "لا يوجد اشتراك مسجل لهذه الأكاديمية." };

  const cancelAtPeriodEnd = action === "cancel_at_period_end";
  if (subscription.provider === "stripe" && subscription.provider_subscription_id) {
    const providerResult = await stripeSetCancelAtPeriodEnd(subscription.provider_subscription_id, cancelAtPeriodEnd);
    if (!providerResult.ok) return providerResult;
  } else if (subscription.provider === "paymob" && cancelAtPeriodEnd) {
    return { ok: false, error: "اشتراكات Paymob الحالية لا توفر إلغاءً آليًا من داخل المنصة؛ استخدم إيقاف الخدمة أو ألغِ الاشتراك من لوحة Paymob." };
  }

  const metadata = {
    ...((subscription.metadata && typeof subscription.metadata === "object") ? subscription.metadata : {}),
    last_platform_action: action,
    last_platform_action_at: now,
    provider_action: subscription.provider === "stripe" ? "synced" : "local_only",
  };
  const { error: updateError } = await client.from("subscriptions").update({
    cancel_at_period_end: cancelAtPeriodEnd,
    canceled_at: cancelAtPeriodEnd ? (subscription.canceled_at ?? now) : null,
    metadata,
    updated_at: now,
  }).eq("academy_id", academyId);
  if (updateError) return { ok: false, error: "تمت محاولة تحديث مزود الدفع لكن تعذر حفظ الحالة محليًا." };

  await writePlatformAudit(client, ownerProfile, academyId, `platform.subscription.${action}`, oldData, { cancel_at_period_end: cancelAtPeriodEnd, provider: subscription.provider });
  revalidatePath("/platform");
  revalidatePath("/billing");
  return { ok: true };
}
