/**
 * Supabase configuration helper.
 *
 * The app runs fully on the local data layer for the demo. When you provide
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (plus the service
 * role key server-side), the app is ready to switch to Supabase.
 *
 * IMPORTANT: never expose the service role key to the client. Only anon key
 * is exposed via NEXT_PUBLIC_*.
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") === true
  );
}

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/**
 * Service role key — SERVER-SIDE ONLY (never expose to the client).
 * Used by nodeSupabaseClient for admin operations (auth.admin.createUser,
 * cross-tenant writes). Bypasses RLS.
 */
export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}