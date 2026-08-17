"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole, PaymentsService } from "@/services";
import type { CreatePaymentInput } from "@/services/payments";

export async function createPaymentAction(input: CreatePaymentInput) {
  const user = await requireScopedRole("ADMIN");
  const res = await PaymentsService.createPayment(input);
  if (!res.ok) return res;
  await import("@/services/audit").then((m) => m.audit(
    { action: "payment.create", entity_type: "payment", entity_id: res.payment?.id, new_data: { student_id: input.student_id, amount_due: input.amount_due } },
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
  const user = await requireScopedRole("ADMIN");
  const res = await PaymentsService.recordPayment(paymentId, amount, method, note);
  if (res.ok) {
    await import("@/services/audit").then((m) => m.audit(
      { action: "payment.record", entity_type: "payment", entity_id: paymentId, new_data: { amount, method } },
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
