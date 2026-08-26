-- Performance: index the hottest foreign keys flagged by Supabase advisors.
-- Batch 1 - the tables touched by daily teacher/student flows.
create index concurrently if not exists idx_academy_invites_academy_id on public.academy_invites (academy_id);
create index concurrently if not exists idx_academy_memberships_academy_id on public.academy_memberships (academy_id);
create index concurrently if not exists idx_ai_chat_logs_academy_id on public.ai_chat_logs (academy_id);
