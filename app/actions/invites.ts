"use server";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { audit } from "@/services/audit";
import { getCurrentUser, requireScopedRole, roleHome } from "@/services/session";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { createSignedSession, sessionMaxAgeSeconds } from "@/lib/session-cookie";
import { ACTIVE_ACADEMY_COOKIE, SESSION_COOKIE } from "@/lib/auth";
import { sendAcademyInviteEmail } from "@/lib/email";
import type { AcademyMembership, Role, SessionUser } from "@/types";

const INVITABLE_ROLES = ["ADMIN", "TEACHER", "PARENT", "STUDENT"] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_EXPIRY_DAYS = 7;
const MAX_EXPIRY_DAYS = 30;

export interface AcademyInviteView {
  id: string;
  email: string;
  role: InvitableRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  metadata: { full_name?: string; phone?: string } | null;
}

export interface InvitePreview {
  academyName: string;
  email: string;
  role: InvitableRole;
  expiresAt: string;
  fullName: string | null;
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function displayNameParts(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);
  return { firstName, lastName: lastNameParts.join(" ") || "-" };
}

/** Admin-only list of invitations for the current academy. */
export async function listAcademyInvites(academyId?: string): Promise<AcademyInviteView[]> {
  const user = await requireScopedRole("ADMIN");
  const client = nodeSupabaseClient();
  if (!client) return [];

  const scopedAcademyId = academyId ?? user.academy_id;
  if (scopedAcademyId !== user.academy_id) return [];

  const { data, error } = await client
    .from("academy_invites")
    .select("id,email,role,expires_at,accepted_at,revoked_at,created_at,metadata")
    .eq("academy_id", scopedAcademyId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Unable to list academy invitations:", error.message);
    return [];
  }
  return (data ?? []) as AcademyInviteView[];
}

/**
 * Generates a short-lived, email-bound invitation. Only the SHA-256 hash is
 * persisted, so a database export cannot be used to redeem invitations.
 */
