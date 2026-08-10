"use server";
import { audit } from "@/services/audit";

import { revalidatePath } from "next/cache";
import { MiscService, requireRole } from "@/services";

/** Quick-create a parent record (no login) so it can be linked to a student. */
export async function createParentAction(input: {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  occupation?: string;
}) {
  requireRole("ADMIN", "TEACHER");
  if (!input.first_name || !input.last_name) {
    return { ok: false, error: "First and last name are required." };
  }
  const p = await MiscService.createParent({
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email || `${input.first_name}.${input.last_name}@parent.local`,
    phone: input.phone ?? null,
    occupation: input.occupation ?? null,
    profile_id: null,
  });
  void audit({ action: "mutation" });
  revalidatePath("/students");
  return { ok: true, parent: p };
}
