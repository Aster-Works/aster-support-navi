-- Slice E 修正: organization_members の insert ポリシーから自己挿入を外す。
--
-- 旧ポリシー `with check (user_id = auth.uid() or is_org_admin(...))` は、任意の
-- 認証ユーザーが「自分を member として任意の組織へ追加」できてしまう穴があった
-- （→ その組織の相談パックを読めてしまう）。
-- オーナーは create_organization RPC（SECURITY DEFINER で RLS バイパス）が追加するため、
-- 自己挿入クローズは不要。メンバー追加は owner/admin のみに限定する。
drop policy if exists om_insert on public.organization_members;
create policy om_insert on public.organization_members
  for insert to authenticated
  with check (private.is_org_admin(organization_id));
