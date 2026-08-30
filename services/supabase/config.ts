/**
 * Supabase configuration helper.
 *
 * Public URL/key may be supplied through Vercel variables. The URL fallback is
 * safe because it is public; the service-role key must always come from a
 * server-only secret.
 *
 * IMPORTANT: never expose the service role key to the client. Only anon key
 * is exposed via NEXT_PUBLIC_*.
 */
export function isSupabaseConfigured(): boolean {
  // E2E_DEMO_MODE intentionally forces the deterministic local fixture. This
  // prevents a developer machine's Supabase variables from making tests use a
  // hybrid data path while production continues to use Supabase normally.
  if (process.env.E2E_DEMO_MODE === "true") return false;
  const url = getSupabaseUrl()?.trim();
  const anonKey = getSupabaseAnonKey()?.trim();
  return Boolean(url && url.startsWith("http") && anonKey);
}

export function getSupabaseUrl(): string | undefined {
  const fallback = "https://fpcdaiyktnoiwaulbhcn.supabase.co";
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  return configured?.includes("fpcdaiyktnoiwaulbhcn.supabase.co") ? configured : fallback;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
}

/**
 * Service role key — SERVER-SIDE ONLY (never expose to the client).
 * Used by nodeSupabaseClient for admin operations (auth.admin.createUser,
 * cross-tenant writes). Bypasses RLS.
 */
export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}
