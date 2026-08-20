"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, PaymentsService } from "@/services";
import type { CreatePaymentInput } from "@/services/payments";
import { teacherStudentScope } from "@/services/_shared";

async function requirePaymentRecorder() {
  return requireScopedRole("ADMIN", "TEACHER");
}

function assertTeacherStudentScope(user: { role: string; academy_id: string }, studentId: string) {
  if (user.role !== "TEACHER") return;
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
  const user = await requirePaymentRecorder();
  assertTeacherStudentScope(user, input.student_id);
  const paymentInput: CreatePaymentInput = user.role === "TEACHER"
    ? { ...input, method: "Cash" }
    : input;
  const res = await PaymentsService.createPayment(paymentInput);
  if (!res.ok) return res;
  await import("@/services/audit").then((m) => m.audit(
    {
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
  ));
  revalidatePath("/payments");
  revalidatePath(`/students/${input.student_id}`);
  revalidatePath("/dashboard");
  return res;
}

export async function recordPaymentAction(
  paymentId: string,
  amount: number,
  method: string,
  note?: string,
) {
  const user = await requirePaymentRecorder();
  const payment = PaymentsService.getPayment(paymentId);
  if (!payment || payment.academy_id !== user.academy_id) {
    throw new Error("Payment is outside the authenticated academy.");
  }
  assertTeacherStudentScope(user, payment.student_id);
  const effectiveMethod = user.role === "TEACHER" ? "Cash" : method;
  const res = await PaymentsService.recordPayment(paymentId, amount, effectiveMethod, note);
  if (res.ok) {
    await import("@/services/audit").then((m) => m.audit(
      {
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
    // إشعار واتساب لولي أمر الطالب صاحب الدفعة
    void (async () => {
      const { getStudentIdByPayment, notifyParentWhatsApp } = await import("@/services/whatsapp");
      const studentId = await getStudentIdByPayment(paymentId);
      if (studentId) {
        await notifyParentWhatsApp(
          studentId,
          "💰 دفعة مسجّلة",
          `تم تسجيل دفعة بقيمة ${amount} جنيه. شكرًا لكم.`,
          "PAYMENT_RECORDED",
        );
      }
    })();
    revalidatePath("/payments");
    revalidatePath("/dashboard");
  }
  return res;
}

export async function deletePaymentAction(id: string) {
  await requireScopedRole("ADMIN");
  await PaymentsService.deletePayment(id);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
