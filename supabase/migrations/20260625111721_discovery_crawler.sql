-- Slice G: 発見クローラ（Discovery Crawler）
--
-- 目的:
--   自治体公式サイトを日次で巡回し、Zaim/母子モ/各種レジストリ/公式APIに綺麗に入っていない
--   「自治体独自の細かい支援」（紙おむつ支給・補聴器助成・配食・産後ケア・就学援助 等）を
--   発見・更新管理する。変更があったページだけ AI で構造化抽出し、候補としてレビューキューに積む。
--   公開 support_programs へは管理者の承認後にのみ反映する（本番直書き禁止）。
--
-- 既存資産との関係（破壊しない）:
--   - support_sources + review_queue_items + /api/cron/check-sources は「既知の公式URLの本文ドリフト
--     監視」。これはそのまま残す。本スライスは「未知ページの発見＋AI抽出＋候補レビュー」を上に重ねる。
--   - 公開テーブル support_programs は承認時の反映先として再利用する（列名の写像は承認処理側で行う）。
--   - 改訂履歴は新テーブルを作らず既存 support_revisions に candidate_id/diff_summary/source_url を
--     追記して再利用する（同一エンティティの改訂台帳を二重化しない）。
--
-- 認可:
--   新テーブルは公開ポリシーを置かない（RLS 有効 + ポリシー無し = anon/authenticated 既定拒否）。
--   管理者のみ private.is_admin() で全 read/write。クロール本体は service_role（RLSバイパス）で書く。

-- ---- 0) 既存 support_revisions の追記（additive・非破壊） --------------------
alter table public.support_revisions
  add column if not exists candidate_id uuid,
  add column if not exists diff_summary text,
  add column if not exists source_url text;

-- ---- 1) クローラのON/OFF設定（key/value） ----------------------------------
create table if not exists public.crawler_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

comment on table public.crawler_settings is
  '発見クローラの全体設定（key/value）。crawler_enabled=false なら cron は即終了する。';

-- ---- 2) クロール対象（自治体・公的サイト単位） ------------------------------
create table if not exists public.crawler_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  municipality_name text,
  municipality_code text,
  prefecture text,
  -- 既存マスタへの任意バインド。設定すると承認時に自治体解決を決定化できる。
  municipality_id uuid references public.municipalities (id) on delete set null,
  source_type text not null default 'html'
    check (source_type in ('html', 'sitemap', 'pdf', 'csv', 'excel', 'manual')),
  base_url text not null,
  allowed_domains text[] not null default '{}',
  seed_urls text[] not null default '{}',
  include_patterns text[] not null default '{}',
  exclude_patterns text[] not null default '{}',
  category_hints text[] not null default '{}',
  crawl_frequency text not null default 'daily',
  is_active boolean not null default true,
  -- Admin制御・自動停止
  paused_reason text,
  paused_by uuid references auth.users (id),
  paused_at timestamptz,
  consecutive_error_count integer not null default 0,
  -- 実行メタ
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists crawler_sources_base_url_uidx
  on public.crawler_sources (base_url);
create index if not exists crawler_sources_active_idx
  on public.crawler_sources (is_active, last_checked_at);
create index if not exists crawler_sources_municipality_idx
  on public.crawler_sources (municipality_id);

comment on table public.crawler_sources is
  'クロール対象（自治体公式サイト）。is_active=false / paused_reason 設定でそのsourceはクロールしない。';

-- ---- 3) 取得した生ドキュメント（差分検知の土台） ----------------------------
create table if not exists public.crawled_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.crawler_sources (id) on delete cascade,
  url text not null,
  canonical_url text,
  title text,
  content_type text,
  status_code integer,
  etag text,
  last_modified text,
  content_hash text,
  normalized_text text,
  raw_html_storage_path text,
  fetched_at timestamptz,
  changed_at timestamptz,
  is_changed boolean not null default false,
  crawl_status text not null default 'pending'
    check (crawl_status in (
      'pending', 'fetched', 'unchanged', 'changed',
      'error', 'skipped', 'blocked', 'not_found'
    )),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, url)
);
create index if not exists crawled_documents_source_idx
  on public.crawled_documents (source_id);
create index if not exists crawled_documents_hash_idx
  on public.crawled_documents (content_hash);
create index if not exists crawled_documents_changed_idx
  on public.crawled_documents (is_changed, changed_at);

comment on table public.crawled_documents is
  '取得ページの生データ・正規化本文・ハッシュ。変更検知はここの content_hash / etag / last_modified で行う。';

