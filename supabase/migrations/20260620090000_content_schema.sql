-- Slice A: 制度コンテンツDB（prefectures / municipalities / categories / life_events /
-- support_programs + 関連 / sources / revisions / review_queue / app_roles）
--
-- 設計原典: aster-support-navi-handoff/REVENUE_ROADMAP_TECHNICAL_SPEC.md §7-8、
-- TECHNICAL_ARCHITECTURE.md §4。ドメイン型（app/lib/data/types.ts）と往復できるよう、
-- 自治体の intro / 生活イベントの icon・common_checks を追加している。
--
-- 公開読み取りは anon(publishable) キー + RLS で行う:
--   - support_programs は status='published' のみ select 可。
--   - マスタ（都道府県・自治体・カテゴリ・生活イベント）と中間テーブルは公開 select 可。
--   - sources / revisions / review_queue / app_roles は公開ポリシーを置かない（= 既定で拒否）。
--     管理者の読み書きポリシーは Slice B（admin）で private スキーマの is_admin() と共に追加する。
--   - 書き込みは select ポリシーのみのため anon/authenticated からは不可。
--     初期データ投入・管理は service_role（RLS バイパス）で行う。
--
-- 既存の saved_programs（保存リスト同期）には触れない。

-- ---- 更新時刻トリガ --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- 呼び出し側が updated_at を明示的に変更した場合はその値を尊重し、
  -- そうでなければ now() に更新する。
  -- これにより seed 投入時は seed の updatedAt（制度の実際の更新日）を保持しつつ、
  -- 管理画面（Slice B）からの編集では自動で更新時刻が入る。
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- ---- マスタ ----------------------------------------------------------------
create table if not exists public.prefectures (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_kana text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  common_checks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.municipalities (
  id uuid primary key default gen_random_uuid(),
  prefecture_id uuid not null references public.prefectures (id) on delete cascade,
  slug text not null,
  name text not null,
  name_kana text,
  official_site_url text,
  population integer,
  intro text,
  coverage_status text not null default 'partial',
  -- not_started, partial, verified, stale, hidden
  indexable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prefecture_id, slug)
);
create index if not exists municipalities_prefecture_idx
  on public.municipalities (prefecture_id);

