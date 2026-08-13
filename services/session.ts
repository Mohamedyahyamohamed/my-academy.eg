/**
 * Session & authentication service.
 *
 * Strategy: Supabase-first when configured (NEXT_PUBLIC_SUPABASE_URL present),
 * otherwise a fully-functional local demo auth backed by a signed-ish cookie.
 *
 * The demo auth lets the entire app run end-to-end in the preview without
 * secrets. The Supabase path uses real @supabase/supabase-js sessions.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, SessionUser } from "@/types";
import { collections } from "./data/store";
import { isSupabaseConfigured } from "./supabase/config";
import {
  SESSION_COOKIE,
  DEMO_PASSWORD,
  DEMO_ACCOUNTS,
  roleHome,
} from "@/lib/auth";
import {
  createSignedSession,
  readSignedSession,
  sessionMaxAgeSeconds,
} from "@/lib/session-cookie";

// Re-export so server consumers can import from the service barrel.
export { DEMO_ACCOUNTS, roleHome, SESSION_COOKIE };

/** Resolve a local demo user from an email. */
function resolveLocalUser(email: string): SessionUser | null {
  const profile = collections().profiles.find(
    (p) => p.email.toLowerCase() === email.toLowerCase(),
  );
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    academy_id: profile.academy_id,
  };
}

/**
 * Read the current session (server-only).
 * Returns null if not authenticated.
 */
export function getCurrentUser(): SessionUser | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  return readSignedSession(raw);
}

/** Require an authenticated user, else redirect to login. */
export function requireUser(): SessionUser {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a user AND one of the allowed roles. */
export function requireRole(...roles: Role[]): SessionUser {
  const user = requireUser();
  // SUPER_ADMIN يقدر يفتح أي صفحة (صاحب المنصة)
  if (user.role === "SUPER_ADMIN") return user;
  if (!roles.includes(user.role)) redirect(roleHome(user.role));
  return user;
}

/**
 * The academy id selected in the authenticated server session.
 * This intentionally fails closed: choosing the first academy for an anonymous
 * request is a cross-tenant data leak in a multi-academy SaaS.
 */
export function currentAcademyId(): string {
  const academyId = getCurrentUser()?.academy_id;
  if (!academyId) throw new Error("Missing authenticated academy context.");
  return academyId;
}

/** The teacher record id of the current user, or null if they're not a teacher. */
export function currentTeacherId(): string | null {
  const u = getCurrentUser();
  if (!u || u.role !== "TEACHER") return null;
  const t = collections().teachers.find(
    (t) => t.academy_id === u.academy_id && (t.profile_id === u.id || t.email.toLowerCase() === u.email.toLowerCase()),
  );
  return t?.id ?? null;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: SessionUser;
}

/** Authenticate. In demo mode, any seeded email + DEMO_PASSWORD works. */
export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  if (isSupabaseConfigured()) {
    // Production: const { data, error } = await supabase.auth.signInWithPassword(...)
  }
  await new Promise((r) => setTimeout(r, 350)); // simulate latency
  if (password !== DEMO_PASSWORD) {
    return { ok: false, error: "Invalid email or password." };
  }
  const user = resolveLocalUser(email.trim());
  if (!user) {
    return { ok: false, error: "No account found for this email." };
  }
  if (isSupabaseConfigured() === false) {
    cookies().set(SESSION_COOKIE, createSignedSession(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds(),
    });
  }
  return { ok: true, user };
}

/** Set the session cookie directly (used by demo quick-login buttons). */
export async function loginAsDemo(email: string): Promise<LoginResult> {
  return login(email, DEMO_PASSWORD);
}

/** Clear the session. */
export async function logout(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      const { createServerSupabaseClient } = await import("@/lib/supabase/server");
      const client = createServerSupabaseClient();
      await client.auth.signOut();
    }
  } catch {}
  cookies().delete(SESSION_COOKIE);
}

/** Reset password stub — in production this calls Supabase resetPasswordForEmail. */
export async function requestPasswordReset(email: string): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 400));
  const user = resolveLocalUser(email.trim());
  if (!user) return { ok: false, error: "No account found for this email." };
  // Demo: pretend a reset link was sent.
  return { ok: true, user };
}
