-- ============================================================
-- WhatsApp opt-in and delivery log controls
-- Apply through Supabase SQL Editor or migration runner once.
-- This migration does not send messages or alter existing parent records.
-- ============================================================

create table if not exists public.whatsapp_preferences (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  parent_id uuid not null references public.parents(id) on delete cascade,
  opted_in boolean not null default false,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  consent_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academy_id, parent_id),
  check (
    (opted_in = true and opted_in_at is not null and opted_out_at is null)
    or (opted_in = false)
  )
);

create index if not exists whatsapp_preferences_parent_idx
  on public.whatsapp_preferences (academy_id, parent_id, opted_in);

create table if not exists public.whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  parent_id uuid references public.parents(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  event_type text not null,
  template_name text,
  recipient_phone_last4 text,
  external_message_id text,
  status text not null default 'SKIPPED'
    check (status in ('SKIPPED', 'ACCEPTED', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  failure_reason text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_logs_academy_created_idx
  on public.whatsapp_message_logs (academy_id, created_at desc);
create index if not exists whatsapp_logs_parent_created_idx
  on public.whatsapp_message_logs (parent_id, created_at desc);
create unique index if not exists whatsapp_logs_external_message_id_uniq
  on public.whatsapp_message_logs (external_message_id)
  where external_message_id is not null;

alter table public.whatsapp_preferences enable row level security;
alter table public.whatsapp_message_logs enable row level security;

drop policy if exists whatsapp_preferences_tenant on public.whatsapp_preferences;
create policy whatsapp_preferences_tenant on public.whatsapp_preferences
  for all using (academy_id = public.auth_academy_id())
  with check (academy_id = public.auth_academy_id());

drop policy if exists whatsapp_message_logs_tenant on public.whatsapp_message_logs;
create policy whatsapp_message_logs_tenant on public.whatsapp_message_logs
  for all using (academy_id = public.auth_academy_id())
  with check (academy_id = public.auth_academy_id());

-- Reload PostgREST schema after adding API-visible tables.
notify pgrst, 'reload schema';
