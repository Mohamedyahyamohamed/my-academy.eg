"use server";
import { audit } from "@/services/audit";

import { revalidatePath } from "next/cache";
import { MiscService, requireScopedRole, currentAcademyId } from "@/services";
import { PARENT_DEFAULT_PASSWORD } from "@/lib/auth";

/** Quick-create a parent record (no login) so it can be linked to a student. */
export async function createParentAction(input: {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  occupation?: string;
}) {
  await requireScopedRole("ADMIN", "TEACHER");
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

function parentEmail(p: { first_name: string; last_name: string; id: string }): string {
  const namePart = `${p.first_name}.${p.last_name}`.replace(/[^a-zA-Z0-9.]/g, "").toLowerCase();
  return (namePart || `p${p.id.slice(2, 8)}`) + `.${p.id.slice(0, 4)}@parent.local`;
}

/**
 * يصلّح كل حسابات أولياء الأمور: الإيميلات بالاسم (زي الطلاب).
 * - اللي عنده حساب بالفعل → يحدّث إيميله بالاسم.
 * - اللي ممعاهومش → ينشئله حساب بالإيميل ده.
 */
export async function fixParentAccountsAction() {
  await requireScopedRole("ADMIN");
  const aid = currentAcademyId();
  const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  const { data: parents } = await client
    .from("parents")
    .select("id,first_name,last_name,email,profile_id")
    .eq("academy_id", aid);

  let updated = 0;
  let created = 0;
  const errors: string[] = [];

  for (const p of parents ?? []) {
    const nameEmail = parentEmail(p);

    if (p.profile_id) {
      // عندة حساب → حدّث الإيميل
      const { error: authErr } = await client.auth.admin.updateUserById(p.profile_id, {
        email: nameEmail,
      });
      if (authErr) { errors.push(`${p.first_name} ${p.last_name}: ${authErr.message}`); continue; }
      await client.from("parents").update({ email: nameEmail }).eq("id", p.id);
      await client.from("profiles").update({ email: nameEmail }).eq("id", p.profile_id);
      updated++;
    } else {
      // ممعاهومش → أنشئ حساب بالإيميل الجديد
      const { data: aData, error: aErr } = await client.auth.admin.createUser({
        email: nameEmail,
        password: PARENT_DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: `${p.first_name} ${p.last_name}`, role: "PARENT", academy_id: aid },
      });
      if (aErr) { errors.push(`${p.first_name} ${p.last_name}: ${aErr.message}`); continue; }
      const { error: profileError } = await client.from("profiles").upsert({
        id: aData.user!.id, academy_id: aid, email: nameEmail, role: "PARENT",
        full_name: `${p.first_name} ${p.last_name}`, is_active: true,
      });
      const { error: membershipError } = profileError ? { error: profileError } : await client
        .from("academy_memberships")
        .upsert({ academy_id: aid, profile_id: aData.user!.id, role: "PARENT", status: "ACTIVE", joined_at: new Date().toISOString() }, { onConflict: "academy_id,profile_id" });
      if (membershipError) {
        await client.auth.admin.deleteUser(aData.user!.id);
        errors.push(`${p.first_name} ${p.last_name}: ${membershipError.message}`);
        continue;
      }
      await client.from("parents").update({ email: nameEmail, profile_id: aData.user!.id }).eq("id", p.id);
      created++;
    }
  }

  revalidatePath("/students");
  return { ok: true, updated, created, errors };
}
