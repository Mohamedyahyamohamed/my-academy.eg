"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, StudentsService, currentAcademyId, isLimitedAssistant } from "@/services";
import { DuplicateStudentError, findStudentDuplicates, type StudentInput } from "@/services/students";
import { STUDENT_DEFAULT_PASSWORD } from "@/lib/auth";
import { audit } from "@/services/audit";

export async function findStudentDuplicatesAction(input: StudentInput) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage students.");
  return findStudentDuplicates(input, user.academy_id, user);
}

export async function createStudentAction(input: StudentInput, options: { allowDuplicate?: boolean } = {}) {
  try {
    const user = await requireScopedRole("ADMIN", "TEACHER");
    if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage students.");
    const student = await StudentsService.createStudent(input, user.academy_id, user.id, user, options);
    // WhatsApp هو القناة الافتراضية بعد تفعيل الدفع في Meta.
    // يمكن استخدام البريد مؤقتًا عبر WHATSAPP_QR_CHANNEL=email.
    try {
      const channel = process.env.WHATSAPP_QR_CHANNEL?.toLowerCase() || "whatsapp";
      if (channel === "whatsapp") {
        await Promise.race([
          import("@/services/whatsapp").then(({ notifyStudentQrWhatsApp }) =>
            notifyStudentQrWhatsApp(student.id, input.consent_given === true),
          ),
          new Promise<void>((resolve) => setTimeout(resolve, 8_000)),
        ]);
      } else if (student.email) {
        const { sendStudentQrEmail } = await import("@/lib/email");
        const result = await sendStudentQrEmail({
          email: student.email,
          studentName: `${student.first_name} ${student.last_name}`,
          studentId: student.id,
        });
        if (!result.sent) console.error("student QR email:", result.errorCode);
      } else {
        console.warn("student QR email skipped: student has no email");
      }
    } catch (error) {
      console.error("student QR notification:", (error as Error)?.message);
    }
    await import("@/services/audit").then((m) => m.audit(
      { action: "student.create", entity_type: "student", entity_id: student.id, new_data: { name: `${student.first_name} ${student.last_name}` } },
      user,
    ));
    revalidatePath("/students");
    revalidatePath("/dashboard");
    return student;
  } catch (e) {
    if (e instanceof DuplicateStudentError) {
      return { ok: false as const, duplicate: true as const, candidates: e.candidates };
    }
    console.error("[createStudentAction] FAILED:", (e as Error)?.message);
    throw e;
  }
}

export async function updateStudentAction(id: string, input: Partial<StudentInput>) {
  try {
    const user = await requireScopedRole("ADMIN", "TEACHER");
    if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage students.");
    const student = await StudentsService.updateStudent(id, input, user.academy_id, user);
    if (student) {
      await import("@/services/audit").then((m) => m.audit(
        { action: "student.update", entity_type: "student", entity_id: id, new_data: input },
        user,
      ));
    }
    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    revalidatePath("/dashboard");
    return student;
  } catch (e) {
    console.error("[updateStudentAction] FAILED:", (e as Error)?.message);
    throw e;
  }
}

export async function archiveStudentAction(id: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage students.");
  await StudentsService.setStudentStatus(id, "ARCHIVED", user.academy_id, user);
  await import("@/services/audit").then((m) => m.audit(
    { action: "student.archive", entity_type: "student", entity_id: id },
    user,
  ));
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
}

export async function deleteStudentAction(id: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage students.");
  const result = await StudentsService.deleteStudent(id, user.academy_id, user);
  void audit({
    action: result.mode === "archived" ? "student.archive" : "student.delete",
    entity_type: "student",
    entity_id: id,
    metadata: { mode: result.mode, relation_count: result.relationCount },
  }, user);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
  return result;
}

export async function restoreStudentAction(id: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (await isLimitedAssistant(user)) throw new Error("Assistant accounts cannot manage students.");
  // A student may only return to ACTIVE after a server-recorded parental
  // consent event. Restoring an archived row must not fabricate consent.
  const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
  const client = nodeSupabaseClient();
  const aid = user.academy_id ?? currentAcademyId();
  const { data: student } = client && aid
    ? await client.from("students").select("consent_given").eq("id", id).eq("academy_id", aid).maybeSingle()
    : { data: null };
  await StudentsService.setStudentStatus(id, student?.consent_given === true ? "ACTIVE" : "INACTIVE", user.academy_id, user);
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
}

/**
 * ينشئ حسابات دخول (إيميل + باسورد افتراضي) لكل الطلاب اللي ممعاهومش حساب.
 */
export async function createMissingStudentAccountsAction() {
  await requireScopedRole("ADMIN");
  const aid = currentAcademyId();
  const { nodeSupabaseClient } = await import("@/lib/supabase/node-client");
  const client = nodeSupabaseClient();
  if (!client) return { ok: false, error: "Supabase not configured." };

  const { data: students } = await client
    .from("students")
    .select("id,first_name,last_name,email")
    .eq("academy_id", aid)
    .or("email.is.null");

  let created = 0;
  const errors: string[] = [];

  for (const s of students ?? []) {
    const loginEmail =
      `${s.first_name}.${s.last_name}`.replace(/[^a-zA-Z0-9.]/g, "").toLowerCase() +
      `.${s.id.slice(0, 4)}@student.local`;
    const { data: aData, error: aErr } = await client.auth.admin.createUser({
      email: loginEmail,
      password: STUDENT_DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: `${s.first_name} ${s.last_name}`, role: "STUDENT", academy_id: aid },
    });
    if (aErr) {
      errors.push(`${s.first_name} ${s.last_name}: ${aErr.message}`);
      continue;
    }
    const { data: sourceStudent } = await client
      .from("students")
      .select("consent_given")
      .eq("id", s.id)
      .eq("academy_id", aid)
      .maybeSingle();
    const consentGiven = sourceStudent?.consent_given === true;
    const { error: profileError } = await client.from("profiles").upsert({
      id: aData.user!.id,
      academy_id: aid,
      email: loginEmail,
      role: "STUDENT",
      full_name: `${s.first_name} ${s.last_name}`,
      // Never activate a student login before server-recorded consent.
      is_active: consentGiven,
    });
    const { error: membershipError } = profileError ? { error: profileError } : await client
      .from("academy_memberships")
      .upsert({ academy_id: aid, profile_id: aData.user!.id, role: "STUDENT", status: consentGiven ? "ACTIVE" : "INVITED", joined_at: new Date().toISOString() }, { onConflict: "academy_id,profile_id" });
    if (membershipError) {
      await client.auth.admin.deleteUser(aData.user!.id);
      errors.push(`${s.first_name} ${s.last_name}: ${membershipError.message}`);
      continue;
    }
    await client.from("students").update({ email: loginEmail }).eq("id", s.id);
    created++;
  }

  revalidatePath("/students");
  return { ok: true, created, errors };
}
