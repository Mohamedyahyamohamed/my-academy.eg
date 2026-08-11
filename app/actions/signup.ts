"use server";
import { audit } from "@/services/audit";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/services/supabase/config";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { invalidateStore, persistInsert, collections } from "@/services/data/store";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";
import { sendWelcomeEmail } from "@/lib/email";
import type { SessionUser } from "@/types";

export interface SignupInput {
  academyName: string;
  fullName: string;
  email: string;
  password: string;
}

export async function signupAction(input: SignupInput) {
  // Rate limit: prevent abuse.
  const rl = await rateLimit(`signup:${input.email.toLowerCase()}`, LIMITS.signup.max, LIMITS.signup.window);
  if (!rl.allowed) {
    return { ok: false, error: "Too many signup attempts. Please try again later." };
  }
  if (!input.email || !input.password || !input.academyName || !input.fullName) {
    return { ok: false, error: "All fields are required." };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Self-signup requires Supabase. (Demo mode is single-academy.)" };
  }

  const client = nodeSupabaseClient()!;

  // 1. Create the academy.
  const slug =
    input.academyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6);
  const { data: academy, error: academyErr } = await client
    .from("academies")
    .insert({
      name: input.academyName,
      slug,
      currency: "EGP",
      timezone: "Africa/Cairo",
    })
    .select()
    .single();
  if (academyErr) {
    return { ok: false, error: "Could not create academy: " + academyErr.message };
  }

  // 2. Create the admin auth user.
  const { data: userData, error: userErr } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: "ADMIN" },
  });
  if (userErr) {
    // rollback academy
    await client.from("academies").delete().eq("id", academy!.id);
    return { ok: false, error: userErr.message };
  }
  const uid = userData.user.id;

  // 3. Upsert the admin profile into the new academy.
  await client.from("profiles").upsert({
    id: uid,
    academy_id: academy!.id,
    email: input.email,
    role: "ADMIN",
    full_name: input.fullName,
    is_active: true,
  });

  // 4. Refresh the in-memory cache so the new academy is visible.
  invalidateStore();

  // 4b. Send welcome email.
  void sendWelcomeEmail(input.email, input.fullName, "ADMIN");

  // 5. Issue the session cookie.
  const user: SessionUser = {
    id: uid,
    email: input.email,
    role: "ADMIN",
    full_name: input.fullName,
    avatar_url: null,
    academy_id: academy!.id,
  };
  const token = Buffer.from(JSON.stringify(user), "utf-8").toString("base64");
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  void audit({ action: "mutation" });
  revalidatePath("/dashboard");
  redirect("/onboarding");
}

/**
 * Self-signup for a PARENT or STUDENT joining an EXISTING academy by code.
 * Creates: auth user + profile + (parent | student) record linked to the academy.
 */
export async function joinAcademyAction(input: {
  role: "PARENT" | "STUDENT";
  academyCode: string;
  fullName: string;
  email: string;
  password: string;
}) {
  const rl = await rateLimit(`signup:${input.email.toLowerCase()}`, LIMITS.signup.max, LIMITS.signup.window);
  if (!rl.allowed) {
    return { ok: false, error: "Too many signup attempts. Please try again later." };
  }
  if (!input.email || !input.password || !input.fullName || !input.academyCode) {
    return { ok: false, error: "All fields are required." };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Self-signup requires Supabase." };
  }

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  // 1. Find the academy by its signup code (= slug).
  const code = input.academyCode.trim().toLowerCase();
  const { data: academy, error: academyErr } = await client
    .from("academies")
    .select("id,name,slug")
    .ilike("slug", code)
    .maybeSingle();
  if (academyErr || !academy) {
    return { ok: false, error: "Invalid academy code. Ask your academy for the correct code." };
  }

  // 2. Create the auth user.
  const { data: userData, error: userErr } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: input.role },
  });
  if (userErr) {
    return { ok: false, error: userErr.message };
  }
  const uid = userData.user.id;
  const now = new Date().toISOString();

  // 3. Profile.
  await client.from("profiles").upsert({
    id: uid, academy_id: academy.id, email: input.email, role: input.role,
    full_name: input.fullName, is_active: true,
  });

  const [first, ...rest] = input.fullName.trim().split(/\s+/);
  const last = rest.join(" ") || "-";

  // 4. Parent or Student record (linked so the portal resolves it).
  if (input.role === "PARENT") {
    const p = {
      id: crypto.randomUUID(), academy_id: academy.id, profile_id: uid,
      first_name: first, last_name: last, email: input.email,
      phone: null, occupation: null, created_at: now, updated_at: now,
    };
    collections().parents.push(p as any);
    await persistInsert("parents", p);
  } else {
    const s = {
      id: crypto.randomUUID(), academy_id: academy.id,
      first_name: first, last_name: last,
      phone: null, email: input.email, date_of_birth: null, gender: null,
      parent_id: null, school: null, grade: null, notes: null,
      status: "ACTIVE", enrolled_at: now, created_at: now, updated_at: now,
    };
    collections().students.push(s as any);
    await persistInsert("students", s);
  }

  invalidateStore();

  // 5. Session cookie.
  const user: SessionUser = {
    id: uid, email: input.email, role: input.role,
    full_name: input.fullName, avatar_url: null, academy_id: academy.id,
  };
  const token = Buffer.from(JSON.stringify(user), "utf-8").toString("base64");
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });

  void audit({ action: "mutation" });
  void sendWelcomeEmail(input.email, input.fullName, input.role);

  redirect(input.role === "PARENT" ? "/parent" : "/student");
}
