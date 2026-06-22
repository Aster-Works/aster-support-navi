-- Slice F: コンテンツ品質ゲート運用 + 出典/revision/review queue 移行補助
--
-- 目的:
-- - 既存の support_programs / support_sources / support_revisions / review_queue_items を
--   作り直さず、品質検出と移行投入に必要な列・関数だけを追加する。
-- - public schema の公開 RLS は維持する。private 関数は service_role / SQL 運用用で、
--   anon/authenticated からは直接実行させない。
-- - 既存データは delete しない。review queue は open の同一 issue を更新し、重複投入を抑える。

create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ---- 出典メタデータ --------------------------------------------------------
alter table public.support_sources
  add column if not exists source_kind text not null default 'official',
  add column if not exists quality_state text not null default 'unchecked',
  add column if not exists detected_issue_codes text[] not null default '{}',
  add column if not exists review_interval_days integer not null default 90;

create index if not exists support_sources_url_idx
  on public.support_sources (url);
create index if not exists support_sources_quality_state_idx
  on public.support_sources (quality_state);

-- ---- revision の冪等投入キー ---------------------------------------------
alter table public.support_revisions
  add column if not exists external_key text;

create unique index if not exists support_revisions_external_key_uniq
  on public.support_revisions (external_key)
  where external_key is not null;

-- ---- review queue の品質issue識別 ----------------------------------------
alter table public.review_queue_items
  add column if not exists issue_code text,
  add column if not exists severity text not null default 'warning',
  add column if not exists detected_by text not null default 'manual',
  add column if not exists source_last_checked_at date;

create index if not exists review_queue_program_idx
  on public.review_queue_items (support_program_id);
create index if not exists review_queue_issue_code_idx
  on public.review_queue_items (issue_code);

create unique index if not exists review_queue_open_program_issue_uniq
  on public.review_queue_items (support_program_id, issue_code)
  where status = 'open'
    and support_program_id is not null
    and issue_code is not null;

