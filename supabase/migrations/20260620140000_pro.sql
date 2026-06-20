-- Slice E: Pro（相談支援現場向け）。組織・メンバー・相談パック。
-- 仕様: REVENUE_ROADMAP_TECHNICAL_SPEC.md §7.4, §8.3, §11。
--
-- 方針: 一般利用者ではなく「支援する人」の業務ツール。相談パックには相談者の
-- 個人情報（氏名・詳細住所・収入・病名等）を入れない運用（UI 文言で明示）。
-- 課金（Stripe）は Slice F。ベータ中は組織メンバーに Pro 機能を開放（plan='free' 既定）。
--
-- RLS の所属判定は private スキーマの SECURITY DEFINER 関数で行う
-- （organization_members 自己参照ポリシーの再帰を避けるため・PostgREST 非公開）。

-- ---- テーブル（関数より先に作る：language sql 関数は作成時に本文を検証するため）----
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text not null default 'support_group',
  -- support_group, church, npo, professional, school, company, municipality_related
  plan text not null default 'free',
  -- free, solo, team, plus, enterprise
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  -- owner, admin, member, viewer
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists org_members_user_idx
  on public.organization_members (user_id);

create table if not exists public.consultation_packets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  title text not null,
  prefecture_slug text,
  municipality_slug text,
  selected_program_slugs text[] not null default '{}',
  -- notes は非機微運用。相談者氏名・詳細収入・医療情報は入れない（UI 文言で明示）。
  notes text,
  status text not null default 'draft',
  -- draft, ready, shared
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists packets_org_idx
  on public.consultation_packets (organization_id);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
drop trigger if exists set_packets_updated_at on public.consultation_packets;
create trigger set_packets_updated_at before update on public.consultation_packets
  for each row execute function public.set_updated_at();

-- ---- private 所属判定関数 -------------------------------------------------
create or replace function private.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;
revoke all on function private.is_org_member(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;

create or replace function private.is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;
revoke all on function private.is_org_admin(uuid) from public, anon;
grant execute on function private.is_org_admin(uuid) to authenticated;

-- ---- 組織作成 RPC（組織 + owner メンバーを原子的に作る） ------------------
create or replace function public.create_organization(
  p_name text,
  p_type text default 'support_group'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name required';
  end if;
  insert into public.organizations (name, organization_type)
    values (trim(p_name), coalesce(nullif(trim(p_type), ''), 'support_group'))
    returning id into new_id;
  insert into public.organization_members (organization_id, user_id, role)
    values (new_id, auth.uid(), 'owner');
  return new_id;
end;
$$;
revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

-- ---- RLS -------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.consultation_packets enable row level security;

-- organizations: メンバーは read。owner/admin は更新可。作成は RPC 経由（直接 insert 不可）。
drop policy if exists organizations_member_read on public.organizations;
create policy organizations_member_read on public.organizations
  for select to authenticated using (private.is_org_member(id));
drop policy if exists organizations_admin_update on public.organizations;
create policy organizations_admin_update on public.organizations
  for update to authenticated
  using (private.is_org_admin(id)) with check (private.is_org_admin(id));

-- organization_members: メンバーは同組織のメンバーを read。本人は自分を追加可（RPC）、
-- owner/admin は他メンバーを追加・更新・削除可。
drop policy if exists om_member_read on public.organization_members;
create policy om_member_read on public.organization_members
  for select to authenticated using (private.is_org_member(organization_id));
drop policy if exists om_insert on public.organization_members;
create policy om_insert on public.organization_members
  for insert to authenticated
  with check (user_id = auth.uid() or private.is_org_admin(organization_id));
drop policy if exists om_admin_modify on public.organization_members;
create policy om_admin_modify on public.organization_members
  for update to authenticated
  using (private.is_org_admin(organization_id))
  with check (private.is_org_admin(organization_id));
drop policy if exists om_admin_delete on public.organization_members;
create policy om_admin_delete on public.organization_members
  for delete to authenticated using (private.is_org_admin(organization_id));

-- consultation_packets: 組織メンバーは read/write。
drop policy if exists packets_member_all on public.consultation_packets;
create policy packets_member_all on public.consultation_packets
  for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));
