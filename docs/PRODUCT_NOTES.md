# Aster Support Navi — 実装ノート

作成: 2026-06-18 / 最終更新: 2026-06-23 / ステータス: Phase 1–2 + Slice A–F 実装完了。Phase 4（コンテンツ拡充）進行中。本番公開データソースは Supabase へ移行済み。

引き継ぎ仕様の原典は `/Users/james/aster-support-navi-handoff/`（PRODUCT_SPEC / TECHNICAL_ARCHITECTURE / DATA_AND_CONTENT_OPS / ROADMAP / RESEARCH_AND_POSITIONING）。本ノートは実装の地図。

## 何を作ったか

「支援制度版SUUMO」。自治体の個人・世帯向け支援制度を、住所×生活状況から探し、申請準備まで伴走する SEO-first Web Product。MVP は **東京23区 × 出産/子育て**から始め、現在は Supabase DB を正式な source of truth として 1372 制度（published 1371 / archived 1）まで拡張済み。

## アーキテクチャ

- Next.js 16 App Router / React 19 / Tailwind v4 / TypeScript。npm、dev/start ポート 3040。
- データは `app/lib/data`（データアクセス層）経由でのみ読む。**正式な制度データの source of truth は
  Supabase DB**。`SupportRepository` は `supabase` を既定とし、`seed` は緊急退避・ローカル初期データ、
  `hybrid` は移行検証専用として残す。`DATA_SOURCE` を切り替えても、この層の公開 API
  （= ページ・コンポーネントの呼び出し側）は完全に不変。
- 純関数は `app/lib`（`eligibility` 診断マッチ / `dates` 期限 / `slug` / `copy` 文言ガード / `checklist`）。すべて Vitest 網羅。

### Slice A: データ基盤の堅牢化（2026-06-20 実装 / 2026-06-23 DBを正式source of truth化）

- `app/lib/data/repository.ts` … `SupportRepository` interface・`resolveDataSource()`・`getRepository()`。
- `app/lib/data/seedRepository.ts` … 緊急退避・ローカル初期データ用。型付き seed を読む（published は module scope で一度評価）。
- `app/lib/data/supabaseRepository.ts` … Supabase 制度DB（published のみ）を読む `supabaseRepository` と、
  DB 優先＋seed 補完の `hybridRepository`。`supabase` モードでは接続失敗・env 未設定時に seed へ
  自動フォールバックしない。古い制度を出すリスクを避けるため、本番相当ではDB取得失敗をビルド/実行エラーとして扱う。
  Data API の1リクエスト上限を避けるため、published 制度は 1000件単位でページング取得する。
  `mapProgram` / `unionBySlug` / `unionMunicipalities` は純関数として Vitest 網羅。
- `app/lib/supabase-server.ts` … サーバー専用クライアント（遅延生成・anon 読取・service_role 不使用）。
- `supabase/migrations/20260620090000_content_schema.sql` … 制度DB全テーブル＋RLS
  （support_programs は published のみ公開 select。sources/revisions/review_queue/app_roles は拒否＝Slice B で管理者ポリシー追加）。
- `scripts/export-seed-to-sql.ts` … legacy seed→冪等 SQL を生成（`npx tsx`、DB へは書かない）。出力は gitignore。
  今後の新規制度追加には使わず、緊急退避seedからDBを復旧する場合のみ使う。
- 移行手順（完了済み）: ① migration 適用 → ② 生成 SQL を service_role で投入 → ③ `DATA_SOURCE=hybrid` で検証 → ④ `supabase`。
- 検証: typecheck / Vitest 74件 / lint / build すべて green。多面的レビュー（parity・往復整合・RLS・RSC境界・SQL）＋敵対的検証済み。
- 本番Supabase（ref atdhkmniczfxowfkzwjr）へ migration 適用＋1372制度投入済。2026-06-23 時点で
  `DATA_SOURCE=supabase` を正式運用し、published 1371 / archived 1、draft 0、open review queue 0。

### 現行データ運用ルール（2026-06-23 以降）

- **新規制度追加・既存制度更新は、管理画面のCSV取込またはDB運用で行う。**
- **`app/data/programs.ts` へ新規制度を直接追記しない。** seed は正式データではなく、緊急退避・ローカル初期データ扱い。
- `scripts/gen-append-programs.ts` と `scripts/apply-verify-fixes.ts --write` は通常停止。非常時のみ `ALLOW_SEED_WRITE=1` を明示して使う。
- 本番/本番相当の `DATA_SOURCE` は `supabase`。`seed` はDB障害時の手動退避またはSupabase未接続のローカル初期確認のみ。
- `hybrid` は移行検証専用。本番公開で seed 補完を混ぜない。

