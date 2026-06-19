-- 保存リストをクロス端末で表示するための非機微スナップショット
-- （公開制度の表示用メタ: タイトル・自治体名・概要・バッジ等。機微情報は含めない）
alter table public.saved_programs
  add column if not exists snapshot jsonb;
