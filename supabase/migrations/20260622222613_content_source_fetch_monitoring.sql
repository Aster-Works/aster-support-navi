-- Content source fetch monitoring
--
-- Automated source checks need their own snapshot metadata. Keep the existing
-- support_sources.content_hash untouched because current seed imports use it as
-- a curated content baseline, not a fetched web-page hash.

alter table public.support_sources
  add column if not exists fetched_content_hash text,
  add column if not exists fetched_content_type text,
  add column if not exists last_fetched_at timestamptz,
  add column if not exists last_fetch_status integer,
  add column if not exists last_fetch_error text,
  add column if not exists last_fetch_changed_at timestamptz;

create index if not exists support_sources_last_fetched_at_idx
  on public.support_sources (last_fetched_at);

create index if not exists support_sources_fetch_due_idx
  on public.support_sources (quality_state, last_fetched_at);

comment on column public.support_sources.fetched_content_hash
  is 'Hash of the latest automated fetch payload. First automated fetch establishes a baseline and does not imply human review.';

comment on column public.support_sources.fetched_content_type
  is 'Content-Type observed during the latest automated source fetch.';

comment on column public.support_sources.last_fetched_at
  is 'Timestamp of the latest automated source fetch attempt.';

comment on column public.support_sources.last_fetch_status
  is 'HTTP status observed during the latest automated source fetch attempt, if available.';

comment on column public.support_sources.last_fetch_error
  is 'Short machine-readable error from the latest automated source fetch attempt.';

comment on column public.support_sources.last_fetch_changed_at
  is 'Timestamp when automated fetching last detected content hash drift after an established baseline.';
