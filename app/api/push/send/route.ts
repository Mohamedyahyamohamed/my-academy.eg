import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/services/session";
import { setRequestContext } from "@/services/request-context";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { sendPushNotification } from "@/lib/web-push";

/**
 * يبعت إشعار push لكل مشتركي الأكاديمية.
 * البيانات: { title, body, target_user_id? }
 */
export async function POST(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  setRequestContext(user);
  if (user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { title, body, target_user_id } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ error: "DB error" }, { status: 500 });

  let query = client
    .from("push_subscriptions")
    .select("subscription")
    .eq("academy_id", user.academy_id);

  if (target_user_id) {
    query = query.eq("user_id", target_user_id);
  }

  const { data: subs } = await query;

  let sent = 0;
  for (const sub of subs ?? []) {
    const ok = await sendPushNotification(sub.subscription, title, body);
    if (ok) sent++;
  }

  return NextResponse.json({ ok: true, sent, total: subs?.length ?? 0 });
}