-- ---- 4) AI抽出された支援制度候補（公開前のレビュー対象） --------------------
create table if not exists public.support_program_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.crawler_sources (id) on delete set null,
  document_id uuid references public.crawled_documents (id) on delete set null,
  candidate_status text not null default 'pending'
    check (candidate_status in ('pending', 'approved', 'rejected', 'needs_more_info')),
  change_type text not null default 'new'
    check (change_type in ('new', 'updated', 'unchanged', 'possibly_removed')),
  municipality_name text,
  municipality_code text,
  prefecture text,
  municipality_id uuid references public.municipalities (id) on delete set null,
  category text,
  title text not null,
  summary text,
  target_people text,
  eligibility_conditions text,
  benefit_detail text,
  amount text,
  application_method text,
  required_documents text,
  deadline text,
  contact_department text,
  contact_phone text,
  contact_url text,
  official_url text,
  source_quote text,
  extraction_confidence numeric,
  risk_flags text[] not null default '{}',
  diff_summary text,
  -- updated/possibly_removed のとき、対応する公開制度
  old_program_id uuid references public.support_programs (id) on delete set null,
  -- 抽出時の本文ハッシュ（同一内容の再candidate化を避ける）
  content_hash text,
  reviewer_notes text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists spc_status_idx
  on public.support_program_candidates (candidate_status, created_at);
create index if not exists spc_source_idx
  on public.support_program_candidates (source_id);
create index if not exists spc_change_type_idx
  on public.support_program_candidates (change_type);
-- 同一ドキュメント・同一制度名の pending 候補を二重に作らない（冪等性）。
create unique index if not exists spc_pending_uidx
  on public.support_program_candidates (document_id, title)
  where candidate_status = 'pending';

comment on table public.support_program_candidates is
  'AIが抽出した支援制度候補。pending→approved/rejected/needs_more_info。承認で初めて support_programs へ反映。';

-- ---- 5) クロール実行ログ ---------------------------------------------------
create table if not exists public.crawler_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'failed', 'skipped')),
  trigger text not null default 'cron'
    check (trigger in ('cron', 'manual')),
  triggered_by uuid references auth.users (id),
  skip_reason text,
  total_sources integer not null default 0,
  total_urls_checked integer not null default 0,
  total_changed_documents integer not null default 0,
  total_candidates_created integer not null default 0,
  total_errors integer not null default 0,
  error_summary jsonb,
  created_at timestamptz not null default now()
);
create index if not exists crawler_runs_started_idx
  on public.crawler_runs (started_at desc);

comment on table public.crawler_runs is
  'クロール実行ログ。skip_reason に admin_disabled / no_active_sources などを残す。';

-- ---- 6) updated_at トリガ --------------------------------------------------
drop trigger if exists set_crawler_settings_updated_at on public.crawler_settings;
create trigger set_crawler_settings_updated_at before update on public.crawler_settings
  for each row execute function public.set_updated_at();
drop trigger if exists set_crawler_sources_updated_at on public.crawler_sources;
create trigger set_crawler_sources_updated_at before update on public.crawler_sources
  for each row execute function public.set_updated_at();
drop trigger if exists set_crawled_documents_updated_at on public.crawled_documents;
create trigger set_crawled_documents_updated_at before update on public.crawled_documents
  for each row execute function public.set_updated_at();
drop trigger if exists set_spc_updated_at on public.support_program_candidates;
create trigger set_spc_updated_at before update on public.support_program_candidates
  for each row execute function public.set_updated_at();

-- ---- 7) Row Level Security（公開ポリシー無し・管理者のみ） ------------------
alter table public.crawler_settings enable row level security;
alter table public.crawler_sources enable row level security;
alter table public.crawled_documents enable row level security;
alter table public.support_program_candidates enable row level security;
alter table public.crawler_runs enable row level security;

drop policy if exists crawler_settings_admin_all on public.crawler_settings;
create policy crawler_settings_admin_all on public.crawler_settings
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists crawler_sources_admin_all on public.crawler_sources;
create policy crawler_sources_admin_all on public.crawler_sources
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists crawled_documents_admin_all on public.crawled_documents;
create policy crawled_documents_admin_all on public.crawled_documents
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists spc_admin_all on public.support_program_candidates;
create policy spc_admin_all on public.support_program_candidates
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists crawler_runs_admin_all on public.crawler_runs;
create policy crawler_runs_admin_all on public.crawler_runs
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ---- 8) 既定設定の投入 -----------------------------------------------------
-- crawler_enabled は安全側の false で開始（Admin が UI で有効化するまで cron は即終了）。
insert into public.crawler_settings (key, value) values
  ('crawler_enabled', 'false'::jsonb),
  ('ai_extraction_enabled', 'true'::jsonb),
  ('max_sources_per_run', '5'::jsonb),
  ('max_urls_per_source', '40'::jsonb),
  ('max_depth', '2'::jsonb),
  ('domain_min_interval_ms', '2000'::jsonb),
  ('auto_pause_error_threshold', '3'::jsonb)
