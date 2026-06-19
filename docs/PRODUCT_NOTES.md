# Aster Support Navi — 実装ノート（Phase 1 MVP）

作成: 2026-06-18 / ステータス: Phase 1 MVP + Phase 2核 実装完了・本番デプロイ済

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
- 検証: typecheck / Vitest 74件 / lint / build 1247 SSG すべて green。多面的レビュー（parity・往復整合・RLS・RSC境界・SQL）＋敵対的検証済み。

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
