import webpush from "web-push";

/**
 * VAPID keys live in the environment — never in source control.
 * (Rotated 2026-08 after the old pair was found committed to the repo.)
 * Generate a fresh pair once with: npx web-push generate-vapid-keys
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — safe to expose to the browser
 *   VAPID_PRIVATE_KEY             — server-only
 */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

let configured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@myacademy.edu",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  configured = true;
} else if (process.env.NODE_ENV === "production") {
  console.error(
    "[web-push] NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set — push notifications are disabled.",
  );
}

/** Whether push sending is usable in the current environment. */
export function isPushConfigured(): boolean {
  return configured;
}

/** Public key handed to browsers for push subscriptions (empty when unconfigured). */
export const PUBLIC_VAPID_KEY = VAPID_PUBLIC_KEY;

export async function sendPushNotification(
  subscription: any,
  title: string,
  body: string,
) {
  if (!configured) return false;
  try {
    const payload = JSON.stringify({ title, body, icon: "/favicon.ico" });
    await webpush.sendNotification(subscription, payload);
    return true;
  } catch (e) {
    console.error("push error:", (e as Error)?.message);
    return false;
  }
}
