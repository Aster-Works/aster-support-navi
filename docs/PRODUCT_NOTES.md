# Aster Support Navi — 実装ノート

作成: 2026-06-18 / 最終更新: 2026-06-22 / ステータス: Phase 1–2 + Slice A–F 実装完了。Phase 4（コンテンツ拡充）進行中。

引き継ぎ仕様の原典は `/Users/james/aster-support-navi-handoff/`（PRODUCT_SPEC / TECHNICAL_ARCHITECTURE / DATA_AND_CONTENT_OPS / ROADMAP / RESEARCH_AND_POSITIONING）。本ノートは実装の地図。

## 何を作ったか

「支援制度版SUUMO」。自治体の個人・世帯向け支援制度を、住所×生活状況から探し、申請準備まで伴走する SEO-first Web Product。MVP は **東京23区 × 出産/子育て**、検証済み 161 制度（各区7制度・公式URLをWorkflowでWebFetch検証）。

## アーキテクチャ

- Next.js 16 App Router / React 19 / Tailwind v4 / TypeScript。npm、dev/start ポート 3040。
- データは `app/lib/data`（データアクセス層）経由でのみ読む。**Slice A 以降、実体の読み取りは
  `SupportRepository`（seed / supabase / hybrid）が担う**。`DATA_SOURCE` を切り替えても、この層の
  公開 API（= ページ・コンポーネントの呼び出し側）は完全に不変。
- 純関数は `app/lib`（`eligibility` 診断マッチ / `dates` 期限 / `slug` / `copy` 文言ガード / `checklist`）。すべて Vitest 網羅。

### Slice A: データ基盤の堅牢化（2026-06-20 実装・公開挙動は seed 既定で不変）

- `app/lib/data/repository.ts` … `SupportRepository` interface・`resolveDataSource()`・`getRepository()`。
- `app/lib/data/seedRepository.ts` … 既定。型付き seed を読む（published は module scope で一度評価）。
- `app/lib/data/supabaseRepository.ts` … Supabase 制度DB（published のみ）を読む `supabaseRepository` と、
  DB 優先＋seed 補完の `hybridRepository`。接続失敗・env 未設定時は seed へグレースフルフォールバック。
  `mapProgram` / `unionBySlug` / `unionMunicipalities` は純関数として Vitest 網羅。
- `app/lib/supabase-server.ts` … サーバー専用クライアント（遅延生成・anon 読取・service_role 不使用）。
- `supabase/migrations/20260620090000_content_schema.sql` … 制度DB全テーブル＋RLS
  （support_programs は published のみ公開 select。sources/revisions/review_queue/app_roles は拒否＝Slice B で管理者ポリシー追加）。
- `scripts/export-seed-to-sql.ts` … seed→冪等 SQL を生成（`npx tsx`、DB へは書かない）。出力は gitignore。
- 移行手順: ① migration 適用 → ② 生成 SQL を service_role で投入 → ③ `DATA_SOURCE=hybrid` で検証 → ④ `supabase`。
- 検証: typecheck / Vitest 74件 / lint / build すべて green。多面的レビュー（parity・往復整合・RLS・RSC境界・SQL）＋敵対的検証済み。
- 本番Supabase（ref atdhkmniczfxowfkzwjr）へ migration 適用＋829制度投入済（`supabase db push` ＋ `supabase db query --linked --file` チャンク投入）。

### Slice B: 管理画面・運用基盤（2026-06-20 実装・本番Supabase適用済）

- DB（`20260620100000_admin_authz.sql` ＋ 強化 `20260620110000_admin_authz_hardening.sql`）:
  `private.is_admin()`（SECURITY DEFINER・非公開スキーマ）／管理者RLS（authenticated かつ is_admin で
  全ステータス read/write。公開の published-only 読みは維持）／`log_support_revision()`（編集を自動監査。
  auth.uid() null=service_role/バルク投入はスキップ）／`enforce_publish_quality()`（公開品質ゲートを
  DB レベルで強制＝必須項目を欠いたまま published にできない）。app_roles は self-read のみ。
