"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/services/supabase/config";

/** Supabase browser client (client components only). */
export function createBrowserSupabaseClient() {
  return createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
}
