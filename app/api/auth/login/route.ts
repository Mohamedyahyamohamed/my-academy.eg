import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ACADEMY_COOKIE, SESSION_COOKIE, DEMO_PASSWORD } from "@/lib/auth";
import { ensureStoreLoaded } from "@/services/data/store";
import { getSupabaseAnonKey, isSupabaseConfigured } from "@/services/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import type { SessionUser } from "@/types";
import { createSignedSession, sessionMaxAgeSeconds } from "@/lib/session-cookie";
import { requestFingerprint, requestIpKey } from "@/lib/request-identity";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  // The test runner uses the seeded demo fixture only when this explicit flag
  // is present. A normal production deployment still refuses authentication
  // unless Supabase is configured.
  const useE2eDemoFixture = process.env.E2E_DEMO_MODE === "true";
  const useSupabase = isSupabaseConfigured() && !useE2eDemoFixture;
  if (process.env.NODE_ENV === "production" && useE2eDemoFixture && process.env.ALLOW_E2E_DEMO_IN_PRODUCTION !== "true") {
    return NextResponse.json(
      { error: "Demo authentication is disabled in production unless explicitly enabled for a local test run." },
      { status: 503 },
    );
  }
  if (process.env.NODE_ENV === "production" && !useSupabase && !useE2eDemoFixture) {
    return NextResponse.json(
      { error: "إعدادات خدمة الحسابات غير مكتملة. تواصل مع إدارة المنصة." },
      { status: 503 },
    );
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }

  // Rate limit: prevent brute-force in real environments. The local E2E
  // fixture deliberately skips this so a full role suite can log in more than
  // ten times without masking product failures; production never sets this flag.
  if (!useE2eDemoFixture) {
    const normalizedEmail = email.toLowerCase().trim();
    const emailLimit = await rateLimit(`login:email:${normalizedEmail}`, LIMITS.login.max, LIMITS.login.window);
    const ipLimit = await rateLimit(requestIpKey(req, "login:ip"), LIMITS.login.max, LIMITS.login.window);
    const fingerprintLimit = await rateLimit(requestFingerprint(req, "login:device", normalizedEmail), LIMITS.login.max, LIMITS.login.window);
    if (!emailLimit.allowed || !ipLimit.allowed || !fingerprintLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  await ensureStoreLoaded();

  if (useSupabase) {
      // Use the cookie-bound server client with the public anon key. User
      // authentication must never depend on the service-role credential.
      try {
      const anonKey = getSupabaseAnonKey();
      if (!anonKey) {
        return NextResponse.json(
          { ok: false, error: "إعدادات خدمة الحسابات غير مكتملة. تواصل مع إدارة المنصة." },
          { status: 503 },
        );
      }
      const client = await createServerSupabaseClient(anonKey);
      const normalizedEmail = String(email).trim().toLowerCase();
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password: String(password),
      });
      if (authError || !authData.user) {
        console.error("[auth/login] Supabase password authentication failed:", authError?.message ?? "missing user");
        return NextResponse.json(
          { ok: false, error: "Invalid email or password." },
          { status: 401 },
        );
      }

      // The sign-in call is verified with the public key. Profile and
      // membership lookup must not depend on an RLS policy seeing the newly
      // issued access token during the same response; use the server-only
      // service-role client for these two authorization lookups when present.
      // The service key is never sent to the browser.
      const profileClient = nodeSupabaseClient() ?? client;
      const { data: profile, error: profileErr } = await profileClient
        .from("profiles")
        .select("id,email,role,full_name,avatar_url,academy_id")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileErr) {
        console.error("[auth/login] profile lookup failed:", profileErr.message);
        return NextResponse.json(
          { ok: false, error: "Account configuration is incomplete. Please contact the platform administrator." },
          { status: 503 },
        );
      }

      if (profileErr || !profile) {
        return NextResponse.json(
          { ok: false, error: "Invalid email or password." },
          { status: 401 },
        );
      }

      // Use the explicit SaaS membership as the authorization source. During
      // rollout, profile.academy_id is a deliberate primary-tenant preference,
      // never an implicit first-row fallback.
      const { data: memberships, error: membershipErr } = await profileClient
        .from("academy_memberships")
        .select("id,academy_id,role,status,joined_at,academies(name,slug)")
        .eq("profile_id", profile.id)
        .eq("status", "ACTIVE")
        .order("joined_at", { ascending: true })
        .limit(20);
      if (membershipErr) {
        console.error("[auth/login] membership lookup failed:", membershipErr.message);
        return NextResponse.json(
          { ok: false, error: "Account configuration is incomplete. Please contact the platform administrator." },
          { status: 503 },
        );
      }
      if (!memberships?.length) {
        return NextResponse.json(
          { ok: false, error: "This account has no active academy membership." },
          { status: 403 },
        );
      }
      const preferredAcademyId = cookieStore.get(ACTIVE_ACADEMY_COOKIE)?.value;
      const membership = memberships.find((item: { academy_id: string }) => item.academy_id === preferredAcademyId)
        ?? memberships.find((item: { academy_id: string }) => item.academy_id === profile.academy_id)
        ?? memberships[0];
      const availableMemberships = memberships.map((item: any) => {
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

      // Issue BOTH cookies:
      // 1. ma_session (for sync getCurrentUser in existing code)
      // 2. Supabase auth cookies (set by signInWithPassword above — for RLS)
      const user: SessionUser = {
        id: profile.id,
        email: profile.email,
        role: membership.role,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        academy_id: membership.academy_id,
        active_membership_id: membership.id,
        memberships: availableMemberships,
      };
      cookieStore.set(SESSION_COOKIE, createSignedSession(user), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: sessionMaxAgeSeconds(),
      });
      cookieStore.set(ACTIVE_ACADEMY_COOKIE, membership.academy_id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: sessionMaxAgeSeconds(),
      });

      return NextResponse.json({ ok: true, user });
    } catch (error) {
      console.error("[auth/login] unexpected Supabase error:", error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { ok: false, error: "Account service is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
  } else {
    // Demo mode — resolve from cache. The role-specific passwords are accepted
    // exclusively for the explicit local E2E fixture; ordinary demo mode keeps
    // its single documented password.
    const e2ePasswords: Record<string, string> = {
      "admin@myacademy.edu": "demo1234",
      "admin-b@test.com": "demo1234",
      "teacher@myacademy.edu": "demo1234",
      "parent@myacademy.edu": "demo1234",
      "student@myacademy.edu": "demo1234",
    };
    const expectedFixturePassword = e2ePasswords[email.toLowerCase()];
    const validPassword = password === DEMO_PASSWORD || (
      useE2eDemoFixture && expectedFixturePassword === password
    );
    if (!validPassword) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }
    const { collections } = await import("@/services/data/store");
    const profile = collections()
      .profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }
    const user: SessionUser = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      academy_id: profile.academy_id,
    };
    cookieStore.set(SESSION_COOKIE, createSignedSession(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionMaxAgeSeconds(),
    });
    return NextResponse.json({ ok: true, user });
  }
}
