-- Slice B: 管理者認可 + 管理者RLS + 自動 revision 監査ログ
--
-- - private.is_admin(): app_roles を見て管理者判定する SECURITY DEFINER 関数。
--   非公開スキーマ private に置き、PostgREST に晒さない（仕様書 §8.3）。
-- - 管理者RLS: authenticated かつ is_admin() のとき、制度・出典・改訂・レビューキュー・
--   マスタ・中間テーブルを全ステータス read / write 可能にする（公開の published-only 読みは維持）。
-- - log_support_revision(): support_programs の insert/update を support_revisions へ自動記録。
--   auth.uid() が null（service_role / バルク投入）の変更は記録しない（seed 投入でログが溢れないように）。
--
-- 既存の公開 RLS（support_programs_published_read 等）には触れない。管理者ポリシーは OR で追加される。

-- ---- private schema + is_admin -------------------------------------------
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_roles ar
    where ar.user_id = auth.uid() and ar.role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- ---- 自動 revision 監査ログ ------------------------------------------------
create or replace function public.log_support_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- service_role / バルク投入（auth.uid() null）は記録しない。管理者の手編集のみ監査する。
  if auth.uid() is null then
    return new;
  end if;
  insert into public.support_revisions (
    support_program_id, changed_by, change_type, before_json, after_json
  )
  values (
    new.id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'create' else 'update' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists log_support_programs_revision on public.support_programs;
create trigger log_support_programs_revision
  after insert or update on public.support_programs
  for each row execute function public.log_support_revision();

-- ---- 管理者ポリシー（authenticated かつ is_admin） -------------------------
-- 制度本体: 全ステータス read + 書き込み。
drop policy if exists support_programs_admin_all on public.support_programs;
create policy support_programs_admin_all on public.support_programs
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- 中間テーブル: 管理者は全 read + 書き込み（公開 read は既存ポリシーで維持）。
drop policy if exists spc_admin_all on public.support_program_categories;
create policy spc_admin_all on public.support_program_categories
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists sple_admin_all on public.support_program_life_events;
create policy sple_admin_all on public.support_program_life_events
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- マスタ: 管理者は編集可（公開 read は既存ポリシーで維持）。
drop policy if exists prefectures_admin_all on public.prefectures;
create policy prefectures_admin_all on public.prefectures
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists life_events_admin_all on public.life_events;
create policy life_events_admin_all on public.life_events
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists municipalities_admin_all on public.municipalities;
create policy municipalities_admin_all on public.municipalities
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- 運用テーブル（出典・改訂・レビューキュー）: 管理者のみ read + 書き込み。
drop policy if exists support_sources_admin_all on public.support_sources;
create policy support_sources_admin_all on public.support_sources
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists support_revisions_admin_all on public.support_revisions;
create policy support_revisions_admin_all on public.support_revisions
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists review_queue_admin_all on public.review_queue_items;
create policy review_queue_admin_all on public.review_queue_items
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- app_roles: 本人は自分のロールを read 可（クライアントの admin 判定用）。管理者は全 read + 書き込み。
drop policy if exists app_roles_self_read on public.app_roles;
create policy app_roles_self_read on public.app_roles
  for select to authenticated
  using (user_id = auth.uid() or private.is_admin());
drop policy if exists app_roles_admin_write on public.app_roles;
create policy app_roles_admin_write on public.app_roles
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