### Slice B: 管理画面・運用基盤（2026-06-20 実装・本番Supabase適用済）

- DB（`20260620100000_admin_authz.sql` ＋ 強化 `20260620110000_admin_authz_hardening.sql`）:
  `private.is_admin()`（SECURITY DEFINER・非公開スキーマ）／管理者RLS（authenticated かつ is_admin で
  全ステータス read/write。公開の published-only 読みは維持）／`log_support_revision()`（編集を自動監査。
  auth.uid() null=service_role/バルク投入はスキップ）／`enforce_publish_quality()`（公開品質ゲートを
  DB レベルで強制＝必須項目を欠いたまま published にできない）。app_roles は self-read のみ。
- UI（`app/admin/*`・`app/lib/admin/client.ts`）: ブラウザ anon クライアント＋管理者RLSのみ（service_role 不使用）。
  AdminGate（ログイン）/ ダッシュボード / 制度一覧（status filter・品質フラグ）/ 編集（18項目＋
  draft→review→published→archived＋品質ゲート enforcement＋出典管理＋制度別レビュー項目＋変更履歴）/
  品質（未達・stale）/ レビューキュー。`/admin` は noindex + robots disallow。
- 認可の最終境界は DB の RLS。AdminGate はUX用。多層防御＝①クライアント品質ゲート ②DBトリガ強制 ③公開側 isPublishable 再フィルタ。
- 検証: 実認証 admin JWT で end-to-end（非admin→draft不可視 / admin→draft可視・編集・revision記録 / incomplete publish 拒否 / valid publish 成功）。匿名 gate・admin walkthrough をブラウザ実地検証。build 1251 / Vitest 74 green。セキュリティレビュー（RLS認可・client安全性・監査・整合性 ×敵対的検証）対応済。
- 残: 自動巡回結果の運用改善（変更検出後のレビュー完了フロー、通知、対象URLの優先度付け）。

### Slice F: 品質ゲート・出典/revision/review queue 移行開始（2026-06-22 実装・本番Supabase適用済）

- `app/lib/data/quality.ts` … 低品質/古い/公式URL不明/非公式ホスト/低信頼度/下書きレビュー対象を共通判定。
  `blocksPublish` と `shouldQueue` を分け、古い確認日は即公開停止ではなく review queue 対象にする。
- 管理画面: `qualityIssues()` を共通品質ゲートへ接続。`/admin/quality` は全ステータスを検出対象に拡大。
  CSV取込も同じゲートを使い、非HTTPS・非公式ホスト・未来日などを検証段階で弾く。
- `supabase/migrations/20260622120048_content_quality_ops.sql` … 既存テーブルを破壊せず、
  `support_sources` の品質メタ、`support_revisions.external_key`、`review_queue_items.issue_code/severity/detected_by` を追加。
  `private.refresh_content_quality_queue()` は private schema の運用SQL用で、Data API には公開しない。
- `scripts/export-seed-to-sql.ts` … seed の全 status を Supabase へ載せられるように拡張。
  制度本体、公式出典、seed baseline revision、review queue 候補を冪等SQLとして生成する。DBへは書かない。
- `scripts/audit-content-quality.ts` / `npm run data:audit` … seedの読み取り専用監査。seedは正式データではないが、
  緊急退避データとして壊れていないか確認する。2026-06-23時点: 1372制度（published 1371 / archived 1）、
  品質issue 0、公開ブロッカー 0、review queue候補 0。
- 本番DB確認（2026-06-23）: `support_programs` 1372（published 1371 / archived 1）、open review queue 0、
  `support_sources.quality_state='needs_review'` 0、active low confidence 0、orphan source 0。
- Slice F 続き（2026-06-23）: `support_sources` に自動巡回専用メタ（`fetched_content_hash` /
  `last_fetched_at` / `last_fetch_status` / `last_fetch_error` / `last_fetch_changed_at`）を追加。
  `/api/cron/check-sources` を Vercel Cron に登録し、公式URLを少量ずつ取得する。初回は取得hashの
  baseline作成のみ、2回目以降に本文hash変化・取得失敗があれば `review_queue_items` へ積む。
  制度本文・公開ステータス・人手確認日（`last_official_checked_at`）は自動変更しない。

### 政令市データ拡充 — 4カテゴリ深掘り（Phase 4・2026-06-21）

