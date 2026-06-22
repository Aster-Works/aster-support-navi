-- Security advisor hardening:
-- - Fix mutable search_path warnings on trigger functions.
-- - Remove public/API execution grants from trigger-only SECURITY DEFINER functions.
-- - Avoid per-row auth.uid() initplans in simple owner policies.
--
-- Data rows are intentionally untouched.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.enforce_publish_quality()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if coalesce(new.official_url, '') = ''
       or new.last_official_checked_at is null
       or coalesce(new.target_people, '') = ''
       or (
         coalesce(new.application_method_text, '') = ''
         and coalesce(new.contact_name, '') = ''
         and coalesce(new.contact_url, '') = ''
       )
    then
      raise exception '公開には公式URL・最終確認日・対象者・申請方法または問い合わせ先が必要です';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_packet_invariants()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.organization_id := old.organization_id;
  end if;
  return new;
end;
$$;

-- Trigger-only functions should not be callable through PostgREST RPC.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_publish_quality() from public, anon, authenticated;
revoke all on function public.enforce_packet_invariants() from public, anon, authenticated;
revoke all on function public.log_support_revision() from public, anon, authenticated;

-- bootstrap_admin_grant exists on production as a legacy/bootstrap SECURITY DEFINER
-- helper, but is not part of the reproducible local migration chain. Revoke it only
-- when present so local resets do not fail.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'bootstrap_admin_grant'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke all on function public.bootstrap_admin_grant() from public, anon, authenticated';
  end if;
end;
$$;

-- RLS performance advisor: wrap auth.uid() in a scalar subselect so it is
-- initialized once per statement instead of once per row.
drop policy if exists "saved_programs_own_select" on public.saved_programs;
create policy "saved_programs_own_select"
  on public.saved_programs for select
  using ((select auth.uid()) = user_id);

drop policy if exists "saved_programs_own_insert" on public.saved_programs;
create policy "saved_programs_own_insert"
  on public.saved_programs for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "saved_programs_own_delete" on public.saved_programs;
create policy "saved_programs_own_delete"
  on public.saved_programs for delete
  using ((select auth.uid()) = user_id);

drop policy if exists app_roles_self_read on public.app_roles;
create policy app_roles_self_read on public.app_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists reminders_own_select on public.reminders;
create policy reminders_own_select on public.reminders
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists reminders_own_insert on public.reminders;
create policy reminders_own_insert on public.reminders
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists reminders_own_update on public.reminders;
create policy reminders_own_update on public.reminders
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists reminders_own_delete on public.reminders;
create policy reminders_own_delete on public.reminders
  for delete to authenticated
  using ((select auth.uid()) = user_id);
