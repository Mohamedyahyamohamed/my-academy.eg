import webpush from "web-push";

// VAPID keys (generated once, reused forever)
const VAPID_PUBLIC_KEY =
  "BFD5Yemjsjd3BMejcru_eiNpsuIHQ87tdisS1AYuYqDJlqytE8EGlIMy9rHB3O27-U1nQ2ncEXoXOP3SVhdTbgI";
const VAPID_PRIVATE_KEY = "NuckGRAQ8dSm73vXp40BnD2430ecdKMX1qPDoS-LtY4";

webpush.setVapidDetails(
  "mailto:admin@myacademy.edu",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

export const PUBLIC_VAPID_KEY = VAPID_PUBLIC_KEY;

export async function sendPushNotification(
  subscription: any,
  title: string,
  body: string,
) {
  try {
    const payload = JSON.stringify({ title, body, icon: "/favicon.ico" });
    await webpush.sendNotification(subscription, payload);
    return true;
  } catch (e) {
    console.error("push error:", (e as Error)?.message);
    return false;
  }
}
