-- Run once after schema.sql. Stores AI-written daily briefings for the admin dashboard.
create table if not exists public.daily_summaries (
  id           uuid primary key default gen_random_uuid(),
  summary      text not null,
  stats        jsonb,
  source       text not null default 'edge-function',
  generated_at timestamptz not null default now()
);

create index if not exists idx_daily_summaries_generated on public.daily_summaries(generated_at desc);

alter table public.daily_summaries enable row level security;

drop policy if exists daily_summaries_admin_select on public.daily_summaries;
create policy daily_summaries_admin_select on public.daily_summaries
  for select to authenticated using (public.is_admin());

-- Inserts come from the Edge Function / n8n using the service role (bypasses RLS).
