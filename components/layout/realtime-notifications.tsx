"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/services/supabase/config";

/**
 * Realtime notifications — replaces 20s polling.
 * Listens to Supabase Realtime on the notifications table.
 * Falls back silently if realtime isn't available.
 */
export function RealtimeNotifications() {
  const router = useRouter();

  React.useEffect(() => {
    if (!getSupabaseUrl() || !getSupabaseAnonKey()) return;
    try {
      const client = createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
      const channel = client
        .channel("notifications")
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          () => router.refresh(),
        )
        .subscribe();

      return () => { client.removeChannel(channel); };
    } catch {
      // Realtime not available — polling still works as fallback.
    }
  }, [router]);

  return null;
}
