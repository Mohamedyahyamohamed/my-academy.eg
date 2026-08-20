"use server";

import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { LIMITS, rateLimit } from "@/lib/rate-limit-redis";
import { getAccessRestriction, loadCurrentUser } from "@/services/session";

export type PasswordManagementResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function isPrivilegedOwner(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function safePasswordError(message: string) {
  const lowered = message.toLowerCase();
  if (["breach", "compromised", "leaked", "pwned", "common", "weak_password"].some((term) => lowered.includes(term))) {
    return "كلمة المرور شائعة أو ظهرت في تسريب بيانات. استخدم كلمة مرور أطول وفريدة ومتنوعة الأحرف.";
  }
  return "تعذر تحديث كلمة المرور. تحقق من السياسة وحاول مرة أخرى.";
}

async function writePasswordAudit(
  client: any,
  input: {
    actorId: string;
    actorRole: string;
    academyId: string | null;
    targetUserId: string;
    result: "SUCCESS" | "FAILED";
    reason?: string;
  },
) {
  try {
    await client.from("audit_logs").insert({
      academy_id: input.academyId,
      actor_user_id: input.actorId,
      actor_role: input.actorRole,
      action: "auth.password_reset",
      entity_type: "profile",
      entity_id: input.targetUserId,
      old_data: null,
      new_data: null,
      metadata: {
        result: input.result,
        control_plane: "owner_password_management",
        ...(input.reason ? { reason: input.reason } : {}),
      },
    });
  } catch (error) {
    console.error("[password-management] audit write failed", (error as Error).message);
  }
}

/**
 * Reset another user's password. The target password is accepted only in this
 * server action and is never returned, logged, persisted, or placed in a URL.
 */
export async function resetUserPasswordAction(
  targetUserId: string,
  newPassword: string,
  confirmPassword: string,
): Promise<PasswordManagementResult> {
  const actor = await loadCurrentUser();
  if (!actor || !isPrivilegedOwner(actor.role)) {
    return { ok: false, error: "غير مصرح لك بإعادة تعيين كلمات المرور." };
  }

  const restriction = await getAccessRestriction(actor);
  if (restriction.blocked) {
    return { ok: false, error: "لا يمكن تنفيذ العملية أثناء إيقاف الأكاديمية." };
  }

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "خدمة المصادقة غير مهيأة على الخادم." };

  const actorLimit = await rateLimit(
    `owner-password-reset:${actor.id}`,
    LIMITS.resetPassword.max,
    LIMITS.resetPassword.window,
  );
  if (!actorLimit.allowed) {
    return { ok: false, error: "محاولات كثيرة. حاول مرة أخرى بعد قليل." };
  }

  if (!targetUserId || !newPassword || !confirmPassword) {
    return { ok: false, error: "أدخل كلمة المرور الجديدة وتأكيدها." };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل." };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "كلمتا المرور غير متطابقتين." };
  }
  if (targetUserId === actor.id) {
    return { ok: false, error: "استخدم تغيير كلمة المرور من تبويب الأمان لحسابك أنت." };
  }

  const { data: target, error: targetError } = await client
    .from("profiles")
    .select("id,academy_id,email,role,full_name,is_active")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetError || !target) {
    return { ok: false, error: "المستخدم غير موجود أو غير مسموح بإدارته." };
  }
  if (target.role === "SUPER_ADMIN") {
    return { ok: false, error: "لا يمكن تغيير كلمة مرور مالك المنصة من هذه الشاشة." };
  }
  if (actor.role !== "SUPER_ADMIN" && target.academy_id !== actor.academy_id) {
    await writePasswordAudit(client, {
      actorId: actor.id,
      actorRole: actor.role,
      academyId: actor.academy_id,
      targetUserId,
      result: "FAILED",
      reason: "cross_tenant_denied",
    });
    return { ok: false, error: "غير مسموح بإدارة مستخدم من أكاديمية أخرى." };
  }

  const { data: membership, error: membershipError } = await client
    .from("academy_memberships")
    .select("academy_id,status")
    .eq("academy_id", target.academy_id)
    .eq("profile_id", target.id)
    .maybeSingle();

  if (membershipError || !membership || membership.status !== "ACTIVE") {
    return { ok: false, error: "عضوية المستخدم غير نشطة أو غير موجودة." };
  }

  const { error: updateError } = await client.auth.admin.updateUserById(target.id, {
    password: newPassword,
  });
  if (updateError) {
    await writePasswordAudit(client, {
      actorId: actor.id,
      actorRole: actor.role,
      academyId: target.academy_id,
      targetUserId: target.id,
      result: "FAILED",
      reason: "auth_update_failed",
    });
    return { ok: false, error: safePasswordError(updateError.message) };
  }

  await writePasswordAudit(client, {
    actorId: actor.id,
    actorRole: actor.role,
    academyId: target.academy_id,
    targetUserId: target.id,
    result: "SUCCESS",
  });
  return { ok: true, message: "تم تحديث كلمة مرور المستخدم بنجاح." };
}