export async function createAcademyInviteAction(input: {
  email: string;
  role: InvitableRole;
  fullName?: string;
  phone?: string;
  expiresInDays?: number;
}): Promise<{ ok: boolean; error?: string; emailSent?: boolean; emailError?: string; inviteUrl?: string }> {
  const actor = await requireScopedRole("ADMIN");
  // Keep the tenant id attached to the authenticated actor. Reading it again
  // from AsyncLocalStorage after several awaited database calls can lose the
  // request context in Server Actions and incorrectly throw a generic error.
  const academyId = actor.academy_id;
  const email = normalizeEmail(input.email);
  const fullName = input.fullName?.trim() || undefined;
  const phone = input.phone?.trim() || undefined;

  if (!EMAIL_RE.test(email)) return { ok: false, error: "أدخل بريدًا إلكترونيًا صحيحًا." };
  if (!isInvitableRole(input.role)) return { ok: false, error: "الدور المحدد غير صالح للدعوة." };
  if (fullName && fullName.length > 120) return { ok: false, error: "الاسم طويل جدًا." };
  if (phone && phone.length > 30) return { ok: false, error: "رقم الهاتف طويل جدًا." };
  if (!isSupabaseConfigured()) return { ok: false, error: "الدعوات الآمنة تحتاج إلى إعداد قاعدة البيانات أولًا." };

  const rate = await rateLimit(`academy-invite:${actor.id}:${email}`, LIMITS.signup.max, LIMITS.signup.window);
  if (!rate.allowed) return { ok: false, error: "تم إرسال عدد كبير من الدعوات. حاول لاحقًا." };

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "تعذّر الاتصال بقاعدة البيانات." };

  const now = new Date();
  const days = Math.min(Math.max(Number(input.expiresInDays) || DEFAULT_EXPIRY_DAYS, 1), MAX_EXPIRY_DAYS);
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const token = newInviteToken();
  const tokenHash = hashInviteToken(token);
  const metadata = { ...(fullName ? { full_name: fullName } : {}), ...(phone ? { phone } : {}) };

  const { data: academy, error: academyError } = await client
    .from("academies")
    .select("name")
    .eq("id", academyId)
    .single();
  if (academyError || !academy) return { ok: false, error: "تعذّر العثور على الأكاديمية الحالية." };

  const { data: pending, error: pendingError } = await client
    .from("academy_invites")
    .select("id,role")
    .eq("academy_id", academyId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (pendingError) return { ok: false, error: "تعذّر تجهيز الدعوة. حاول مرة أخرى." };

  const typedPending = (pending ?? []) as Array<{ id: string; role: string }>;
  const sameRole = typedPending.find((invite) => invite.role === input.role);
  const otherInviteIds = typedPending.filter((invite) => invite.role !== input.role).map((invite) => invite.id);

  if (otherInviteIds.length) {
    const { error } = await client
      .from("academy_invites")
      .update({ revoked_at: now.toISOString(), updated_at: now.toISOString() })
      .in("id", otherInviteIds);
    if (error) return { ok: false, error: "تعذّر استبدال الدعوة السابقة." };
  }

  let inviteId: string;
  if (sameRole) {
    const { data, error } = await client
      .from("academy_invites")
      .update({ token_hash: tokenHash, expires_at: expiresAt, metadata, invited_by: actor.id, updated_at: now.toISOString() })
      .eq("id", sameRole.id)
      .eq("academy_id", academyId)
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "تعذّر تجديد الدعوة السابقة." };
    inviteId = data.id;
  } else {
    const { data, error } = await client
      .from("academy_invites")
      .insert({
        academy_id: academyId,
        email,
        role: input.role,
        token_hash: tokenHash,
        expires_at: expiresAt,
        invited_by: actor.id,
        metadata,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "تعذّر إنشاء الدعوة. حاول مرة أخرى." };
    inviteId = data.id;
  }

  const inviteUrl = `${appUrl()}/invite/${token}`;
  const emailResult = await sendAcademyInviteEmail({
    email,
    recipientName: fullName,
    academyName: academy.name,
    role: input.role,
    inviteUrl,
    expiresAt,
  });
  const emailSent = emailResult.sent;
  const emailError = emailResult.errorCode === "not_configured"
    ? "خدمة البريد غير مفعّلة بعد. انسخ رابط الدعوة وأرسله يدويًا."
    : emailResult.errorCode === "sender_domain_unverified"
      ? "تعذّر إرسال البريد لأن نطاق المرسل غير موثّق في خدمة البريد. انسخ رابط الدعوة وأرسله يدويًا مؤقتًا."
      : emailResult.errorCode === "provider_error"
        ? "تعذّر إرسال البريد من مزود الخدمة. انسخ رابط الدعوة وأرسله يدويًا مؤقتًا."
        : undefined;

  void audit({
    action: "invite.create",
    entity_type: "academy_invite",
    entity_id: inviteId,
    metadata: { role: input.role, email, expires_at: expiresAt, email_sent: emailSent },
  });
  revalidatePath("/settings");

  // The one-time URL is returned only to the inviting administrator as a
  // delivery fallback when the email provider is not configured or unavailable.
  return { ok: true, emailSent, emailError, inviteUrl };
}

/** Admin-only revocation; accepted invitations are retained as an audit record. */
export async function revokeAcademyInviteAction(inviteId: string): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireScopedRole("ADMIN");
  if (!inviteId) return { ok: false, error: "معرّف الدعوة غير صالح." };
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "تعذّر الاتصال بقاعدة البيانات." };

  const academyId = actor.academy_id;
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("academy_invites")
    .update({ revoked_at: now, updated_at: now })
    .eq("id", inviteId)
    .eq("academy_id", academyId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) return { ok: false, error: "لا يمكن إلغاء هذه الدعوة." };
  void audit({ action: "invite.revoke", entity_type: "academy_invite", entity_id: inviteId });
  revalidatePath("/settings");
  return { ok: true };
}