-- ---- 公式っぽい出典URLのDB側判定 -----------------------------------------
create or replace function private.is_officialish_source_url(p_url text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  host text;
begin
  if p_url is null or btrim(p_url) = '' then
    return false;
  end if;

  host := lower(coalesce(substring(p_url from '^https?://([^/?#]+)'), ''));
  host := regexp_replace(host, ':\d+$', '');

  return host = any (array[
      'csw-kawasaki.or.jp',
      'www.with-kobe.or.jp',
      'www.kumamoto-city-csw.or.jp',
      'www.heartful-volunteer.net',
      'www.himeji-wel.or.jp',
      'www.dondon-net.or.jp',
      'www.matsuyama-wel.jp'
    ])
    or host like '%.lg.jp'
    or host like '%.go.jp'
    or host like '%.tokyo.jp'
    or position('shakyo' in host) > 0
    or position('syakyo' in host) > 0
    or position('cosw' in host) > 0
    or host like 'city.%'
    or host like '%.city.%';
end;
$$;

revoke all on function private.is_officialish_source_url(text)
  from public, anon, authenticated;

-- ---- review queue への冪等enqueue ----------------------------------------
create or replace function private.enqueue_review_queue_item(
  p_support_program_id uuid,
  p_source_id uuid,
  p_issue_code text,
  p_reason text,
  p_priority text default 'normal',
  p_due_on date default null,
  p_diff_json jsonb default '{}'::jsonb,
  p_severity text default 'warning',
  p_detected_by text default 'quality_gate',
  p_source_last_checked_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.review_queue_items
  set
    source_id = coalesce(p_source_id, source_id),
    reason = p_reason,
    priority = coalesce(nullif(p_priority, ''), 'normal'),
    due_on = p_due_on,
    diff_json = coalesce(p_diff_json, '{}'::jsonb),
    severity = coalesce(nullif(p_severity, ''), 'warning'),
    detected_by = coalesce(nullif(p_detected_by, ''), 'quality_gate'),
    source_last_checked_at = p_source_last_checked_at
  where support_program_id = p_support_program_id
    and issue_code = p_issue_code
    and status = 'open'
  returning id into v_id;

  if v_id is null then
    insert into public.review_queue_items (
      support_program_id,
      source_id,
      issue_code,
      reason,
      priority,
      status,
      due_on,
      diff_json,
      severity,
      detected_by,
      source_last_checked_at
    )
    values (
      p_support_program_id,
      p_source_id,
      p_issue_code,
      p_reason,
      coalesce(nullif(p_priority, ''), 'normal'),
      'open',
      p_due_on,
      coalesce(p_diff_json, '{}'::jsonb),
      coalesce(nullif(p_severity, ''), 'warning'),
      coalesce(nullif(p_detected_by, ''), 'quality_gate'),
      p_source_last_checked_at
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function private.enqueue_review_queue_item(
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  jsonb,
  text,
  text,
  date
) from public, anon, authenticated;

-- ---- DB内データの品質issueを review_queue へ投入 -------------------------
create or replace function private.refresh_content_quality_queue(
  p_today date default current_date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  queued integer := 0;
  age_days integer;
begin
  for r in
    select
      sp.id,
      sp.slug,
      sp.title,
      sp.status,
      sp.official_url,
      sp.official_source_title,
      sp.last_official_checked_at,
      sp.source_confidence,
      ss.id as source_id
    from public.support_programs sp
    left join lateral (
      select s.id
      from public.support_sources s
      where s.support_program_id = sp.id
        and s.url = sp.official_url
      order by s.created_at desc
      limit 1
    ) ss on true
    where sp.status <> 'archived'
  loop
    if coalesce(btrim(r.official_url), '') = '' then
      perform private.enqueue_review_queue_item(
        r.id,
        r.source_id,
        'missing_official_url',
        '公式URLが未登録です',
        'high',
        p_today,
        jsonb_build_object('slug', r.slug, 'title', r.title),
        'blocker',
        'quality_gate',
        r.last_official_checked_at
      );
      queued := queued + 1;
    else
      if r.official_url !~ '^https://' then
        perform private.enqueue_review_queue_item(
          r.id,
          r.source_id,
          'non_https_official_url',
          '公式URLがHTTPSではありません',
          'high',
          p_today,
          jsonb_build_object('slug', r.slug, 'officialUrl', r.official_url),
          'blocker',
          'quality_gate',
          r.last_official_checked_at
        );
        queued := queued + 1;
      end if;

      if not private.is_officialish_source_url(r.official_url) then
        perform private.enqueue_review_queue_item(
          r.id,
          r.source_id,
          'unofficial_source_host',
          '公式・公的ソースと確認できないホストです',
          'high',
          p_today,
          jsonb_build_object('slug', r.slug, 'officialUrl', r.official_url),
          'blocker',
          'quality_gate',
          r.last_official_checked_at
        );
        queued := queued + 1;
      end if;
    end if;

    if r.last_official_checked_at is null then
      perform private.enqueue_review_queue_item(
        r.id,
        r.source_id,
        'missing_last_official_checked_at',
        '最終確認日が未登録です',
        'high',
        p_today,
        jsonb_build_object('slug', r.slug),
        'blocker',
        'quality_gate',
        null
      );
      queued := queued + 1;
    else
      age_days := p_today - r.last_official_checked_at;
      if age_days > 90 then
        perform private.enqueue_review_queue_item(
          r.id,
          r.source_id,
          'stale_official_check',
          '最終確認から91日以上経過しています',
          'normal',
          p_today + 14,
          jsonb_build_object('slug', r.slug, 'daysSinceLastCheck', age_days),
          'warning',
          'quality_gate',
          r.last_official_checked_at
        );
        queued := queued + 1;
      end if;
    end if;

    if r.source_confidence = 'low' then
      perform private.enqueue_review_queue_item(
        r.id,
        r.source_id,
        'low_source_confidence',
        '出典信頼度が low のため再確認が必要です',
        'normal',
        p_today + 7,
        jsonb_build_object('slug', r.slug, 'sourceConfidence', r.source_confidence),
        'warning',
        'quality_gate',
        r.last_official_checked_at
      );
      queued := queued + 1;
    end if;

    if coalesce(btrim(r.official_source_title), '') = '' then
      perform private.enqueue_review_queue_item(
        r.id,
        r.source_id,
        'missing_official_source_title',
        '出典ページタイトルが未登録です',
        'low',
        p_today + 30,
        jsonb_build_object('slug', r.slug),
        'info',
        'quality_gate',
        r.last_official_checked_at
      );
      queued := queued + 1;
    end if;

    if r.status in ('draft', 'review') then
      perform private.enqueue_review_queue_item(
        r.id,
        r.source_id,
        'unpublished_needs_review',
        case
          when r.status = 'draft' then '下書きのため公開前レビューが必要です'
          else 'レビュー中です'
        end,
        'low',
        p_today + 30,
        jsonb_build_object('slug', r.slug, 'status', r.status),
        'info',
        'quality_gate',
        r.last_official_checked_at
      );
      queued := queued + 1;
    end if;
  end loop;

  return queued;
end;
$$;

revoke all on function private.refresh_content_quality_queue(date)
  from public, anon, authenticated;

comment on function private.refresh_content_quality_queue(date)
  is 'support_programs の品質issueを review_queue_items へ冪等投入する運用SQL用関数。Data API には公開しない。';
