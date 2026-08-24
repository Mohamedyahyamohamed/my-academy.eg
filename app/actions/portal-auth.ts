"use server";

import { revalidatePath } from "next/cache";
import { requireScopedRole } from "@/services";
import { generatePortalCredentials, portalLogin, portalLogout, type PortalLoginState } from "@/services/portal-auth";

export async function generatePortalCredentialsAction(studentId: string) {
  const user = await requireScopedRole("ADMIN");
  const result = await generatePortalCredentials(user, studentId);
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return result;
}

export async function portalLoginAction(_previousState: PortalLoginState, formData: FormData) {
  return portalLogin(formData);
}

export async function portalLogoutAction() {
  return portalLogout();
}