20政令市はそれまで出産・子育てのみだった。**法令で全市に必ず存在する制度**だけに絞り、ひとり親 / 生活困窮 / 介護 / 障害の4カテゴリへ深掘り（制度の存在は法令で保証＝市ごとに不明なのは公式URL・窓口だけ＝YMYL捏造リスク最小）。

- **研究→敵対検証Workflow（履歴）**: 当時は `scripts/` の `gen-append-programs.ts`／`preview-append-programs.ts` と併用していたが、現在の新規制度追加は管理画面CSV取込またはDB運用へ固定。seed追記スクリプトは非常時のみ `ALLOW_SEED_WRITE=1` で使う。
- **多層の捏造防止ゲート**: ①研究WebFetch ②敵対検証WebFetch ③公式ホスト許可リスト＋`FORBIDDEN_PHRASES`＋`isPublishable`＋slug一意（未達は published→draft 降格） ④`tests/unit/safety.test.ts`（全 published に公式URL/確認日/対象/公的ソースhost/禁止語不在を強制）。
- **社協ホスト**: 生活福祉資金は各市社協が窓口。`preview`/`safety.test` に検証済み社協ホストの明示許可（`EXTRA_ALLOWED_HOSTS`＝`csw-kawasaki.or.jp`・`www.with-kobe.or.jp`）を追加。shakyo/syakyo/cosw 含むホストは既存ルールで許可。
- **取り込み結果**: 制度 829→**1099**（published 1094 / draft 5）。政令市の制度 ~136→**406**（4カテゴリ深掘り）。静的ページ 1247→**1579**。全URL HTTP 200、typecheck/lint/Vitest 94件/build すべて green。**本番デプロイ済（2026-06-21・commit `bf5ea83`・https://astersupport.com で新ページ200・内容描画確認）**。
- **2回のWorkflow**: ①本体（20市×4カテゴリ。session limit で検証段の大半が未了→研究層＋curl で補完）②取りこぼし補完（熊本/仙台/北九州障害＝前回失敗の9ペア。検証段も完了＝二層検証）。
- **draft の5件**は研究が公式ページを確認できず自己申告で非公開化。seed には残るが `isPublishable` で描画されない。
- **lastOfficialCheckedAt = 2026-06-21**。redirect 14件は同一ホストの正規URLへ置換済み。社協3ホスト（csw-kawasaki/with-kobe/kumamoto-city-csw）を検証して `EXTRA_ALLOWED_HOSTS` に追加。
- **TS2590 対応**: programs.ts が 1099件で「union 型が複雑すぎる」型エラー→ 5チャンク（programs_0..4）に分割し `.concat()` で結合（巨大 seed 配列の定番回避策。今後の拡充でも分割を維持）。
- **独立検証**: 私（メインループ）の WebFetch 抜き取り 17サンプル（全20市・全4カテゴリ）→ 16完全一致＋1（福岡 障害者手帳が身体のみ）を是正。障害者手帳は15/16がハブページと確認。
- **DB移行済み**: seed→Supabase 反映は完了。現在はDBが正式source of truthで、`export-seed-to-sql` は緊急復旧・再投入用のlegacy手段に降格。

### 新データの敵対検証パス（2026-06-21・実施済）

上記「要追い①」を実施。新規 published 265件を (市×カテゴリ)80グループで独立検証Workflow（各 officialUrl を独立WebFetch、scope/identity/到達/断定を再審査。`scripts/gen-verify-workflow.ts` が現データから生成）。

- **結果**: 265件中 **24件 flagged**（scope 22 / identity 2、unreachable 0・assertion 0＝URL健全・禁止語ゼロを再確認）。全件 `scripts/apply-verify-fixes.ts` で **published→draft 降格**。**published 1094→1070 / draft 5→29**。
- **2大パターン**（いずれも本文＝3種記載だがリンク先ページは1種のみ＝title↔body↔page不一致のため半端な是正をせず降格）:
  - **自立支援医療**（12市）: title「更生・育成・精神通院」だが各市ページは1種のみ（所管課が別＝別ページ）。
  - **障害者手帳**（4市: 広島/仙台/岡山/大阪）: title「身体・療育・精神」だがページは身体のみ等。※さいたま/札幌等15/16はハブページで適合＝flaggedされず。
  - ほか: 特別障害者手当・ひとり親相談で「単一制度title↔総合インデックスpage」不一致、identity 2件（相模原 手帳=カード化お知らせpage／さいたま 障害福祉サービス=地域生活支援事業page）。
