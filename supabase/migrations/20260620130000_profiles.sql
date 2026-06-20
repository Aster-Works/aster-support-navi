-- Slice D: profiles（メール登録／任意のホーム自治体メモ）。
-- リテンションの「メール登録」母集団。実際の配信（期限リマインド等）は Resend 等の
-- 送信基盤を用意してから別途実装する。ここでは opt-in の意思だけを最小項目で保持する。
-- 機微情報（収入・健康・診断回答など）は保存しない（YMYL）。

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  home_prefecture_slug text,
  home_municipality_slug text,
  email_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 本人のみ自分の行を read/write できる。
drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
