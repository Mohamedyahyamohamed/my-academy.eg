"use server";
import { audit } from "@/services/audit";

import { revalidatePath } from "next/cache";
import { MiscService, requireRole, currentAcademyId } from "@/services";
import { PARENT_DEFAULT_PASSWORD } from "@/lib/auth";

/** Quick-create a parent record (no login) so it can be linked to a student. */
export async function createParentAction(input: {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  occupation?: string;
}) {
  requireRole("ADMIN", "TEACHER");
  if (!input.first_name || !input.last_name) {
    return { ok: false, error: "First and last name are required." };
  }
  const p = await MiscService.createParent({
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email || `${input.first_name}.${input.last_name}@parent.local`,
    phone: input.phone ?? null,
    occupation: input.occupation ?? null,
    profile_id: null,
  });
  void audit({ action: "mutation" });
  revalidatePath("/students");
  return { ok: true, parent: p };
}

/**
 * ينشئ حسابات دخول لأولياء الأمور اللي ممعاهومش حساب (profile_id = null).
 */
export async function createMissingParentAccountsAction() {
  requireRole("ADMIN");
  const aid = currentAcademyId();
  const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  const { data: parents } = await client
    .from("parents")
    .select("id,first_name,last_name,email,profile_id")
    .eq("academy_id", aid)
    .is("profile_id", null);

  let created = 0;
  const errors: string[] = [];

  for (const p of parents ?? []) {
    const { data: aData, error: aErr } = await client.auth.admin.createUser({
      email: p.email,
      password: PARENT_DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: `${p.first_name} ${p.last_name}`, role: "PARENT" },
    });
    if (aErr) {
      errors.push(`${p.first_name} ${p.last_name}: ${aErr.message}`);
      continue;
    }
    await client.from("profiles").upsert({
      id: aData.user!.id,
      academy_id: aid,
      email: p.email,
      role: "PARENT",
      full_name: `${p.first_name} ${p.last_name}`,
      is_active: true,
    });
    await client.from("parents").update({ profile_id: aData.user!.id }).eq("id", p.id);
    created++;
  }

  revalidatePath("/students");
  return { ok: true, created, errors };
}