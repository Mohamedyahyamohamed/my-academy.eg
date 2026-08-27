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
import { getRequestUser, setRequestContext } from "./request-context";
import { isSupabaseConfigured } from "./supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import {
  ACTIVE_ACADEMY_COOKIE,
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

type SyncCookieStore = { get(name: string): { value?: string } | undefined };

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
 *
 * In Supabase mode, the signed `ma_session` cookie is only a tenant-selection
 * hint. The authenticated identity always comes from Supabase Auth, then the
 * profile and active academy membership are reloaded server-side. This keeps a
 * stale or missing custom cookie from breaking Server Actions after an async
 * boundary, and prevents it from becoming the source of truth for identity.
 */
export async function loadCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const signedUser = readSignedSession(raw);

  if (isSupabaseConfigured()) {
    try {
      const { createServerSupabaseClient } = await import("@/lib/supabase/server");
      const supabase = await createServerSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setRequestContext(null);
        return null;
      }

      const sameIdentity = signedUser?.id === authData.user.id;
      const selectedAcademyId = cookieStore.get(ACTIVE_ACADEMY_COOKIE)?.value;
      const identity: SessionUser = {
        id: authData.user.id,
        email: authData.user.email ?? (sameIdentity ? signedUser?.email : undefined) ?? "",
        // hydrateTenantContext replaces this with the server-side profile /
        // membership role before any protected action proceeds.
        role: sameIdentity ? signedUser!.role : "STUDENT",
        full_name:
          authData.user.user_metadata?.full_name
          ?? (sameIdentity ? signedUser?.full_name : undefined)
          ?? authData.user.email
          ?? "",
        avatar_url: sameIdentity ? signedUser?.avatar_url ?? null : null,
        // An empty value intentionally falls back to profiles.academy_id in
        // hydrateTenantContext; an active-academy cookie is verified there.
        academy_id: selectedAcademyId ?? "",
        active_membership_id: sameIdentity ? signedUser?.active_membership_id : undefined,
        memberships: sameIdentity ? signedUser?.memberships : undefined,
      };
      const hydratedUser = await hydrateTenantContext(identity);
      if (!hydratedUser) {
        setRequestContext(null);
        return null;
      }
      const sessionUser = await hydrateAssistantFlag(hydratedUser);
      setRequestContext(sessionUser);
      return sessionUser;
    } catch (error) {
      console.error("[session] unable to load Supabase auth session:", (error as Error).message);
      setRequestContext(null);
      return null;
    }
  }

  // Local/demo mode retains the signed cookie flow because no Supabase Auth
  // session exists there.
  if (!signedUser) {
    setRequestContext(null);
    return null;
  }
  const hydratedUser = await hydrateTenantContext(signedUser);
  if (!hydratedUser) {
    setRequestContext(null);
    return null;
  }
  const sessionUser = await hydrateAssistantFlag(hydratedUser);
  setRequestContext(sessionUser);
  return sessionUser;
}

/**
 * Reconcile the signed session with the current server-side profile.
 * The role is refreshed on every request so a legacy Assistant/Teacher session
 * cannot be rejected or redirected using a stale role claim. The academy is
 * always resolved from the profile when the signed session has no tenant; when
 * it already has one, the profile remains the source of truth for role and
 * active status while the selected tenant context is preserved.
 */
