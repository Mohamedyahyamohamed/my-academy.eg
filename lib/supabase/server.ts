import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/services/supabase/config";

/**
 * Supabase server client bound to the request cookies (SSR auth).
 * Uses the USER'S session (not service role) → RLS policies are enforced.
 * ws polyfill for Node < 22 (supabase-js realtime init).
 */
export async function createServerSupabaseClient() {
  // Polyfill WebSocket for Node < 22 (supabase-js realtime client).
  if (typeof globalThis !== "undefined" && !(globalThis as any).WebSocket) {
    try {
      const { WebSocket: WS } = require("ws");
      (globalThis as any).WebSocket = WS;
    } catch {}
  }

  const cookieStore = await cookies();
  return createServerClient(
    getSupabaseUrl()!,
    getSupabaseAnonKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies can't be set.
            // Middleware handles session refresh.
          }
        },
      },
    },
  );
}
