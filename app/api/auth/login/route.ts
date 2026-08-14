import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ACADEMY_COOKIE, SESSION_COOKIE, DEMO_PASSWORD } from "@/lib/auth";
import { ensureStoreLoaded } from "@/services/data/store";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  if (process.env.NODE_ENV === "production" && useE2eDemoFixture) {
    return NextResponse.json(
      { error: "Demo authentication is disabled in production." },
      { status: 503 },
    );
  }
  if (process.env.NODE_ENV === "production" && !useSupabase) {
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
    // Use the SERVER client (cookie-bound) → signInWithPassword sets the
    // Supabase auth cookies so RLS works on subsequent requests.
    try {
      const client = await createServerSupabaseClient();
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        return NextResponse.json(
          { ok: false, error: "Invalid email or password." },
          { status: 401 },
        );
      }

      // Resolve profile from Supabase (RLS-backed, per-request).
      // This fixes the bug where new academies/users created after server
      // start weren't in the in-memory cache → login failed.
      const { data: profile, error: profileErr } = await client
        .from("profiles")
        .select("id,email,role,full_name,avatar_url,academy_id")
        .eq("id", authData.user.id)
        .single();

      if (profileErr || !profile) {
        return NextResponse.json(
          { ok: false, error: "Invalid email or password." },
          { status: 401 },
        );
      }

      // Use the explicit SaaS membership as the authorization source. During
      // rollout, profile.academy_id is a deliberate primary-tenant preference,
      // never an implicit first-row fallback.
      const { data: memberships, error: membershipErr } = await client
        .from("academy_memberships")
        .select("id,academy_id,role,status,joined_at,academies(name,slug)")
        .eq("profile_id", profile.id)
        .eq("status", "ACTIVE")
        .order("joined_at", { ascending: true })
        .limit(20);
      if (membershipErr || !memberships?.length) {
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
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }
  } else {
    // Demo mode — resolve from cache. The role-specific passwords are accepted
    // exclusively for the explicit local E2E fixture; ordinary demo mode keeps
    // its single documented password.
    const e2ePasswords: Record<string, string> = {
      "admin@myacademy.edu": "demo1234",
      "admin-b@test.com": "demo1234",
      "teacher@myacademy.edu": "teacher1234",
      "parent@myacademy.edu": "parent1234",
      "student@myacademy.edu": "student1234",
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
