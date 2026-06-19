-- Phase 3: 保存リスト同期（saved_programs）
-- 保存するのは「公開制度の識別子＋表示用メタ」のみ。診断入力・収入・健康などの
-- 機微情報はサーバに保存しない（AGENTS.md のYMYL不変条件 §5 を維持）。

create table if not exists public.saved_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_slug text not null,
  program_title text,
  prefecture_slug text,
  municipality_slug text,
  created_at timestamptz not null default now(),
  unique (user_id, program_slug)
);

create index if not exists saved_programs_user_idx
  on public.saved_programs (user_id);

-- Row Level Security: 本人だけが自分の保存行を参照・追加・削除できる
alter table public.saved_programs enable row level security;

create policy "saved_programs_own_select"
  on public.saved_programs for select
  using (auth.uid() = user_id);

create policy "saved_programs_own_insert"
  on public.saved_programs for insert
  with check (auth.uid() = user_id);

create policy "saved_programs_own_delete"
  on public.saved_programs for delete
  using (auth.uid() = user_id);
