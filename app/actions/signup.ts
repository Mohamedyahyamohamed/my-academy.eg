"use server";

import { audit } from "@/services/audit";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { invalidateStore } from "@/services/data/store";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { sendWelcomeEmail } from "@/lib/email";
import type { SessionUser } from "@/types";
import { createSignedSession, sessionMaxAgeSeconds } from "@/lib/session-cookie";

export interface SignupInput {
  academyName: string;
  fullName: string;
  email: string;
  password: string;
}

/** Creates a new academy and its first (owner) administrator. */
export async function signupAction(input: SignupInput) {
  const email = input.email.trim().toLowerCase();
  const academyName = input.academyName.trim();
  const fullName = input.fullName.trim();
  const rl = await rateLimit(`signup:${email}`, LIMITS.signup.max, LIMITS.signup.window);
  if (!rl.allowed) return { ok: false, error: "محاولات كثيرة. حاول مرة أخرى لاحقًا." };
  if (!email || !input.password || !academyName || !fullName) return { ok: false, error: "جميع الحقول مطلوبة." };
  if (input.password.length < 8) return { ok: false, error: "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل." };
  if (!isSupabaseConfigured()) return { ok: false, error: "يتطلب إنشاء الأكاديمية إعداد قاعدة البيانات أولًا." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "تعذّر الاتصال بقاعدة البيانات." };

  const slugBase = academyName
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "academy";
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: academy, error: academyError } = await client
    .from("academies")
    .insert({ name: academyName, slug, currency: "EGP", timezone: "Africa/Cairo" })
    .select("id")
    .single();
  if (academyError || !academy) return { ok: false, error: "تعذّر إنشاء الأكاديمية. حاول مرة أخرى." };

  const { data: userData, error: userError } = await client.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "ADMIN", academy_id: academy.id },
  });
  if (userError || !userData.user) {
    await client.from("academies").delete().eq("id", academy.id);
    return { ok: false, error: userError?.message || "تعذّر إنشاء حساب المدير." };
  }

  const userId = userData.user.id;
  const now = new Date().toISOString();
  const { error: profileError } = await client.from("profiles").upsert({
    id: userId,
    academy_id: academy.id,
    email,
    role: "ADMIN",
    full_name: fullName,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  if (profileError) {
    await client.auth.admin.deleteUser(userId);
    await client.from("academies").delete().eq("id", academy.id);
    return { ok: false, error: "تعذّر تجهيز ملف مالك الأكاديمية." };
  }

  const { error: membershipError } = await client.from("academy_memberships").upsert({
    academy_id: academy.id,
    profile_id: userId,
    role: "ADMIN",
    status: "ACTIVE",
    joined_at: now,
    updated_at: now,
  }, { onConflict: "academy_id,profile_id" });
  if (membershipError) {
    await client.auth.admin.deleteUser(userId);
    await client.from("academies").delete().eq("id", academy.id);
    return { ok: false, error: "تعذّر تفعيل عضوية مالك الأكاديمية." };
  }

  invalidateStore();
  void sendWelcomeEmail(email, fullName, "ADMIN");
  const user: SessionUser = { id: userId, email, role: "ADMIN", full_name: fullName, avatar_url: null, academy_id: academy.id };
  cookies().set(SESSION_COOKIE, createSignedSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  });
  void audit({ action: "academy.create", entity_type: "academy", entity_id: academy.id }, { id: userId, role: "ADMIN" });
  revalidatePath("/dashboard");
  redirect("/onboarding");
}

/**
 * Legacy entry point retained so stale browser bundles fail closed. Public
 * enrollment by academy slug was removed because a copied code could grant
 * unverified access to tenant data. Use a tokenized `/invite/[token]` link.
 */
export async function joinAcademyAction(_input: {
  role: "PARENT" | "STUDENT";
  academyCode: string;
  fullName: string;
  email: string;
  password: string;
}) {
  return {
    ok: false,
    error: "الانضمام بكود عام لم يعد متاحًا. اطلب من الأكاديمية إرسال رابط دعوة آمن إلى بريدك الإلكتروني.",
  };
}