- UI（`app/admin/*`・`app/lib/admin/client.ts`）: ブラウザ anon クライアント＋管理者RLSのみ（service_role 不使用）。
  AdminGate（ログイン）/ ダッシュボード / 制度一覧（status filter・品質フラグ）/ 編集（18項目＋
  draft→review→published→archived＋品質ゲート enforcement）/ 品質（未達・stale）/ レビューキュー。`/admin` は noindex + robots disallow。
- 認可の最終境界は DB の RLS。AdminGate はUX用。多層防御＝①クライアント品質ゲート ②DBトリガ強制 ③公開側 isPublishable 再フィルタ。
- 検証: 実認証 admin JWT で end-to-end（非admin→draft不可視 / admin→draft可視・編集・revision記録 / incomplete publish 拒否 / valid publish 成功）。匿名 gate・admin walkthrough をブラウザ実地検証。build 1251 / Vitest 74 green。セキュリティレビュー（RLS認可・client安全性・監査・整合性 ×敵対的検証）対応済。
- 残: source 管理 UI・差分検知の自動巡回・最初の本番 admin 付与（Jimi のログインユーザーを app_roles に登録）。

### Slice F: 品質ゲート・出典/revision/review queue 移行開始（2026-06-22 実装・DB適用は未実行）

- `app/lib/data/quality.ts` … 低品質/古い/公式URL不明/非公式ホスト/低信頼度/下書きレビュー対象を共通判定。
  `blocksPublish` と `shouldQueue` を分け、古い確認日は即公開停止ではなく review queue 対象にする。
- 管理画面: `qualityIssues()` を共通品質ゲートへ接続。`/admin/quality` は全ステータスを検出対象に拡大。
  CSV取込も同じゲートを使い、非HTTPS・非公式ホスト・未来日などを検証段階で弾く。
- `supabase/migrations/20260622120048_content_quality_ops.sql` … 既存テーブルを破壊せず、
  `support_sources` の品質メタ、`support_revisions.external_key`、`review_queue_items.issue_code/severity/detected_by` を追加。
  `private.refresh_content_quality_queue()` は private schema の運用SQL用で、Data API には公開しない。
- `scripts/export-seed-to-sql.ts` … seed の全 status を Supabase へ載せられるように拡張。
  制度本体、公式出典、seed baseline revision、review queue 候補を冪等SQLとして生成する。DBへは書かない。
- `scripts/audit-content-quality.ts` / `npm run data:audit` … seedの読み取り専用監査。2026-06-22時点:
  1372制度（published 1364 / draft 8）、品質issueあり11、公開ブロッカー6、review queue候補11。

### 政令市データ拡充 — 4カテゴリ深掘り（Phase 4・2026-06-21）

20政令市はそれまで出産・子育てのみだった。**法令で全市に必ず存在する制度**だけに絞り、ひとり親 / 生活困窮 / 介護 / 障害の4カテゴリへ深掘り（制度の存在は法令で保証＝市ごとに不明なのは公式URL・窓口だけ＝YMYL捏造リスク最小）。