- **再キュレーション backlog**: `docs/verify-flagged-2026-06-21.json`（24件・各 note＋suggestedTitle 付き）。次回、自立支援医療を type別に再モデル化／手帳はハブURL採用／インデックスpageはtitle整合、で published へ戻す。

### Slice G: 収益導線（Phase 0・2026-06-23 実装）

ChatGPT 90日ロードマップの Phase 0「収益導線を先に作る」を実装。詳細は `docs/REVENUE_ROADMAP.md`。

- **料金プラン**: `app/lib/pro/plans.ts`（Free/Personal ¥2,980/Pro ¥9,800/Team ¥29,800 の単一真実源）＋
  `app/pro/PlansTable.tsx`。`/pro#pricing` に掲示。**公共情報は無料のまま、課金は支援者の業務ツールに対して**
  （`PrepPacket` のペイウォール非化方針と整合）。
- **Stripe 決済**: Payment Link 方式（MVP。バックエンド/Webhook 不要）。各有料CTAは
  `NEXT_PUBLIC_STRIPE_LINK_{PERSONAL,PRO,TEAM}` の決済URLへ遷移。未設定なら問い合わせ `#contact` へ
  フォールバック＝**env 無しでも安全にデプロイ可能**。クリックは `stripe_click`（plan付き）で計測。
- **サンプル相談パック×3**: `app/lib/pro/samples.ts` ＋ `/pro/samples`・`/pro/samples/[slug]`
  （single-parent / livelihood-housing / birth-childcare）。実在の published 制度のみで構成し
  （`selectSampleProgramsFrom` が制度種別ごとに代表1件へ畳む純関数）、`PrepPacket` で印刷・PDF保存可。
  sitemap 登録・index 可（SEO資産兼営業コラテラル）。
- **導線追加**: ホーム下部「支援する人へ」バンド → `/pro`、`/check/result` 申請前パック直下の Pro CTA。
- **GA4 イベント追加**（`src/lib/analytics.ts`）: `pro_view` / `stripe_click` / `sample_pack_view`。
  許可パラメータに `plan` / `sample` を追加（非PIIの短い列挙値のみ）。
- 検証: typecheck / lint / Vitest 131件（+37）/ build（/pro・/pro/samples・3サンプル静的生成）すべて green。
- **Jimi の残作業**: Stripe で各プランの Payment Link を作成 → Vercel に env 設定 → 再デプロイ。
  GA4 で `pro_view → stripe_click` をコンバージョン登録。

#### Slice G 続き: ブランド差込PDF（2026-06-24 実装・本番DB適用済）

料金プラン Personal/Pro が謳う「個人名入り / 団体名・ロゴ入りPDF」を実体化。

- migration `20260624093000_pro_branding.sql`（本番適用済）: `organizations.logo_url` ＋
  `consultation_packets.prepared_by` を追加（nullable・後方互換・公開ページ無影響）。RLS は既存で充足
  （org 更新=owner/admin、packet 更新=member）。
- `PrepPacket` に `branding`（orgName/preparedBy/logoUrl）を追加。印刷PDFヘッダーに
  ロゴ＋団体名＋担当者＋作成日を差込。ロゴURLは `isHttpUrl` で http(s) のみ許可（安全側ガード・Vitest）。
- `/pro/dashboard`（owner/admin が団体名・ロゴURLを設定）／`/pro/consultations/[id]`（担当者名）。
- `/pro/samples/*` は見本ブランド（「◯◯支援センター（見本）」「担当 相談担当」）で機能を提示。
- 検証: typecheck/lint/Vitest 135（+4）green。dev でサンプルの差込描画・Pro全ルート200を確認。
- 残（Slice G）: プラン別の機能ゲート（PDF生成上限・複数ユーザー等）・ロゴのStorageアップロード（現状はURL）。

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

## 自治体独自支援（支援テーマ / 調査カバレッジ）

大分類 categories の下に細分類 **support_topics** を追加し、補聴器・紙おむつ・産後ケア等の「見落としやすい
自治体独自支援」をテーマ横断で検索/比較できるようにした。`support_program_topics`（多対多, 公開読取）と
`municipality_topic_coverage`（自治体×テーマの調査台帳, **admin専用・内部**）を追加。公開UIは `/topics`・
`/topics/[topic]`・自治体ページのテーマセクション・制度詳細のテーマチップ。設計と運用・パイロット結果・本番適用/
ロールバックは [LOCAL_SUPPORT_EXPANSION.md](LOCAL_SUPPORT_EXPANSION.md) を参照。
