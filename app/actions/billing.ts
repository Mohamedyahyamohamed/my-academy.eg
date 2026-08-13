"use server";

import { createCheckout } from "@/services/billing";
import { requireScopedRole } from "@/services";

export async function startBillingCheckoutAction(planId: string) {
  const user = await requireScopedRole("ADMIN");
  const result = await createCheckout({
    academyId: user.academy_id,
    email: user.email,
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
