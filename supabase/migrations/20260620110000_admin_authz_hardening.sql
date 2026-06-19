-- Slice B 強化（セキュリティレビュー対応）:
-- 1) 公開品質ゲートを DB レベルで強制（多層防御。クライアント/公開フィルタに加えた最終境界）。
-- 2) app_roles のポリシーから private.is_admin() 参照を外す（理論上の RLS 再帰を完全排除）。
--    管理画面は自分のロールを read するだけ（checkIsAdmin）。ロール付与は service_role 運用。

-- ---- 1) 公開品質ゲート（status='published' の必須項目を強制） --------------
-- isPublishable()（app/lib/data/types.ts）と同じ必須項目: 公式URL・最終確認日・対象者・申請方法/問い合わせ先。
-- これにより、クライアントゲートを迂回しても、必須項目を欠いたまま published にはできない。
create or replace function public.enforce_publish_quality()
returns trigger
language plpgsql
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

drop trigger if exists enforce_publish_quality_trg on public.support_programs;
create trigger enforce_publish_quality_trg
  before insert or update on public.support_programs
  for each row execute function public.enforce_publish_quality();

-- ---- 2) app_roles ポリシーから is_admin() を外す --------------------------
-- 本人は自分のロールのみ read（管理画面の checkIsAdmin 用）。
-- 管理者による他者ロールの read/write は当面 service_role（管理運用）で行う。
drop policy if exists app_roles_self_read on public.app_roles;
drop policy if exists app_roles_admin_write on public.app_roles;
create policy app_roles_self_read on public.app_roles
  for select to authenticated
  using (user_id = auth.uid());
