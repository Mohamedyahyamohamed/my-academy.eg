"use server";
import { audit } from "@/services/audit";

import { revalidatePath } from "next/cache";
import { MiscService, requireScopedRole, requireNonAssistantTeacher, currentAcademyId } from "@/services";
import { generatedParentEmail } from "@/services/misc";
import { PARENT_DEFAULT_PASSWORD } from "@/lib/auth";

/** Quick-create a parent record (no login) so it can be linked to a student. */
export async function createParentAction(input: {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  occupation?: string;
}) {
  try {
    const user = await requireScopedRole("ADMIN", "TEACHER");
    await requireNonAssistantTeacher(user);
    if (!input.first_name?.trim() || !input.last_name?.trim()) {
      return { ok: false, error: "First and last name are required." };
    }
    const p = await MiscService.createParent({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      // A blank email gets a unique local identity instead of colliding with
      // another parent who has the same name.
      email: input.email?.trim() || generatedParentEmail(input.first_name.trim(), input.last_name.trim()),
      phone: input.phone?.trim() || null,
      occupation: input.occupation?.trim() || null,
      profile_id: null,
    });
    void audit({ action: "parent.create", entity_type: "parent", entity_id: p.id, new_data: { name: `${p.first_name} ${p.last_name}` } }, user);
    revalidatePath("/students");
    return { ok: true, parent: p };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[createParentAction] FAILED:", message);
    const duplicate = /duplicate|unique|already exists|23505/i.test(message);
    return {
      ok: false,
      error: duplicate
        ? "ولي الأمر بهذا البريد موجود بالفعل. اترك البريد فارغًا أو استخدم بريدًا مختلفًا."
        : "تعذّر إضافة ولي الأمر. راجع البيانات وحاول مرة أخرى.",
    };
  }
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
