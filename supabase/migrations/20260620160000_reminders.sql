-- Slice D 続き: 期限リマインド（reminders）。
-- 配信そのものは送信基盤（Resend）＋ cron が前提。env が揃うまで UI は
-- NEXT_PUBLIC_REMINDERS_ENABLED で隠す（「送れない通知を約束しない」YMYL方針）。
-- 機微情報は保存しない（制度 slug・通知日のみ）。本人だけが read/write（RLS）。

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_slug text not null,
  program_title text,
  reminder_date date not null,
  channel text not null default 'email',
  status text not null default 'scheduled',
  -- scheduled, sent, canceled
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, program_slug, reminder_date)
);
create index if not exists reminders_due_idx
  on public.reminders (reminder_date) where status = 'scheduled';

alter table public.reminders enable row level security;

drop policy if exists reminders_own_select on public.reminders;
create policy reminders_own_select on public.reminders
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists reminders_own_insert on public.reminders;
create policy reminders_own_insert on public.reminders
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists reminders_own_update on public.reminders;
create policy reminders_own_update on public.reminders
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists reminders_own_delete on public.reminders;
create policy reminders_own_delete on public.reminders
  for delete to authenticated using (auth.uid() = user_id);
