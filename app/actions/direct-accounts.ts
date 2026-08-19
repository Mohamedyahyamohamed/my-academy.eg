"use server";

import { requireScopedRole } from "@/services";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export type DirectAccountRole = "STUDENT" | "TEACHER" | "PARENT";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "Test", lastName: parts.slice(1).join(" ") || "Account" };
}

/** Creates a confirmed test Auth account directly; no invite or email is sent. */
export async function createDirectAccountAction(input: {
  fullName: string;
  email: string;
  password: string;
  role: DirectAccountRole;
}) {
  const admin = await requireScopedRole("ADMIN");
  if (!input.fullName.trim() || !input.email.trim() || !input.password) {
    return { ok: false, error: "Name, email and password are required." };
  }
  if (input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase is not configured." };
  const now = new Date().toISOString();
  const academyId = admin.academy_id;
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  const { data, error } = await client.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: input.role, academy_id: academyId },
  });
  if (error || !data.user) return { ok: false, error: error?.message || "Could not create account." };
  const userId = data.user.id;
  const { firstName, lastName } = splitName(fullName);

  const { error: profileError } = await client.from("profiles").upsert({
    id: userId, academy_id: academyId, email, role: input.role,
    full_name: fullName, is_active: true, created_at: now, updated_at: now,
  });
  if (profileError) {
    await client.auth.admin.deleteUser(userId);
    return { ok: false, error: "Could not create the account profile." };
  }

  const { error: membershipError } = await client.from("academy_memberships").upsert({
    academy_id: academyId, profile_id: userId, role: input.role, status: "ACTIVE",
    joined_at: now, updated_at: now,
  }, { onConflict: "academy_id,profile_id" });
  if (membershipError) {
    await client.from("profiles").delete().eq("id", userId);
    await client.auth.admin.deleteUser(userId);
    return { ok: false, error: "Could not grant academy access." };
  }

  let roleError: { message?: string } | null = null;
  if (input.role === "TEACHER") {
    const result = await client.from("teachers").insert({
      id: crypto.randomUUID(), academy_id: academyId, profile_id: userId,
      first_name: firstName, last_name: lastName, email, phone: null, bio: null,
      is_active: true, created_at: now, updated_at: now,
    });
    roleError = result.error;
  } else if (input.role === "PARENT") {
    const result = await client.from("parents").insert({
      id: crypto.randomUUID(), academy_id: academyId, profile_id: userId,
      first_name: firstName, last_name: lastName, email, phone: null, occupation: null,
      created_at: now, updated_at: now,
    });
    roleError = result.error;
  } else {
    const result = await client.from("students").insert({
      id: crypto.randomUUID(), academy_id: academyId, first_name: firstName, last_name: lastName,
      email, phone: null, date_of_birth: null, gender: null, parent_id: null, school: null,
      grade: null, notes: null, status: "ACTIVE", consent_given: false, consent_at: null,
      consent_by: null, consent_version: null, enrolled_at: now, created_at: now, updated_at: now,
    });
    roleError = result.error;
  }
  if (roleError) {
    if (input.role === "TEACHER") await client.from("teachers").delete().eq("profile_id", userId).eq("academy_id", academyId);
    if (input.role === "PARENT") await client.from("parents").delete().eq("profile_id", userId).eq("academy_id", academyId);
    await client.from("students").delete().eq("email", email).eq("academy_id", academyId);
    await client.from("academy_memberships").delete().eq("profile_id", userId).eq("academy_id", academyId);
    await client.from("profiles").delete().eq("id", userId);
    await client.auth.admin.deleteUser(userId);
    return { ok: false, error: "Account was created but its role record could not be completed." };
  }
  return { ok: true, userId };
}
