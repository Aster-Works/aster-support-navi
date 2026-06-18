# Aster Support Navi — 実装ノート（Phase 1 MVP）

作成: 2026-06-18 / ステータス: Phase 1 MVP 実装完了

引き継ぎ仕様の原典は `/Users/james/aster-support-navi-handoff/`（PRODUCT_SPEC / TECHNICAL_ARCHITECTURE / DATA_AND_CONTENT_OPS / ROADMAP / RESEARCH_AND_POSITIONING）。本ノートは実装の地図。

## 何を作ったか

「支援制度版SUUMO」。自治体の個人・世帯向け支援制度を、住所×生活状況から探し、申請準備まで伴走する SEO-first Web Product。MVP は **東京23区 × 出産/子育て**、検証済み 161 制度（各区7制度・公式URLをWorkflowでWebFetch検証）。

## アーキテクチャ

- Next.js 16 App Router / React 19 / Tailwind v4 / TypeScript。npm、dev/start ポート 3040。
- データは型付き seed（`app/data/*.ts`）。ページは必ず `app/lib/data`（データアクセス層）経由で読む。
  関数は async で定義済みなので、Phase 3 で Supabase 実装へ差し替えても呼び出し側は不変。
- 純関数は `app/lib`（`eligibility` 診断マッチ / `dates` 期限 / `slug` / `copy` 文言ガード / `checklist`）。すべて Vitest 網羅。

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
- **相談窓口 `/help`**: 「入口は公共性、根はキリストへの愛（良きサマリア人の宿屋への道案内）」。電話番号は**AI生成せず全国共通の公的短縮番号(110/119/189/188)＋公式ポータルのみ**（`app/data/helplines.ts`、`HELPLINES_VERIFIED=false`で公開前検証フラグ）。
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

Vitest 38件 green / build 83ルート green（2026-06-18）。

## 残タスク（Phase 2 以降）

- Phase 2: メール登録、チェックリスト PDF/印刷強化、問い合わせ文の改良。
- Phase 3: Supabase Auth・保存リスト・家族プロフィール・期限リマインド（データ層を Supabase 実装へ）。
- データ拡大: 23区→政令市、介護/住まい/低所得カテゴリ。レビューキュー・更新運用。
- 公開前: 法務ページの運営者情報・連絡先・管轄確定、本番ドメイン（navi.asterworks.org 想定）、Search Console、per-support OG 画像（和文フォント同梱）。