- **研究→敵対検証Workflow**（`scripts/` の `gen-append-programs.ts`／`preview-append-programs.ts` と併用）: (市×カテゴリ) ごとに、研究エージェントが各市公式ドメイン限定 WebSearch→WebFetch で実URL確認・窓口/連絡先抽出、検証エージェントが独立に再WebFetchで scope/到達/断定を再審査。session limit で検証段が一部未了→ research のみの層は curl で全URL HTTP 200 を確認し補完。
- **多層の捏造防止ゲート**: ①研究WebFetch ②敵対検証WebFetch ③`gen-append` の公式ホスト許可リスト＋`FORBIDDEN_PHRASES`＋`isPublishable`＋slug一意（未達は published→draft 降格） ④`tests/unit/safety.test.ts`（全 published に公式URL/確認日/対象/公的ソースhost/禁止語不在を強制）。
- **社協ホスト**: 生活福祉資金は各市社協が窓口。`gen-append`/`preview`/`safety.test` に検証済み社協ホストの明示許可（`EXTRA_ALLOWED_HOSTS`＝`csw-kawasaki.or.jp`・`www.with-kobe.or.jp`）を追加。shakyo/syakyo/cosw 含むホストは既存ルールで許可。
- **取り込み結果**: 制度 829→**1099**（published 1094 / draft 5）。政令市の制度 ~136→**406**（4カテゴリ深掘り）。静的ページ 1247→**1579**。全URL HTTP 200、typecheck/lint/Vitest 94件/build すべて green。**本番デプロイ済（2026-06-21・commit `bf5ea83`・https://astersupport.com で新ページ200・内容描画確認）**。
- **2回のWorkflow**: ①本体（20市×4カテゴリ。session limit で検証段の大半が未了→研究層＋curl で補完）②取りこぼし補完（熊本/仙台/北九州障害＝前回失敗の9ペア。検証段も完了＝二層検証）。
- **draft の5件**は研究が公式ページを確認できず自己申告で非公開化。seed には残るが `isPublishable` で描画されない。
- **lastOfficialCheckedAt = 2026-06-21**。redirect 14件は同一ホストの正規URLへ置換済み。社協3ホスト（csw-kawasaki/with-kobe/kumamoto-city-csw）を検証して `EXTRA_ALLOWED_HOSTS` に追加。
- **TS2590 対応**: programs.ts が 1099件で「union 型が複雑すぎる」型エラー→ 5チャンク（programs_0..4）に分割し `.concat()` で結合（巨大 seed 配列の定番回避策。今後の拡充でも分割を維持）。
- **独立検証**: 私（メインループ）の WebFetch 抜き取り 17サンプル（全20市・全4カテゴリ）→ 16完全一致＋1（福岡 障害者手帳が身体のみ）を是正。障害者手帳は15/16がハブページと確認。
- **要追い（任意・品質向上）**: seed→Supabase 反映（現状は hybrid の seed 補完で公開中＝描画は正常だが admin 編集対象にするなら `export-seed-to-sql` 再生成＋投入）。

### 新データの敵対検証パス（2026-06-21・実施済）

上記「要追い①」を実施。新規 published 265件を (市×カテゴリ)80グループで独立検証Workflow（各 officialUrl を独立WebFetch、scope/identity/到達/断定を再審査。`scripts/gen-verify-workflow.ts` が現データから生成）。

- **結果**: 265件中 **24件 flagged**（scope 22 / identity 2、unreachable 0・assertion 0＝URL健全・禁止語ゼロを再確認）。全件 `scripts/apply-verify-fixes.ts` で **published→draft 降格**。**published 1094→1070 / draft 5→29**。
- **2大パターン**（いずれも本文＝3種記載だがリンク先ページは1種のみ＝title↔body↔page不一致のため半端な是正をせず降格）:
  - **自立支援医療**（12市）: title「更生・育成・精神通院」だが各市ページは1種のみ（所管課が別＝別ページ）。
  - **障害者手帳**（4市: 広島/仙台/岡山/大阪）: title「身体・療育・精神」だがページは身体のみ等。※さいたま/札幌等15/16はハブページで適合＝flaggedされず。
  - ほか: 特別障害者手当・ひとり親相談で「単一制度title↔総合インデックスpage」不一致、identity 2件（相模原 手帳=カード化お知らせpage／さいたま 障害福祉サービス=地域生活支援事業page）。
- **再キュレーション backlog**: `docs/verify-flagged-2026-06-21.json`（24件・各 note＋suggestedTitle 付き）。次回、自立支援医療を type別に再モデル化／手帳はハブURL採用／インデックスpageはtitle整合、で published へ戻す。

## ルート

