"use server";
import { audit } from "@/services/audit";

import { logout as doLogout, loginAsDemo, requestPasswordReset } from "@/services/session";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, LIMITS } from "@/lib/rate-limit-redis";

export async function logoutAction() {
  await doLogout();
  void audit({ action: "auth.logout" });
}

export async function demoLoginAction(email: string) {
  return loginAsDemo(email);
}

export async function requestPasswordResetAction(email: string) {
  // Rate limit: prevent abuse.
  const rl = await rateLimit(`reset:${email.toLowerCase()}`, LIMITS.resetPassword.max, LIMITS.resetPassword.window);
  if (!rl.allowed) {
    return { ok: false, error: "Too many reset attempts. Please try again later." };
  }
  const res = await requestPasswordReset(email);
  if (res.ok && res.user) {
    void sendPasswordResetEmail(email, res.user.full_name);
  }
  return res;
}

// Audit all actions in this file.
