"use server";

import { createCheckout } from "@/services/billing";
import { requireScopedRole } from "@/services";

export async function startBillingCheckoutAction(planId: string) {
  const user = await requireScopedRole("ADMIN", "TEACHER");
  if (user.role === "SUPER_ADMIN") {
    return { ok: false as const, error: "مالك المنصة لا يحتاج إلى خطة عميل أو اشتراك خاص به." };
  }
  const result = await createCheckout({
    academyId: user.academy_id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  }, planId);

  if (result.ok) {
    await import("@/services/audit").then((module) => module.audit({
      action: "billing.checkout_started",
      entity_type: "subscription",
      new_data: { plan_id: planId, provider: result.provider },
    }, user));
  }

  return result;
}