| ルート | 種別 | index |
|---|---|---|
| `/` | static | ○ |
| `/[prefecture]` | SSG | ○ |
| `/[prefecture]/[city]` | SSG（active のみ生成、準備中は noindex） | ○ |
| `/[prefecture]/[city]/[lifeEvent]` | SSG | ○ |
| `/supports/[slug]` | SSG | ○ |
| `/search` | dynamic（GETフォーム） | ✕ noindex |
| `/check`, `/check/result` | app（診断・対象外時の迂回路→/help） | ✕ noindex |
| `/saved` | app（localStorage保存リスト） | ✕ noindex |
| `/guides`, `/guides/[slug]` | SSG（ガイド記事・Article JSON-LD） | ○ |
| `/compare`, `/compare/[category]` | SSG（自治体横断の比較表） | ○ |
| `/help` | static（相談窓口・良きサマリア人の道案内） | ○ |
| `/about` `/disclaimer` `/privacy` `/terms` | static | ○ |
| `/sitemap.xml` `/robots.txt` `/opengraph-image` | generated | — |

### Phase 2 で追加した機能（事業構想の魂を注入）
- **相談窓口 `/help`**: 「入口は公共性、根はキリストへの愛（良きサマリア人の宿屋への道案内）」。電話番号は**AI生成せず全国共通の公的短縮番号(110/119/189/188)＋公式ポータルのみ**（`app/data/helplines.ts`、公式URLをWebFetch検証済みで `HELPLINES_VERIFIED=true`）。
- **診断結果の迂回路**: 「行政サービスのGoogle Maps」＝対象外時に別ルート（条件変更・自治体一覧・相談窓口）を提示。
- **保存リスト**: `app/lib/saved.ts`（純関数＋localStorage薄ラッパ）＋SaveButton/SavedList。ログイン不要・サーバ保存なし・非機微スナップショットのみ。
- **ガイド記事**: `app/data/guides.ts`（5本）。困りごとE-E-A-T・SEO資産。安全な枠組み記述＋検証済み関連制度リンク＋公式出典。

## データモデル

`app/lib/data/types.ts` の `SupportProgram` が中核。`isPublishable()` が公開ゲート（officialUrl + lastOfficialCheckedAt + targetPeople + 申請方法/窓口 必須）。`hasActiveDeadline()` は「確認できません/受付を終了」を期限バッジから除外する。

seed の各制度は各区公式サイトを WebFetch で URL 到達・内容確認済み（`verifiedFactsNote` 由来）。金額・期限は全国一律で確かなもののみ事実記載し、区差は `uncertainFields` で「公式で確認」へ誘導。

## 守るべき不変条件（YMYL）

AGENTS.md §1〜§7 を参照。要点:
1. 受給可否を断定しない（`FORBIDDEN_PHRASES` をテストで強制）。
2. 金額・期限・条件を捏造しない。区差は公式へ誘導。
3. 全制度表示面に 公式URL + 最終確認日 + 免責。
4. 診断は「候補」であって「判定」ではない。ローカル完結・サーバ保存なし。

## 品質ゲート

```bash
npm run lint && npm run build && npm test
npm run test:e2e   # Playwright（要 npx playwright install）
```

Vitest 52件 green / build 97ルート green（2026-06-18）。

## 残タスク（Phase 2 以降）

- Phase 2: メール登録、チェックリスト PDF/印刷強化、問い合わせ文の改良。
- Phase 3: Supabase Auth・保存リスト・家族プロフィール・期限リマインド（データ層を Supabase 実装へ）。
- データ拡大: 23区→政令市、介護/住まい/低所得カテゴリ。レビューキュー・更新運用。
- 公開前: 本番ドメイン **astersupport.com**（取得・Vercel接続・`NEXT_PUBLIC_SITE_URL` 設定済）、Search Console 登録、GA4 の事業用アカウント作成→`NEXT_PUBLIC_GA_ID` 設定（拡張計測オフ）、Vercel team の Pro 化（商用）、per-support OG 画像（和文フォント同梱）。法務（管轄文言・アクセス解析/委託先・運営者情報）は確定済。
