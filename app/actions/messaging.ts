"use server";
import { audit } from "@/services/audit";

import { revalidatePath } from "next/cache";
import { requireScopedRole } from "@/services";
import { sendMessage } from "@/services/messaging";

export async function sendMessageAction(recipientId: string, body: string, studentId?: string | null) {
  await requireScopedRole("ADMIN", "TEACHER", "PARENT");
  const msg = await sendMessage(recipientId, body, studentId);
  void audit({ action: "mutation" });
  revalidatePath("/messages");
  return msg ? { ok: true } : { ok: false, error: "Failed to send." };
}