/** Public, read-only invite summary used by the acceptance page. */
export async function getAcademyInvitePreview(token: string): Promise<InvitePreview | null> {
  if (!token || token.length < 32 || !isSupabaseConfigured()) return null;
  const client = nodeSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("academy_invites")
    .select("email,role,expires_at,metadata,academies(name)")
    .eq("token_hash", hashInviteToken(token))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data || !isInvitableRole(data.role)) return null;

  const academy = data.academies as unknown as { name?: string } | { name?: string }[] | null;
  const academyName = Array.isArray(academy) ? academy[0]?.name : academy?.name;
  if (!academyName) return null;

  return {
    academyName,
    email: data.email,
    role: data.role,
    expiresAt: data.expires_at,
    fullName: (data.metadata as { full_name?: string } | null)?.full_name ?? null,
  };
}

/**
 * Redeems an invitation exactly once. A pre-existing account must first sign
 * in with the invited email, preventing an unauthenticated caller from adding
 * another person's account to an academy.
 */
export async function acceptAcademyInviteAction(input: {
  token: string;
  fullName?: string;
  password?: string;
}): Promise<{ ok: boolean; error?: string; destination?: string }> {
  if (!input.token || input.token.length < 32) return { ok: false, error: "رابط الدعوة غير صالح." };
  const client = nodeSupabaseClient();
  if (!client || !isSupabaseConfigured()) return { ok: false, error: "لا يمكن قبول الدعوة في وضع العرض التجريبي." };

  const tokenHash = hashInviteToken(input.token);
  const { data: invite, error: inviteError } = await client
    .from("academy_invites")
    .select("id,academy_id,email,role,expires_at,metadata,academies(name)")
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (inviteError || !invite || !isInvitableRole(invite.role)) {
    return { ok: false, error: "هذه الدعوة غير صالحة أو انتهت أو تم استخدامها سابقًا." };
  }

  const sessionUser = getCurrentUser();
  const { data: existingProfile } = await client
    .from("profiles")
    .select("id,email,full_name,avatar_url")
    .eq("email", invite.email)
    .maybeSingle();

  let userId: string;
  let fullName: string;
  let avatarUrl: string | null = null;
  const now = new Date().toISOString();

  if (existingProfile) {
    if (!sessionUser || sessionUser.id !== existingProfile.id || normalizeEmail(sessionUser.email) !== invite.email) {
      return {
        ok: false,
        error: "يوجد حساب بهذا البريد بالفعل. سجّل الدخول بالحساب المدعو أولًا، ثم افتح رابط الدعوة مرة أخرى.",
      };
    }
    userId = existingProfile.id;
    fullName = existingProfile.full_name || input.fullName?.trim() || "مستخدم MY Academy";
    avatarUrl = existingProfile.avatar_url ?? null;
  } else {
    fullName = input.fullName?.trim() || (invite.metadata as { full_name?: string } | null)?.full_name || "";
    if (!fullName || fullName.length > 120) return { ok: false, error: "أدخل الاسم الكامل لإتمام التسجيل." };
    if (!input.password || input.password.length < 8) return { ok: false, error: "اختر كلمة مرور من 8 أحرف على الأقل." };

    const { data: created, error: createError } = await client.auth.admin.createUser({
      email: invite.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: invite.role, academy_id: invite.academy_id },
    });
    if (createError || !created.user) {
      return { ok: false, error: createError?.message || "تعذّر إنشاء الحساب." };
    }
    userId = created.user.id;

    const { error: profileError } = await client.from("profiles").upsert({
      id: userId,
      academy_id: invite.academy_id,
      email: invite.email,
      role: invite.role,
      full_name: fullName,
      phone: (invite.metadata as { phone?: string } | null)?.phone ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    if (profileError) {
      await client.auth.admin.deleteUser(userId);
      return { ok: false, error: "تعذّر تجهيز ملف الحساب." };
    }
  }

  const { error: membershipError } = await client.from("academy_memberships").upsert({
    academy_id: invite.academy_id,
    profile_id: userId,
    role: invite.role,
    status: "ACTIVE",
    joined_at: now,
    updated_at: now,
  }, { onConflict: "academy_id,profile_id" });
  if (membershipError) return { ok: false, error: "تعذّر منح صلاحية الأكاديمية." };

  // Create the role-specific record only for newly provisioned accounts. Existing
  // accounts retain their profile and may hold multiple academy memberships.
  if (!existingProfile && invite.role !== "ADMIN") {
    const { firstName, lastName } = displayNameParts(fullName);
    const phone = (invite.metadata as { phone?: string } | null)?.phone ?? null;
    if (invite.role === "TEACHER") {
      const { error } = await client.from("teachers").insert({
        id: crypto.randomUUID(), academy_id: invite.academy_id, profile_id: userId,
        first_name: firstName, last_name: lastName, email: invite.email, phone,
        bio: null, is_active: true, created_at: now, updated_at: now,
      });
      if (error) return { ok: false, error: "تم إنشاء الحساب، لكن تعذّر إكمال ملف المدرس." };
    } else if (invite.role === "PARENT") {
      const { error } = await client.from("parents").insert({
        id: crypto.randomUUID(), academy_id: invite.academy_id, profile_id: userId,
        first_name: firstName, last_name: lastName, email: invite.email, phone,
        occupation: null, created_at: now, updated_at: now,
      });
      if (error) return { ok: false, error: "تم إنشاء الحساب، لكن تعذّر إكمال ملف ولي الأمر." };
    } else if (invite.role === "STUDENT") {
      const { error } = await client.from("students").insert({
        id: crypto.randomUUID(), academy_id: invite.academy_id,
        first_name: firstName, last_name: lastName, email: invite.email, phone,
        date_of_birth: null, gender: null, parent_id: null, school: null, grade: null,
        notes: null, status: "ACTIVE", enrolled_at: now, created_at: now, updated_at: now,
      });
      if (error) return { ok: false, error: "تم إنشاء الحساب، لكن تعذّر إكمال ملف الطالب." };
    }
  }

  const { data: redeemed, error: redeemError } = await client
    .from("academy_invites")
    .update({ accepted_at: now, updated_at: now })
    .eq("id", invite.id)
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (redeemError || !redeemed) return { ok: false, error: "تعذّر تأكيد قبول الدعوة. أعد المحاولة." };

  const { data: activeMemberships, error: activeMembershipsError } = await client
    .from("academy_memberships")
    .select("id,academy_id,role,status,joined_at,academies(name,slug)")
    .eq("profile_id", userId)
    .eq("status", "ACTIVE")
    .order("joined_at", { ascending: true })
    .limit(20);
  if (activeMembershipsError || !activeMemberships?.length) {
    return { ok: false, error: "تم قبول الدعوة، لكن تعذّر تحميل عضويات الحساب." };
  }
  const memberships: AcademyMembership[] = activeMemberships.map((item: any) => {
    const academy = Array.isArray(item.academies) ? item.academies[0] : item.academies;
    return {
      id: item.id,
      academy_id: item.academy_id,
      role: item.role,
      status: item.status,
      joined_at: item.joined_at,
      academy_name: academy?.name,
      academy_slug: academy?.slug,
    };
  });
  const currentMembership = memberships.find((membership) => membership.academy_id === invite.academy_id) ?? memberships[0];
  const cookieStore = await cookies();
  const signedUser: SessionUser = {
    id: userId,
    email: invite.email,
    role: currentMembership.role as Role,
    full_name: fullName,
    avatar_url: avatarUrl,
    academy_id: currentMembership.academy_id,
    active_membership_id: currentMembership.id,
    memberships,
  };
  const sessionCookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  };
  cookieStore.set(SESSION_COOKIE, createSignedSession(signedUser), sessionCookieOptions);
  cookieStore.set(ACTIVE_ACADEMY_COOKIE, signedUser.academy_id, sessionCookieOptions);

  const academy = invite.academies as unknown as { name?: string } | { name?: string }[] | null;
  const academyName = Array.isArray(academy) ? academy[0]?.name : academy?.name;
  void audit({
    action: "invite.accept",
    entity_type: "academy_invite",
    entity_id: invite.id,
    metadata: { academy_name: academyName ?? null, role: invite.role, email: invite.email },
  }, { id: userId, role: invite.role });

  revalidatePath("/settings");
  return { ok: true, destination: roleHome(invite.role as Role) };
}
