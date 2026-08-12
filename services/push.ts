import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { sendPushNotification } from "@/lib/web-push";

/**
 * يبعت إشعار Push لكل مشتركي أكاديمية معينة.
 */
export async function notifyAcademy(
  academyId: string,
  title: string,
  body: string,
  targetUserId?: string,
) {
  try {
    const client = nodeSupabaseClient();
    if (!client) return;

    let query = client
      .from("push_subscriptions")
      .select("subscription")
      .eq("academy_id", academyId);

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: subs } = await query;
    for (const sub of subs ?? []) {
      await sendPushNotification(sub.subscription, title, body);
    }
  } catch {
    // silent — push is best-effort
  }
}
