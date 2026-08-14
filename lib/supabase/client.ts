"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/services/supabase/config";

/** Supabase browser client (client components only). */
export function createBrowserSupabaseClient() {
  return createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
}

/**
 * Browser client dedicated to password recovery.
 *
 * Recovery links are parsed explicitly by /reset-password. Keeping URL
 * detection off prevents Supabase's automatic PKCE handler from consuming the
 * one-time link before the page can persist the recovery session. The reset
 * request is issued with the implicit flow, so the access/refresh tokens can
 * be installed directly with setSession even when the link is opened in a
 * different mobile browser context.
 */
export function createRecoverySupabaseClient() {
  return createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    isSingleton: false,
    auth: {
      flowType: "implicit",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
