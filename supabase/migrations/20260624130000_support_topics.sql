-- 自治体独自の細分類「支援テーマ（support_topics）」レイヤーを追加する。
-- 既存の大分類 categories は維持し、テーマを別レイヤーとして制度に関連付ける。
-- あわせて 自治体×テーマの調査カバレッジ台帳（municipality_topic_coverage）を追加する。
--
-- RLS:
--   support_topics / support_program_topics … 公開読取可（anon select。公開UIで使う）+ admin全操作。
--   municipality_topic_coverage … 内部の調査台帳。anon ポリシーを作らない（RLS有効＋ポリシー無し＝拒否）。
--   not_found_on_official_site は「制度が無い」断定ではなく内部の調査状態であり、公開画面には出さない。
-- 慣習: 明示 begin/commit なし（CLIがtxnラップ）。冪等（if not exists / on conflict / drop policy if exists）。

-- 1) 支援テーマ master ------------------------------------------------------
create table if not exists public.support_topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  -- 大分類カテゴリへの親子（粗い分類）。任意。
  parent_category_id uuid references public.categories(id) on delete set null,
  priority int not null default 0,
  sort_order int not null default 0,
  -- テーマ単体での index 可否のヒント（実際の noindex はページ側の条件で最終判定）。
  indexable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_topics_parent_idx on public.support_topics(parent_category_id);

alter table public.support_topics enable row level security;
drop policy if exists support_topics_public_read on public.support_topics;
create policy support_topics_public_read on public.support_topics
  for select using (true);
drop policy if exists support_topics_admin_all on public.support_topics;
create policy support_topics_admin_all on public.support_topics
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop trigger if exists set_support_topics_updated_at on public.support_topics;
create trigger set_support_topics_updated_at before update on public.support_topics
  for each row execute function public.set_updated_at();

-- 2) 制度×テーマ（多対多）---------------------------------------------------
create table if not exists public.support_program_topics (
  support_program_id uuid not null references public.support_programs(id) on delete cascade,
  support_topic_id uuid not null references public.support_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (support_program_id, support_topic_id)
);
create index if not exists support_program_topics_topic_idx on public.support_program_topics(support_topic_id);

alter table public.support_program_topics enable row level security;
drop policy if exists support_program_topics_public_read on public.support_program_topics;
create policy support_program_topics_public_read on public.support_program_topics
  for select using (true);
drop policy if exists support_program_topics_admin_all on public.support_program_topics;
create policy support_program_topics_admin_all on public.support_program_topics
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- 3) 自治体×テーマの調査カバレッジ台帳（内部運用）---------------------------
create table if not exists public.municipality_topic_coverage (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id) on delete cascade,
  support_topic_id uuid not null references public.support_topics(id) on delete cascade,
  -- not_found_on_official_site = 「指定方法で公式を調べたが確認日時点で確認できなかった」内部状態。
  -- 「制度が存在しない」断定ではない。公開画面で安易に「制度なし」と出さない。
  research_status text not null default 'not_started'
    check (research_status in (
      'not_started','researching','found','not_found_on_official_site','needs_review','not_applicable'
    )),
  last_researched_at date,
  official_source_url text,
  evidence_note text,
  research_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, support_topic_id)
);
create index if not exists mtc_topic_idx on public.municipality_topic_coverage(support_topic_id);
create index if not exists mtc_status_idx on public.municipality_topic_coverage(research_status);

alter table public.municipality_topic_coverage enable row level security;
-- 内部台帳: anon 用ポリシーは作らない（= 既定拒否）。admin のみ全操作。
drop policy if exists mtc_admin_all on public.municipality_topic_coverage;
create policy mtc_admin_all on public.municipality_topic_coverage
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop trigger if exists set_mtc_updated_at on public.municipality_topic_coverage;
create trigger set_mtc_updated_at before update on public.municipality_topic_coverage
  for each row execute function public.set_updated_at();

-- 4) 初期テーマ 15件（parent_category は slug 参照・冪等 upsert）-------------
insert into public.support_topics (slug, name, description, parent_category_id, priority, sort_order, indexable)
select v.slug, v.name, v.description, c.id, v.priority, v.sort_order, true
from (values
  ('hearing-aid',             '補聴器購入費助成',       '高齢の方や障害のある方の補聴器購入費を補助する、自治体独自の助成。',                 'nursing-care', 100, 1),
  ('elderly-diapers',         '紙おむつ支給・助成',     '在宅で介護を受ける高齢者などへの紙おむつの支給・購入費助成。',                       'nursing-care', 90,  2),
  ('postpartum-care',         '産後ケア',               '出産後の母子の心身のケア（宿泊・通所・訪問など）を支える事業。',                     'birth',        95,  3),
  ('prenatal-postpartum-helper','産前産後ヘルパー',     '妊娠中・出産後の家事や育児を支援するヘルパーの派遣。',                               'birth',        80,  4),
  ('welfare-taxi',            '福祉タクシー・移動支援', '障害のある方などの外出・通院を支える福祉タクシー券や自動車燃料費の助成。',           'disability',   80,  5),
  ('pregnancy-taxi',          '妊産婦タクシー',         '妊婦健診や出産時の移動を支えるタクシー利用の助成。',                                 'birth',        70,  6),
  ('school-commuting',        '通学費・就学支援',       '通学費・入学祝金・学用品など、就学にかかる自治体独自の支援。',                       'education',    70,  7),
  ('monitoring-meals',        '見守り・配食',           '高齢者などの見守り・配食サービスなど、在宅生活を支える支援。',                       'nursing-care', 75,  8),
  ('emergency-alert',         '緊急通報・見守り機器',   '高齢者などの緊急通報システムや見守り機器の設置を支える支援。',                       'nursing-care', 65,  9),
  ('air-conditioner-energy',  'エアコン・省エネ家電助成','熱中症予防や省エネのためのエアコン・家電の購入費助成。',                             'livelihood',   60,  10),
  ('heating-cost',            '暖房費・灯油助成',       '冬季の暖房費・灯油の購入費を補助する自治体独自の助成。',                             'livelihood',   55,  11),
  ('snow-removal',            '除雪・雪下ろし支援',     '高齢者世帯などの除雪・雪下ろしを支える支援。',                                       'housing',      50,  12),
  ('furniture-safety',        '家具転倒防止・防災',     '家具転倒防止器具の取付や感震ブレーカー設置など、住まいの防災の支援。',               'housing',      50,  13),
  ('bicycle-helmet',          '自転車ヘルメット補助',   '自転車用ヘルメットの購入費補助。',                                                   'childcare',    45,  14),
  ('child-seat',              'チャイルドシート補助',   'チャイルドシートの購入・貸与の支援。',                                               'childcare',    45,  15)
) as v(slug, name, description, cat, priority, sort_order)
left join public.categories c on c.slug = v.cat
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  parent_category_id = excluded.parent_category_id,
  priority = excluded.priority,
  sort_order = excluded.sort_order;
