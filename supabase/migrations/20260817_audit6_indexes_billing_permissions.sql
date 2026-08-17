-- Audit 6: performance indexes and billing write protection.
-- Applied to project fpcdaiyktnoiwaulbhcn via Supabase migration tooling.

create index if not exists idx_academies_suspended_by on public.academies (suspended_by);
create index if not exists idx_academy_invites_invited_by on public.academy_invites (invited_by);
create index if not exists idx_billing_events_plan_id on public.billing_events (plan_id);
create index if not exists idx_content_files_owner_id on public.content_files (owner_id);
create index if not exists idx_content_links_owner_id on public.content_links (owner_id);
create index if not exists idx_exams_academy_id on public.exams (academy_id);
create index if not exists idx_exams_course_id on public.exams (course_id);
create index if not exists idx_homework_academy_id on public.homework (academy_id);
create index if not exists idx_homework_lesson_id on public.homework (lesson_id);
create index if not exists idx_invite_tokens_academy_id on public.invite_tokens (academy_id);
create index if not exists idx_invite_tokens_created_by on public.invite_tokens (created_by);
create index if not exists idx_lessons_teacher_id on public.lessons (teacher_id);
create index if not exists idx_messages_academy_id on public.messages (academy_id);
create index if not exists idx_notes_academy_id on public.notes (academy_id);
create index if not exists idx_notes_author_id on public.notes (author_id);
create index if not exists idx_notes_student_id on public.notes (student_id);
create index if not exists idx_notifications_academy_id on public.notifications (academy_id);
create index if not exists idx_parents_profile_id on public.parents (profile_id);
create index if not exists idx_payments_academy_id on public.payments (academy_id);
create index if not exists idx_payments_group_id on public.payments (group_id);
create index if not exists idx_qr_sessions_lesson_id on public.qr_sessions (lesson_id);
create index if not exists idx_students_consent_by on public.students (consent_by);
create index if not exists idx_subscriptions_plan_id on public.subscriptions (plan_id);
create index if not exists idx_teachers_profile_id on public.teachers (profile_id);
create index if not exists idx_whatsapp_message_logs_student_id on public.whatsapp_message_logs (student_id);
create index if not exists idx_whatsapp_preferences_parent_id on public.whatsapp_preferences (parent_id);

alter table public.billing_events enable row level security;
revoke insert, update, delete on table public.billing_events from anon, authenticated;

-- Trigger-only function; clients do not need to call it through PostgREST.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
