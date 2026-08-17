"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, StudentsService, currentAcademyId } from "@/services";
import type { StudentInput } from "@/services/students";
import { STUDENT_DEFAULT_PASSWORD } from "@/lib/auth";

export async function createStudentAction(input: StudentInput) {
  try {
    const user = await requireScopedRole("ADMIN", "TEACHER");
    const student = await StudentsService.createStudent(input, user.academy_id);
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
    console.error("[createStudentAction] FAILED:", (e as Error)?.message);
    throw e;
  }
}

export async function updateStudentAction(id: string, input: Partial<StudentInput>) {
  try {
    const user = await requireScopedRole("ADMIN", "TEACHER");
    const student = StudentsService.updateStudent(id, input);
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
  StudentsService.setStudentStatus(id, "ARCHIVED");
  await import("@/services/audit").then((m) => m.audit(
    { action: "student.archive", entity_type: "student", entity_id: id },
    user,
  ));
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
}

export async function restoreStudentAction(id: string) {
  await requireScopedRole("ADMIN", "TEACHER");
  StudentsService.setStudentStatus(id, "ACTIVE");
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
    const { error: profileError } = await client.from("profiles").upsert({
      id: aData.user!.id,
      academy_id: aid,
      email: loginEmail,
      role: "STUDENT",
      full_name: `${s.first_name} ${s.last_name}`,
      is_active: true,
    });
    const { error: membershipError } = profileError ? { error: profileError } : await client
      .from("academy_memberships")
      .upsert({ academy_id: aid, profile_id: aData.user!.id, role: "STUDENT", status: "ACTIVE", joined_at: new Date().toISOString() }, { onConflict: "academy_id,profile_id" });
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