async function hydrateTenantContext(user: SessionUser): Promise<SessionUser | null> {
  const client = nodeSupabaseClient();
  if (!client) {
    // Demo / local mode: there is no Supabase tenant to reconcile against, so
    // keep the locally-resolved identity. Fall back to the first seeded academy
    // so scoped pages that call currentAcademyId() still render in demo mode.
    const academyId = user.academy_id || (collections().academies[0] as any)?.id || "";
    return { ...user, academy_id: academyId };
  }

  try {
    const { data: profile, error } = await client
      .from("profiles")
      .select("academy_id,role,full_name,avatar_url,is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !profile || profile.is_active === false || !profile.academy_id) {
      return null;
    }

    const selectedAcademyId = user.academy_id || profile.academy_id;
    let activeMembershipId = user.active_membership_id;
    let serverRole = profile.role ?? user.role;

    // A signed cookie is not enough to keep a tenant session alive. Re-check
    // the active membership on every request so membership removal or
    // deactivation invalidates an old session before any scoped data is read.
    // SUPER_ADMIN is platform-scoped and may not require a tenant membership;
    // all tenant-scoped roles must have an active membership for the selected
    // academy, and the membership role is the server-side role authority.
    if (serverRole !== "SUPER_ADMIN") {
      const { data: membership, error: membershipError } = await client
        .from("academy_memberships")
        .select("id,academy_id,role,status")
        .eq("profile_id", user.id)
        .eq("academy_id", selectedAcademyId)
        .eq("status", "ACTIVE")
        .maybeSingle();
      if (membershipError || !membership) return null;
      activeMembershipId = membership.id;
      serverRole = membership.role ?? serverRole;
    }

    const hydrated: SessionUser = {
      ...user,
      academy_id: selectedAcademyId,
      active_membership_id: activeMembershipId,
      role: serverRole,
      full_name: profile.full_name ?? user.full_name,
      avatar_url: profile.avatar_url ?? user.avatar_url,
    };

    return hydrated;
  } catch (error) {
    console.error("[session] unable to reconcile authenticated profile:", (error as Error).message);
    return null;
  }
}

export function getCurrentUser(): SessionUser | null {
  return getRequestUser();
}

