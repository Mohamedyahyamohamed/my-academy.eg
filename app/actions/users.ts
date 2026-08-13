"use server";

import { requireRole } from "@/services";
import type { Role } from "@/types";

/**
 * Legacy type retained for stale clients compiled before the invitation flow.
 * Password-based provisioning has been removed: it leaked credentials through
 * administrator workflows and bypassed the invite acceptance audit trail.
 */
export interface CreateUserInput {
  full_name: string;
  email: string;
  password: string;
  role: Exclude<Role, "ADMIN"> | "ADMIN";
  phone?: string;
}

/**
 * @deprecated Use createAcademyInviteAction from app/actions/invites instead.
 * This fails closed even if an old bundle invokes the server action directly.
 */
export async function createUserAction(_input: CreateUserInput) {
  requireRole("ADMIN");
  return {
    ok: false,
    error: "تم إيقاف إنشاء الحساب بكلمة مرور من لوحة الإدارة. استخدم «دعوة مستخدم» لإرسال رابط آمن ومحدود المدة.",
  };
}
