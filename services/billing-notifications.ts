import type { SupabaseClient } from "@supabase/supabase-js";

const RENEWAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type SubscriptionRow = {
  academy_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
};

type ProfileRow = { id: string };

function notificationTitle(subscription: SubscriptionRow): string {
  return subscription.status === "past_due" ? "تحتاج دفعة الاشتراك إلى متابعة" : "موعد تجديد الاشتراك قريب";
}

function notificationMessage(subscription: SubscriptionRow, periodEnd: Date): string {
  const date = periodEnd.toLocaleDateString("ar-EG", { dateStyle: "long" });
  return subscription.status === "past_due"
    ? `تعذر تأكيد آخر دفعة. يرجى مراجعة بوابة الدفع قبل ${date} للحفاظ على استمرار الخدمة.`
    : `ينتهي اشتراك أكاديميتك في ${date}. راجع صفحة الاشتراك للتأكد من خطة التجديد.`;
}

/** Create in-app billing alerts for academy administrators; safe to run from Vercel Cron. */
export async function createBillingNotifications(
  client: SupabaseClient,
  now = new Date(),
): Promise<{ academiesChecked: number; notificationsCreated: number }> {
  const upperBound = new Date(now.getTime() + RENEWAL_WINDOW_MS).toISOString();
  const lowerBound = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: subscriptions, error: subscriptionError } = await client
    .from("subscriptions")
    .select("academy_id,plan_id,status,current_period_end")
    .in("status", ["active", "trialing", "past_due"])
    .gte("current_period_end", lowerBound)
    .lte("current_period_end", upperBound)
    .limit(500);
  if (subscriptionError) throw new Error("Unable to read subscriptions for notifications.");

  let notificationsCreated = 0;
  for (const subscription of (subscriptions ?? []) as SubscriptionRow[]) {
    if (!subscription.current_period_end) continue;
    const periodEnd = new Date(subscription.current_period_end);
    if (Number.isNaN(periodEnd.getTime())) continue;

    const { data: admins, error: profileError } = await client
      .from("profiles")
      .select("id")
      .eq("academy_id", subscription.academy_id)
      .eq("role", "ADMIN")
      .eq("is_active", true)
      .limit(100);
    if (profileError) throw new Error("Unable to read academy administrators for notifications.");

    const title = notificationTitle(subscription);
    const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MS).toISOString();
    const { data: recent } = await client
      .from("notifications")
      .select("id,user_id")
      .eq("academy_id", subscription.academy_id)
      .eq("type", "system")
      .eq("title", title)
      .gte("created_at", duplicateSince)
      .limit(500);
    const recentKeys = new Set((recent ?? []).map((row) => `${row.user_id ?? "broadcast"}`));

    const rows = ((admins ?? []) as ProfileRow[])
      .filter((admin) => !recentKeys.has(admin.id))
      .map((admin) => ({
        academy_id: subscription.academy_id,
        user_id: admin.id,
        type: "system",
        title,
        message: notificationMessage(subscription, periodEnd),
        link: "/billing",
        read: false,
      }));
    if (!rows.length) continue;

    const inserted = await client.from("notifications").insert(rows);
    if (inserted.error) throw new Error("Unable to create billing notifications.");
    notificationsCreated += rows.length;
  }

  return { academiesChecked: (subscriptions ?? []).length, notificationsCreated };
}