on conflict (key) do nothing;

-- ---- 9) 初期 seed source（東京・神奈川の数自治体／実在ホスト） --------------
-- 実在が確実な公式ホストのみ。municipality_id は既存マスタがあれば解決（無ければ NULL）。
-- crawler_enabled=false のため、これらは Admin が有効化するまでクロールされない。
insert into public.crawler_sources
  (name, municipality_name, prefecture, source_type, base_url, allowed_domains,
   seed_urls, include_patterns, exclude_patterns, category_hints, municipality_id)
select s.name, s.municipality_name, s.prefecture, 'html', s.base_url,
       s.allowed_domains, s.seed_urls, s.include_patterns, s.exclude_patterns,
       s.category_hints,
       (select m.id from public.municipalities m
          join public.prefectures p on p.id = m.prefecture_id
         where m.name = s.municipality_name and p.name = s.prefecture
         limit 1)
from (
  values
    ('世田谷区 公式サイト', '世田谷区', '東京都',
     'https://www.city.setagaya.lg.jp/',
     array['www.city.setagaya.lg.jp']::text[],
     array['https://www.city.setagaya.lg.jp/kosodate/index.html',
           'https://www.city.setagaya.lg.jp/fukushi/index.html']::text[],
     array['/kosodate/', '/fukushi/', '/kenko/']::text[],
     array['/event/', '/news/', '.pdf', '?', '/sitemap']::text[],
     array['childcare', 'elderly', 'welfare', 'livelihood']::text[]),
    ('渋谷区 公式サイト', '渋谷区', '東京都',
     'https://www.city.shibuya.tokyo.jp/',
     array['www.city.shibuya.tokyo.jp']::text[],
     array['https://www.city.shibuya.tokyo.jp/kodomo/',
           'https://www.city.shibuya.tokyo.jp/kenko/']::text[],
     array['/kodomo/', '/kenko/', '/fukushi/']::text[],
     array['/event/', '/news/', '.pdf', '?']::text[],
     array['childcare', 'elderly', 'welfare']::text[]),
    ('港区 公式サイト', '港区', '東京都',
     'https://www.city.minato.tokyo.jp/',
     array['www.city.minato.tokyo.jp']::text[],
     array['https://www.city.minato.tokyo.jp/kodomo/',
           'https://www.city.minato.tokyo.jp/kenkou/']::text[],
     array['/kodomo/', '/kenkou/', '/fukushi/']::text[],
     array['/event/', '/news/', '.pdf', '?']::text[],
     array['childcare', 'elderly', 'welfare']::text[]),
    ('杉並区 公式サイト', '杉並区', '東京都',
     'https://www.city.suginami.tokyo.jp/',
     array['www.city.suginami.tokyo.jp']::text[],
     array['https://www.city.suginami.tokyo.jp/kosodate/',
           'https://www.city.suginami.tokyo.jp/fukushi/']::text[],
     array['/kosodate/', '/fukushi/', '/koureisya/']::text[],
     array['/event/', '/news/', '.pdf', '?']::text[],
     array['childcare', 'elderly', 'welfare', 'livelihood']::text[]),
    ('横浜市 公式サイト', '横浜市', '神奈川県',
     'https://www.city.yokohama.lg.jp/',
     array['www.city.yokohama.lg.jp']::text[],
     array['https://www.city.yokohama.lg.jp/kurashi/kosodate-kyoiku/',
           'https://www.city.yokohama.lg.jp/kurashi/fukushi-kaigo/']::text[],
     array['/kurashi/kosodate-kyoiku/', '/kurashi/fukushi-kaigo/']::text[],
     array['/event/', '/news/', '.pdf', '?']::text[],
     array['childcare', 'elderly', 'welfare']::text[]),
    ('川崎市 公式サイト', '川崎市', '神奈川県',
     'https://www.city.kawasaki.jp/',
     array['www.city.kawasaki.jp']::text[],
     array['https://www.city.kawasaki.jp/kosodate/',
           'https://www.city.kawasaki.jp/fukushi/']::text[],
     array['/kosodate/', '/fukushi/', '/kenko/']::text[],
     array['/event/', '/news/', '.pdf', '?']::text[],
     array['childcare', 'elderly', 'welfare']::text[])
) as s(name, municipality_name, prefecture, base_url, allowed_domains,
       seed_urls, include_patterns, exclude_patterns, category_hints)
on conflict (base_url) do nothing;
