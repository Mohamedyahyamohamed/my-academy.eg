"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
} from "@supabase/realtime-js";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/services/supabase/config";

const REALTIME_PREFLIGHT_TIMEOUT_MS = 4000;

/**
 * Realtime notifications — replaces 20s polling when the Supabase endpoint is
 * reachable. The preflight prevents a DNS/offline failure from opening a
 * WebSocket that will repeatedly retry and flood the browser console.
 */
export function RealtimeNotifications() {
  const router = useRouter();

  React.useEffect(() => {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    if (!supabaseUrl || !supabaseAnonKey || typeof window === "undefined") return;

    let cancelled = false;
    let client: ReturnType<typeof createBrowserClient> | null = null;
    let channel: RealtimeChannel | null = null;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      REALTIME_PREFLIGHT_TIMEOUT_MS,
    );

    const startRealtime = async () => {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: "GET",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (cancelled || !response.ok) return;

        client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
          realtime: {
            logLevel: "error",
            logger: () => undefined,
          },
        });

        channel = client
          .channel("notifications")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "notifications" },
            () => router.refresh(),
          )
          .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
            if (
              status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
              status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
              status === REALTIME_SUBSCRIBE_STATES.CLOSED
            ) {
              if (channel && client) void client.removeChannel(channel);
            }
          });
      } catch {
        // Realtime is optional; failed DNS/offline checks use the normal page refresh path.
      } finally {
        window.clearTimeout(timeout);
      }
    };

    void startRealtime();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
      if (channel && client) void client.removeChannel(channel);
    };
  }, [router]);

  return null;
}
