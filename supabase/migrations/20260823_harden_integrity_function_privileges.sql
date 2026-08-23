-- Integrity trigger functions are invoked by PostgreSQL triggers, not by API callers.
-- Do not expose their SECURITY DEFINER implementations through PostgREST RPC.
revoke all on function public.enforce_same_academy_relationship() from public, anon, authenticated;
revoke all on function public.enforce_direct_academy_references() from public, anon, authenticated;
