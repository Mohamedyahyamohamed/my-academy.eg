/**
 * Email service — sends real emails via Resend.
 * Uses onboarding@resend.dev as sender (change to your domain after verifying).
 */
import { Resend } from "resend";
import { APP_CONFIG } from "@/lib/constants";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "MY Academy <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[email] (no Resend key) would send to ${to}: ${subject}`);
    return false;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return true;
  } catch (e) {
    console.error("[email] send failed:", (e as Error).message);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string, role: string): Promise<void> {
  await send(
    email,
    `Welcome to ${APP_CONFIG.name}! 🎉`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2> Welcome, ${name}! </h2>
      <p>Your ${APP_CONFIG.name} account is ready. You're registered as <strong>${role}</strong>.</p>
      <p>Sign in with your email and password to get started.</p>
      <p style="color:#64748b;font-size:14px;margin-top:24px">${APP_CONFIG.name}</p>
    </div>`,
  );
}

export async function sendInviteEmail(
  email: string,
  name: string,
  password: string,
  role: string,
): Promise<void> {
  await send(
    email,
    `Your ${APP_CONFIG.name} account`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Hello ${name},</h2>
      <p>An account has been created for you at <strong>${APP_CONFIG.name}</strong>.</p>
      <table style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:8px;width:100%">
        <tr><td style="color:#64748b">Email:</td><td><strong>${email}</strong></td></tr>
        <tr><td style="color:#64748b">Password:</td><td><strong>${password}</strong></td></tr>
        <tr><td style="color:#64748b">Role:</td><td><strong>${role}</strong></td></tr>
      </table>
      <p>Please sign in and change your password.</p>
    </div>`,
  );
}

export async function sendPasswordResetEmail(email: string, name: string): Promise<void> {
  await send(
    email,
    `Reset your password — ${APP_CONFIG.name}`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Hello ${name},</h2>
      <p>We received a request to reset your password.</p>
      <p>Please contact your academy administrator to reset your password, or use the "Forgot Password" flow on the website.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>`,
  );
}

export async function sendPaymentReminder(
  email: string,
  studentName: string,
  amount: string,
  month: string,
): Promise<void> {
  await send(
    email,
    `Payment reminder — ${APP_CONFIG.name}`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Payment Reminder</h2>
      <p>This is a friendly reminder that <strong>${studentName}</strong> has an outstanding payment of <strong>${amount}</strong> for <strong>${month}</strong>.</p>
      <p>Please complete the payment at your earliest convenience.</p>
      <p style="color:#64748b;margin-top:24px">${APP_CONFIG.name}</p>
    </div>`,
  );
}
