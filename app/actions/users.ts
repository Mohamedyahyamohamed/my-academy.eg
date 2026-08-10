"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/services";
import { currentAcademyId } from "@/services/session";
import { collections, invalidateStore } from "@/services/data/store";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { persistInsert } from "@/services/data/store";
import type { Role } from "@/types";
import { sendInviteEmail } from "@/lib/email";
import { audit } from "@/services/audit";

export interface CreateUserInput {
  full_name: string;
  email: string;
  password: string;
  role: Exclude<Role, "ADMIN"> | "ADMIN";
  phone?: string;
}

export async function createUserAction(input: CreateUserInput) {
  requireRole("ADMIN");
  if (!input.email || !input.password || !input.full_name) {
    return { ok: false, error: "Name, email and password are required." };
  }
  if (input.password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  const academyId = currentAcademyId();

  // 1. Create the auth user.
  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, role: input.role },
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  const uid = data.user.id;

  // 2. Profile (academy-scoped).
  const profile = {
    id: uid,
    academy_id: academyId,
    email: input.email,
    role: input.role,
    full_name: input.full_name,
    phone: input.phone ?? null,
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await client.from("profiles").upsert(profile);
  collections().profiles.push(profile as any);

  // 3. Linked domain record (teacher/parent/student) so the account is usable.
  const [firstName, ...rest] = input.full_name.split(" ");
  const lastName = rest.join(" ") || "-";
  if (input.role === "TEACHER") {
    const t = {
      id: crypto.randomUUID(), academy_id: academyId, profile_id: uid,
      first_name: firstName, last_name: lastName, email: input.email,
      phone: input.phone ?? null, bio: null, is_active: true,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    collections().teachers.push(t as any);
    void persistInsert("teachers", t);
  } else if (input.role === "PARENT") {
    const p = {
      id: crypto.randomUUID(), academy_id: academyId, profile_id: uid,
      first_name: firstName, last_name: lastName, email: input.email,
      phone: input.phone ?? null, occupation: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    collections().parents.push(p as any);
    void persistInsert("parents", p);
  }

    void audit({ action: "user.create" });
  revalidatePath("/settings");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  // Send invite email with credentials.
  void sendInviteEmail(input.email, input.full_name, input.password, input.role);
  return { ok: true };
}
