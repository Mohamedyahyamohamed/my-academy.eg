"use server";

import { revalidatePath } from "next/cache";
import { isLimitedAssistant, requireScopedRole, currentAcademyId } from "@/services";
import { generatePortalCredentials, portalLogin, portalLogout, type PortalLoginState } from "@/services/portal-auth";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { setRequestContext } from "@/services/request-context";

export async function generatePortalCredentialsAction(studentId: string, options: { forceReset?: boolean } = {}) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("المساعد المحدود لا يملك صلاحية إنشاء بيانات الدخول.");
  const result = await generatePortalCredentials(user, studentId, null, options);
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return result;
}

export async function createMissingSharedPortalAccountsAction() {
  const user = await requireScopedRole("ADMIN");
  setRequestContext(user);
  const client = nodeSupabaseClient();
  if (!client) return { ok: false as const, error: "الخدمة غير متاحة حاليًا." };
  const academyId = user.academy_id ?? currentAcademyId();
  const { data: students, error } = await client
    .from("students")
    .select("id,first_name,last_name,portal_email")
    .eq("academy_id", academyId)
    .eq("is_active", true)
    .neq("status", "ARCHIVED")
    .order("first_name", { ascending: true })
    .limit(1000);
  if (error) return { ok: false as const, error: "تعذر تحميل الطلاب لإنشاء الحسابات." };

  const credentials: Array<{ studentId: string; studentName: string; email: string; password: string }> = [];
  let skipped = 0;
  const errors: string[] = [];
  for (const student of students ?? []) {
    if (student.portal_email) {
      skipped++;
      continue;
    }
    try {
      const generated = await generatePortalCredentials(user, student.id);
      credentials.push({
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`.trim(),
        email: generated.email,
        password: generated.password,
      });
    } catch (error) {
      errors.push(`${student.first_name} ${student.last_name}: ${error instanceof Error ? error.message : "تعذر إنشاء الحساب"}`);
    }
  }
  revalidatePath("/students");
  return { ok: true as const, credentials, created: credentials.length, skipped, errors };
}

export async function portalLoginAction(_previousState: PortalLoginState, formData: FormData) {
  return portalLogin(formData);
}

export async function portalLogoutAction() {
  return portalLogout();
}
