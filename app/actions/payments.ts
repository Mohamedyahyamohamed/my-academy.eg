"use server";

import { revalidatePath } from "next/cache";
import { loadCurrentUser, requireScopedRole, PaymentsService } from "@/services";
import { isSupabaseConfigured } from "@/services/supabase/config";
import type { CreatePaymentInput } from "@/services/payments";
import type { SessionUser } from "@/types";
import { teacherStudentScope } from "@/services/_shared";
import { resolveTeacherForGroups } from "@/services/groups";
import { setRequestContext } from "@/services/request-context";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

async function requirePaymentRecorder(): Promise<{ user: SessionUser } | { error: string }> {
  // Resolve the session from cookies directly so a fresh Server Action does not
  // depend on AsyncLocalStorage context; return a clear error instead of a
  // redirect that the payment dialog would surface as a generic failure.
  const user = await loadCurrentUser();
  if (!user) {
    return { error: "SESSION_EXPIRED" };
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && user.role !== "TEACHER") {
    return { error: "SESSION_EXPIRED" };
  }
  return { user };
}

async function assertTeacherStudentScope(user: { id: string; email: string; role: string; academy_id: string }, studentId: string) {
  if (user.role !== "TEACHER") return;

  // The page-level teacher scope resolves the internal teachers.id from the
  // authenticated profile id/email. Use the same source for writes so an
  // Assistant (whose group_assistants.teacher_id is teachers.id) is not
  // rejected merely because its profile id differs from that row id.
  const teacher = await resolveTeacherForGroups(user.academy_id, user.id, user.email);
  const client = nodeSupabaseClient();
  if (teacher && client) {
    const [{ data: ownedGroups, error: ownedError }, { data: assistantLinks, error: assistantError }] = await Promise.all([
      client.from("groups").select("id").eq("academy_id", user.academy_id).eq("teacher_id", teacher.id).limit(1000),
      client.from("group_assistants").select("group_id").eq("teacher_id", teacher.id).limit(1000),
    ]);
    if (ownedError || assistantError) {
      throw new Error("Unable to verify the student's assigned group.");
    }

    const candidateGroupIds = [...new Set([
      ...(ownedGroups ?? []).map((row: any) => row.id),
      ...(assistantLinks ?? []).map((row: any) => row.group_id),
    ].filter(Boolean))];
    if (candidateGroupIds.length) {
      const { data: scopedGroups, error: scopedGroupsError } = await client
        .from("groups")
        .select("id")
        .eq("academy_id", user.academy_id)
        .in("id", candidateGroupIds)
        .limit(1000);
      if (scopedGroupsError) throw new Error("Unable to verify the student's assigned group.");

      const groupIds = (scopedGroups ?? []).map((row: any) => row.id).filter(Boolean);
      if (groupIds.length) {
        const { data: memberships, error: membershipsError } = await client
          .from("group_students")
          .select("student_id")
          .in("group_id", groupIds)
          .limit(5000);
        if (membershipsError) throw new Error("Unable to verify the student's assigned group.");
        if ((memberships ?? []).some((row: any) => row.student_id === studentId)) return;
      }
    }
    throw new Error("Teachers can only record payments for students in their assigned groups.");
  }

  // Demo/no-client fallback; still fail closed if no local teacher scope exists.
  const scope = teacherStudentScope();
  if (!scope || !scope.has(studentId)) {
    throw new Error("Teachers can only record payments for students in their assigned groups.");
  }
}

function receiverAudit(user: { id: string; role: string; full_name: string; email: string }) {
  return {
    user_id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
  };
}

export async function createPaymentAction(input: CreatePaymentInput) {
  try {
    const auth = await requirePaymentRecorder();
    if ("error" in auth) return { ok: false, error: auth.error };
    const user = auth.user;
    await assertTeacherStudentScope(user, input.student_id);
    // Re-bind after awaited scope checks; AsyncLocalStorage may be lost in Server Actions.
    setRequestContext(user);
    const paymentInput: CreatePaymentInput = user.role === "TEACHER"
      ? { ...input, method: "Cash" }
      : input;
    const res = await PaymentsService.createPayment(paymentInput, user.academy_id);
    if (!res.ok) return res;
    await import("@/services/audit").then((m) => m.audit(
      {
        academy_id: user.academy_id,
        action: "payment.create",
        entity_type: "payment",
        entity_id: res.payment?.id,
        new_data: {
          student_id: input.student_id,
          amount_due: input.amount_due,
          amount_paid: input.amount_paid ?? 0,
          method: paymentInput.method ?? null,
          received_by: (paymentInput.amount_paid ?? 0) > 0 ? receiverAudit(user) : null,
        },
      },
      user,
    )).catch(() => {});
    try {
      revalidatePath("/payments");
      revalidatePath(`/students/${input.student_id}`);
      if (input.group_id) revalidatePath(`/groups/${input.group_id}`);
      revalidatePath("/dashboard");
    } catch {}
    return res;
  } catch (err: any) {
    if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_")) {
      throw err; // let Next.js redirects propagate
    }
    console.error("createPaymentAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unable to record payment." };
  }
}

export async function recordPaymentAction(
  paymentId: string,
  amount: number,
  method: string,
  note?: string,
) {
  try {
    const auth = await requirePaymentRecorder();
    if ("error" in auth) return { ok: false, error: auth.error };
    const user = auth.user;
    const payment = PaymentsService.getPayment(paymentId, user.academy_id);
    if (!payment) {
      return { ok: false, error: "Payment not found." };
    }
    if (!isSupabaseConfigured() && payment.academy_id !== user.academy_id) {
      // Demo / local mode: seeded payments may belong to a different seeded
      // academy than the signed-in demo user. Skip the cross-tenant guard so
      // recording a fee still works instead of throwing.
    } else if (payment.academy_id !== user.academy_id) {
      return { ok: false, error: "Payment is outside the authenticated academy." };
    }
    await assertTeacherStudentScope(user, payment.student_id);
    
    // Re-bind after awaited scope checks; AsyncLocalStorage may be lost in Server Actions.
    setRequestContext(user);
    
    const effectiveMethod = user.role === "TEACHER" ? "Cash" : method;
    const res = await PaymentsService.recordPayment(paymentId, amount, effectiveMethod, note, user.academy_id);
    if (res.ok) {
      await import("@/services/audit").then((m) => m.audit(
        {
          academy_id: user.academy_id,
          action: "payment.record",
          entity_type: "payment",
          entity_id: paymentId,
          new_data: { amount, method: effectiveMethod, received_by: receiverAudit(user) },
        },
        user,
      ));
      // إشعار Push لأولياء الأمور
      const { notifyAcademy } = await import("@/services/push");
      void notifyAcademy(user.academy_id, "💰 دفعة مسجّلة", `تم تسجيل دفعة بقيمة ${amount} جنيه.`);
      revalidatePath("/payments");
      revalidatePath(`/students/${payment.student_id}`);
      if (payment.group_id) revalidatePath(`/groups/${payment.group_id}`);
      revalidatePath("/dashboard");
    }
    return res;
  } catch (error: any) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_")) {
      throw error; // let Next.js redirects propagate
    }
    console.error("[recordPaymentAction] FAILED:", error?.message);
    return { ok: false, error: error?.message || "Could not record payment." };
  }
}

export async function deletePaymentAction(id: string) {
  const user = await requireScopedRole("ADMIN");
  await PaymentsService.deletePayment(id, user.academy_id);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