-- ---- 制度 ------------------------------------------------------------------
create table if not exists public.support_programs (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities (id) on delete cascade,
  slug text unique not null,
  title text not null,
  summary text not null,
  plain_language_summary text,
  benefit_type text not null default 'other',
  -- cash, subsidy, reduction, service, consultation, other
  target_people text not null,
  benefit_amount_text text,
  application_deadline_text text,
  -- application_period_start / is_deadline_recurring は仕様書 §7.1 準拠の予約列。
  -- 現行ドメイン型（SupportProgram）には未対応のため投入・読取りしない（常に既定値）。
  -- 構造化期限フィルタを実装する Slice C/B で型・export・read を同時に追加する。
  application_period_start date,
  application_period_end date,
  is_deadline_recurring boolean not null default false,
  application_method_text text not null,
  required_documents_text text,
  online_application_available boolean,
  contact_name text,
  contact_phone text,
  contact_url text,
  official_url text not null,
  official_source_title text,
  last_official_checked_at date not null,
  source_confidence text not null default 'medium',
  -- high, medium, low
  coverage_status text not null default 'partial',
  status text not null default 'draft',
  -- draft, review, published, archived
  uncertain_fields text[] not null default '{}',
  disclaimer_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_programs_municipality_idx
  on public.support_programs (municipality_id);
create index if not exists support_programs_status_idx
  on public.support_programs (status);

create table if not exists public.support_program_categories (
  support_program_id uuid references public.support_programs (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  primary key (support_program_id, category_id)
);

create table if not exists public.support_program_life_events (
  support_program_id uuid references public.support_programs (id) on delete cascade,
  life_event_id uuid references public.life_events (id) on delete cascade,
  primary key (support_program_id, life_event_id)
);

-- ---- 出典・改訂・レビューキュー（運用・Slice B で本格利用） ----------------
create table if not exists public.support_sources (
  id uuid primary key default gen_random_uuid(),
  support_program_id uuid references public.support_programs (id) on delete cascade,
  url text not null,
  title text,
  publisher text,
  retrieved_at timestamptz,
  official_checked_at date,
  content_hash text,
  last_changed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists support_sources_program_idx
  on public.support_sources (support_program_id);

create table if not exists public.support_revisions (
  id uuid primary key default gen_random_uuid(),
  support_program_id uuid references public.support_programs (id) on delete cascade,
  changed_by uuid references auth.users (id),
  change_type text not null default 'update',
  change_summary text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists support_revisions_program_idx
  on public.support_revisions (support_program_id);

create table if not exists public.review_queue_items (
  id uuid primary key default gen_random_uuid(),
  support_program_id uuid references public.support_programs (id) on delete cascade,
  source_id uuid references public.support_sources (id) on delete set null,
  reason text not null,
  priority text not null default 'normal',
  status text not null default 'open',
  assigned_to uuid references auth.users (id),
  due_on date,
  diff_json jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists review_queue_status_idx
  on public.review_queue_items (status);

-- ---- 権限（管理者判定の土台。読み書きポリシーは Slice B） ------------------
create table if not exists public.app_roles (
  user_id uuid references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---- updated_at トリガ ----------------------------------------------------
drop trigger if exists set_prefectures_updated_at on public.prefectures;
create trigger set_prefectures_updated_at before update on public.prefectures
  for each row execute function public.set_updated_at();
drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
drop trigger if exists set_life_events_updated_at on public.life_events;
create trigger set_life_events_updated_at before update on public.life_events
  for each row execute function public.set_updated_at();
drop trigger if exists set_municipalities_updated_at on public.municipalities;
create trigger set_municipalities_updated_at before update on public.municipalities
  for each row execute function public.set_updated_at();
drop trigger if exists set_support_programs_updated_at on public.support_programs;
create trigger set_support_programs_updated_at before update on public.support_programs
  for each row execute function public.set_updated_at();

-- ---- Row Level Security ----------------------------------------------------
alter table public.prefectures enable row level security;
alter table public.categories enable row level security;
alter table public.life_events enable row level security;
alter table public.municipalities enable row level security;
alter table public.support_programs enable row level security;
alter table public.support_program_categories enable row level security;
alter table public.support_program_life_events enable row level security;
alter table public.support_sources enable row level security;
alter table public.support_revisions enable row level security;
alter table public.review_queue_items enable row level security;
alter table public.app_roles enable row level security;

-- マスタ・中間テーブル: 公開 select 可（非機微。制度の表示に必要）。
drop policy if exists prefectures_public_read on public.prefectures;
create policy prefectures_public_read on public.prefectures for select using (true);

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using (true);

drop policy if exists life_events_public_read on public.life_events;
create policy life_events_public_read on public.life_events for select using (true);

drop policy if exists municipalities_public_read on public.municipalities;
create policy municipalities_public_read on public.municipalities for select using (true);

drop policy if exists spc_public_read on public.support_program_categories;
create policy spc_public_read on public.support_program_categories for select using (true);

drop policy if exists sple_public_read on public.support_program_life_events;
create policy sple_public_read on public.support_program_life_events for select using (true);

-- 制度本体: published のみ公開 select 可（不変条件 §3 / 仕様書 §8.1）。
drop policy if exists support_programs_published_read on public.support_programs;
create policy support_programs_published_read on public.support_programs
  for select using (status = 'published');

-- sources / revisions / review_queue / app_roles:
-- 公開ポリシーを置かない（RLS 有効 + ポリシー無し = anon/authenticated は拒否）。
-- 管理者の読み書きは Slice B で private.is_admin()（SECURITY DEFINER を非公開スキーマに）と共に追加する。