/** Resolve the limited-assistant marker from server-side relationships. */
async function hydrateAssistantFlag(user: SessionUser): Promise<SessionUser> {
  if (user.role !== "TEACHER") return { ...user, is_assistant: false };
  try {
    const client = nodeSupabaseClient();
    if (client) {
      const { data: teacher } = await client
        .from("teachers")
        .select("id")
        .eq("academy_id", user.academy_id)
        .or(`profile_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();
      if (!teacher?.id) return { ...user, is_assistant: false };
      const [{ count: assigned }, { count: owned }] = await Promise.all([
        client.from("group_assistants").select("group_id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
        client.from("groups").select("id", { count: "exact", head: true }).eq("academy_id", user.academy_id).eq("teacher_id", teacher.id),
      ]);
      return { ...user, is_assistant: (assigned ?? 0) > 0 && (owned ?? 0) === 0 };
    }
    const teacher = collections().teachers.find(
      (t) => t.academy_id === user.academy_id && (t.profile_id === user.id || t.email.toLowerCase() === user.email.toLowerCase()),
    );
    if (!teacher) return { ...user, is_assistant: false };
    const assigned = collections().groupAssistants.filter((row) => row.teacher_id === teacher.id).length;
    const owned = collections().groups.filter((group: any) => group.academy_id === user.academy_id && group.teacher_id === teacher.id).length;
    return { ...user, is_assistant: assigned > 0 && owned === 0 };
  } catch (error) {
    console.error("[session] unable to resolve assistant scope:", (error as Error).message);
    return { ...user, is_assistant: false };
  }
}

export type AccessRestriction = {
  blocked: boolean;
  reason: "academy_suspended" | "subscription_past_due" | "subscription_expired" | null;
  academyName?: string;
};

/** Resolve the platform access state for one tenant. The owner is never blocked. */
export async function getAccessRestriction(user: SessionUser): Promise<AccessRestriction> {
  if (user.role === "SUPER_ADMIN") {
    return { blocked: false, reason: null };
  }

  try {
    const client = nodeSupabaseClient();
    if (client) {
      const [{ data: academy }, { data: subscription }] = await Promise.all([
        client.from("academies").select("name,is_active").eq("id", user.academy_id).maybeSingle(),
        client.from("subscriptions").select("status,current_period_end").eq("academy_id", user.academy_id).maybeSingle(),
      ]);
      if (academy?.is_active === false) return { blocked: true, reason: "academy_suspended", academyName: academy.name ?? undefined };
      if (subscription?.status === "past_due") return { blocked: true, reason: "subscription_past_due", academyName: academy?.name ?? undefined };
      if (subscription?.status === "expired" || subscription?.status === "canceled") return { blocked: true, reason: "subscription_expired", academyName: academy?.name ?? undefined };
      return { blocked: false, reason: null, academyName: academy?.name ?? undefined };
    }
  } catch (error) {
    console.error("[access] unable to read platform access state:", (error as Error).message);
  }

  const localAcademy = collections().academies.find((academy: any) => academy.id === user.academy_id) as any;
  if (localAcademy?.is_active === false) return { blocked: true, reason: "academy_suspended", academyName: localAcademy.name };
  const localSubscription = (collections() as any).subscriptions?.find((row: any) => row.academy_id === user.academy_id);
  if (localSubscription?.status === "past_due") return { blocked: true, reason: "subscription_past_due", academyName: localAcademy?.name };
  if (localSubscription?.status === "expired" || localSubscription?.status === "canceled") return { blocked: true, reason: "subscription_expired", academyName: localAcademy?.name };
  return { blocked: false, reason: null, academyName: localAcademy?.name };
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
  if (academyId) return academyId;
  // In demo / local mode there is no Supabase tenant to reconcile against, so
  // fall back to the first seeded academy so scoped pages (attendance, payments,
  // homework) render instead of throwing "Missing authenticated academy context".
  // Production (Supabase configured) intentionally stays fail-closed above.
  if (!isSupabaseConfigured()) {
    const local = (collections().academies[0] as any)?.id;
    if (local) return local;
  }
  throw new Error("Missing authenticated academy context.");
}

/**
 * Require a role and hydrate the signed user's academy snapshot for the current
 * server-action request. This prevents standalone actions and API requests from
 * reading an empty or unrelated tenant cache.
 */
export async function requireScopedRole(...roles: Role[]): Promise<SessionUser> {
  // This helper is used by async Server Components and actions. Resolve the
  // signed cookie before checking the role; requireRole() is intentionally
  // synchronous and cannot safely discover a cookie on a fresh render.
  const user = await loadCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN" && !roles.includes(user.role)) {
    redirect(roleHome(user.role));
  }

  const restriction = await getAccessRestriction(user);
  if (restriction.blocked) redirect(`/suspended?reason=${restriction.reason}`);

  const { ensureStoreLoaded } = await import("./data/store");
  await ensureStoreLoaded(user.academy_id);
  // Store hydration may cross an async boundary that does not preserve the
  // request context in every Next.js render path. Re-bind the authenticated
  // user after hydration before any tenant-scoped service reads occur.
  const sessionUser = await hydrateAssistantFlag(user);
  setRequestContext(sessionUser);
  return sessionUser;
}

/**
 * Attendance is an operational teacher workflow. Platform and academy owners
 * may manage the academy, but they must not record attendance. Assistants share
 * the TEACHER role and remain allowed through the existing server-derived scope.
 */
export async function requireAttendanceTeacher(): Promise<SessionUser> {
  const user = await requireScopedRole("TEACHER");
  if (user.role !== "TEACHER") redirect(roleHome(user.role));
  return user;
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

/**
 * Assistant accounts currently share the TEACHER role for compatibility. They
 * are identified by an assignment in group_assistants and no teacher-owned
 * groups. This is intentionally derived server-side from relationships, never
 * from an email address or a client-provided flag.
 */
export async function isLimitedAssistant(user: SessionUser): Promise<boolean> {
  if (user.role !== "TEACHER") return false;
  if (user.is_assistant === true) return true;

  const teacher = collections().teachers.find(
    (t) => t.academy_id === user.academy_id && (t.profile_id === user.id || t.email.toLowerCase() === user.email.toLowerCase()),
  );
  if (!teacher) return false;

  const local = collections();
  if (!isSupabaseConfigured()) {
    const assigned = local.groupAssistants.filter((row) => row.teacher_id === teacher.id).length;
    const owned = local.groups.filter((group: any) => group.academy_id === user.academy_id && (group.teacher_id === teacher.id || group.teacher_id === user.id)).length;
    return assigned > 0 && owned === 0;
  }

  const client = nodeSupabaseClient();
  if (!client) return false;
  const [{ count: assigned }, { count: owned }] = await Promise.all([
    client.from("group_assistants").select("group_id", { count: "exact", head: true }).eq("teacher_id", teacher.id),
    client.from("groups").select("id", { count: "exact", head: true }).eq("academy_id", user.academy_id).eq("teacher_id", teacher.id),
  ]);
  return (assigned ?? 0) > 0 && (owned ?? 0) === 0;
}

/** Reject mutations that are reserved for academy teachers/admins, not assistants. */
export async function requireNonAssistantTeacher(user: SessionUser): Promise<SessionUser> {
  if (user.role === "TEACHER" && await isLimitedAssistant(user)) {
    throw new Error("Assistant accounts may only operate assigned groups and attendance.");
  }
  return user;
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
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return { ok: false, error: "Demo authentication is disabled in production." };
  }
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
    (await cookies()).set(SESSION_COOKIE, createSignedSession(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
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
      const client = await createServerSupabaseClient();
      await client.auth.signOut();
    }
  } catch {}
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ACTIVE_ACADEMY_COOKIE);
}

/** Reset password stub — in production this calls Supabase resetPasswordForEmail. */
export async function requestPasswordReset(email: string): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 400));
  const normalizedEmail = email.trim().toLowerCase();
  if (isSupabaseConfigured()) {
    try {
      // Password recovery links are opened from email clients and may be
      // completed in a different browser context. Use the implicit flow here
      // so the link carries the short-lived recovery tokens itself instead of
      // requiring the PKCE verifier cookie from the requesting browser.
      const { createClient } = await import("@supabase/supabase-js");
      const { getSupabaseUrl, getSupabaseAnonKey } = await import("./supabase/config");
      const client = createClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
        auth: {
          flowType: "implicit",
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
      const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://my-academy-eg.vercel.app"}/reset-password`;

      // Prefer the app's verified mail provider when configured. Supabase's
      // admin generateLink creates the one-time recovery URL without sending a
      // second email, so Resend remains the only delivery path in this branch.
      if (process.env.RESEND_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
          const { sendPasswordRecoveryEmail } = await import("@/lib/email");
          const admin = nodeSupabaseClient();
          const { data: generated, error: generateError } = await admin.auth.admin.generateLink({
            type: "recovery",
            email: normalizedEmail,
            options: { redirectTo },
          });
          if (generateError) throw generateError;
          const actionLink = generated.properties?.action_link;
          if (!actionLink) throw new Error("Supabase did not return a recovery action link");
          if (await sendPasswordRecoveryEmail(normalizedEmail, actionLink)) {
            return { ok: true };
          }
        } catch (error) {
          console.error("[auth] Resend recovery delivery failed:", (error as Error).message);
        }
      }

      const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) {
        console.error("[auth] password reset request failed:", error.message);
        if (/rate limit|rate_limit|too many/i.test(error.message)) {
          return { ok: false, error: "خدمة البريد وصلت للحد المؤقت. انتظر دقيقة ثم اطلب رابطًا جديدًا." };
        }
        return { ok: false, error: "تعذر إرسال رابط الاستعادة حاليًا. حاول مرة أخرى بعد قليل." };
      }
    } catch (error) {
      console.error("[auth] password reset provider unavailable:", (error as Error).message);
      return { ok: false, error: "تعذر الاتصال بخدمة البريد حاليًا. حاول مرة أخرى بعد قليل." };
    }
  }
  // Never disclose whether the address belongs to an account.
  return { ok: true };
}
