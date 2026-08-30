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
  // E2E_DEMO_MODE intentionally forces the deterministic local fixture. This
  // prevents a developer machine's Supabase variables from making tests use a
  // hybrid data path while production continues to use Supabase normally.
  if (process.env.E2E_DEMO_MODE === "true") return false;
  // Vercel may expose the non-public server variable while a redeployment is
  // still using an older public-variable snapshot. Prefer the public value,
  // but accept the server-only alias as a runtime fallback.
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "https://fpcdaiyktnoiwaulbhcn.supabase.co")?.trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwY2RhaXlrdG5vaXdhdWxiaGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNjU3NTEsImV4cCI6MjEwMTg0MTc1MX0.t_3Ayqz0PCI_QOthrnyL5yWK6GQq230hjnvOzyfnGmw")?.trim();
  return Boolean(url && url.startsWith("http") && anonKey);
}

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "https://fpcdaiyktnoiwaulbhcn.supabase.co";
}

export function getSupabaseAnonKey(): string | undefined {
  // Keep this fallback server-side; SUPABASE_SERVICE_ROLE_KEY is never exposed
  // to client bundles and is only used when Vercel omitted the anon alias.
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwY2RhaXlrdG5vaXdhdWxiaGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNjU3NTEsImV4cCI6MjEwMTg0MTc1MX0.t_3Ayqz0PCI_QOthrnyL5yWK6GQq230hjnvOzyfnGmw";
}

/**
 * Service role key — SERVER-SIDE ONLY (never expose to the client).
 * Used by nodeSupabaseClient for admin operations (auth.admin.createUser,
 * cross-tenant writes). Bypasses RLS.
 */
export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}
