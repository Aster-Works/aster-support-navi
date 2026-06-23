-- Slice G（収益化）: 相談パックのブランド差込（名前・団体名・ロゴ入りPDF）。
-- 料金プラン Personal/Pro が謳う「個人名入り / 団体名・ロゴ入りPDF」を実体化する。
--
-- 追加はすべて nullable・後方互換。公開ページ（support_programs 等）には無影響。
-- RLS は既存ポリシーで足りる:
--   organizations.logo_url … organizations_admin_update（owner/admin が更新可）。
--   consultation_packets.prepared_by … packets_member_all（組織メンバーが更新可）。
--
-- 方針: ロゴは団体ごとに1度設定して使い回す（organizations）。担当者名は相談ごと（packets）。
-- 機微情報は入れない運用（相談者の氏名・住所・収入・病名は packet に入れない）は不変。

-- 団体ロゴ（印刷PDFのヘッダーに表示する画像URL）。
alter table public.organizations
  add column if not exists logo_url text;

-- 相談パックの担当者名（作成者・面談担当）。氏名は支援者本人の表示名であり相談者の機微情報ではない。
alter table public.consultation_packets
  add column if not exists prepared_by text;
