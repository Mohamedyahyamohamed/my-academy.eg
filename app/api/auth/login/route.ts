import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, DEMO_PASSWORD } from "@/lib/auth";
import { ensureStoreLoaded } from "@/services/data/store";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import type { SessionUser } from "@/types";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }

  // Rate limit: prevent brute-force.
  const rl = await rateLimit(`login:${email.toLowerCase()}`, LIMITS.login.max, LIMITS.login.window);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again in a minute." },
      { status: 429 },
    );
  }

  await ensureStoreLoaded();

  if (isSupabaseConfigured()) {
    // Use the SERVER client (cookie-bound) → signInWithPassword sets the
    // Supabase auth cookies so RLS works on subsequent requests.
    try {
      const client = createServerSupabaseClient();
      const { error: authError } = await client.auth.signInWithPassword({
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
        .select("*")
        .eq("email", email.toLowerCase())
        .single();

      if (profileErr || !profile) {
        return NextResponse.json(
          { ok: false, error: "Invalid email or password." },
          { status: 401 },
        );
      }

      // Issue BOTH cookies:
      // 1. ma_session (for sync getCurrentUser in existing code)
      // 2. Supabase auth cookies (set by signInWithPassword above — for RLS)
      const user: SessionUser = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        academy_id: profile.academy_id,
      };
      const token = Buffer.from(JSON.stringify(user), "utf-8").toString("base64");
      cookies().set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({ ok: true, user });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 },
      );
    }
  } else {
    // Demo mode — resolve from cache.
    if (password !== DEMO_PASSWORD) {
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
    const token = Buffer.from(JSON.stringify(user), "utf-8").toString("base64");
    cookies().set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.json({ ok: true, user });
  }
}
