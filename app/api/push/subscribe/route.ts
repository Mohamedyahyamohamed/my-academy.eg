import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/services/session";
import { setRequestContext } from "@/services/request-context";
import { nodeSupabaseClient } from "@/lib/supabase/node-client";

export async function POST(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  setRequestContext(user);

  const subscription = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // خزّن الـ subscription في جدول جديد
  await client.from("push_subscriptions").upsert({
    user_id: user.id,
    academy_id: user.academy_id,
    endpoint: subscription.endpoint,
    subscription: subscription,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await loadCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  setRequestContext(user);

  const client = nodeSupabaseClient();
  if (!client) return NextResponse.json({ error: "DB error" }, { status: 500 });

  await client.from("push_subscriptions").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
