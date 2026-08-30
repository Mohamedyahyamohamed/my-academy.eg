/**
 * Supabase client for Node server contexts (route handlers, server actions).
 * Adds a `ws` polyfill so supabase-js realtime inits on Node < 22.
 */
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseServiceRoleKey,
} from "@/services/supabase/config";

function polyfillWs() {
  if ((globalThis as any).WebSocket) return;
  try {
    const { WebSocket: WS } = require("ws");
    (globalThis as any).WebSocket = WS;
  } catch {
    /* ignore */
  }
}

/**
 * Admin (service-role) Supabase client for server actions.
 * Uses the SERVICE ROLE key so auth.admin.createUser and other admin
 * operations work (the anon key returns "invalid bearer" on admin endpoints).
 * Bypasses RLS — only use server-side for trusted admin operations.
 */
export function nodeSupabaseClient() {
  const serviceKey = getSupabaseServiceRoleKey();
  const url = getSupabaseUrl();
  if (!url || !serviceKey?.trim()) return null;
  polyfillWs();
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, serviceKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
