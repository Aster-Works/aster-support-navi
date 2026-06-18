# Aster Support Navi

くらしの支援制度を、見落とさない。

自治体ごとに散らばる個人・世帯向けの支援制度（給付・助成・減免・相談窓口）を、**住所と生活状況から探し、申請前に確認すべきことまで整理する**生活支援ナビ。Aster Works の中核プロダクト。

- 内部コンセプト: **支援制度版SUUMO**（UI）／**行政サービスのGoogle Maps**（体験：困りごと→制度・窓口・申請完了へのルート＋対象外時の迂回路）
- MVPスコープ: **東京23区 × 出産・子育て**、検証済み161制度（各区7制度）
- 設計の正典は [`AGENTS.md`](./AGENTS.md)、実装の地図は [`docs/PRODUCT_NOTES.md`](./docs/PRODUCT_NOTES.md)

## 技術スタック

Next.js 16 (App Router) / React 19 / TypeScript 5 / Tailwind v4 / lucide-react / Vitest / Playwright + axe-core。データは型付き seed（`app/data`）で、`app/lib/data` のデータアクセス層を経由（Supabase へ差し替え可能な設計）。dev/start ポートは **3040**。

## セットアップ

```bash
npm install
cp .env.example .env.local   # 何も設定しなくても seed で完全動作（任意）
npm run dev                  # http://localhost:3040
```

## 品質ゲート

```bash
npm run lint        # ESLint（eslint-config-next）
npm run typecheck   # tsc --noEmit
npm test            # Vitest（eligibility/dates/slug/checklist/saved/data/seo/safety）
npm run build       # 本番ビルド（97ルート、SSG中心）
npm run test:e2e    # Playwright（要 npx playwright install。探す→詳細→診断、a11y axe、禁止表現の不在）
```

## ディレクトリ

```
app/
  page.tsx                         トップ
  [prefecture]/                    都道府県・自治体・生活イベント
    [city]/[lifeEvent]/
  supports/[slug]/                 制度詳細（公式情報＋申請チェックリスト＋保存）
  search/                          検索（GETフォーム・noindex）
  check/  check/result/            かんたん診断・結果（ローカル完結・noindex）
  saved/                           保存リスト（localStorage・noindex）
  guides/  guides/[slug]/          ガイド記事（SEO資産・Article JSON-LD）
  compare/ compare/[category]/     自治体横断の比較表
  help/                            相談窓口（ひとりで抱え込まないために）
  about/ disclaimer/ privacy/ terms/   このサイトについて・法務
  sitemap.ts  robots.ts  opengraph-image.tsx
  components/                      UIプリミティブ・各部品
  lib/                             純関数（eligibility/dates/slug/copy/checklist/saved/seo）
  lib/data/                        データアクセス層（型＋seedリポジトリ）
  data/                            seed（制度・自治体・カテゴリ・生活イベント・ガイド・相談窓口）
```

## 不変条件（YMYL・最優先）

詳細は [`AGENTS.md`](./AGENTS.md)。要点:

1. **受給可否を断定しない。** 「必ずもらえる」「あなたは対象です」等は禁止（`app/lib/copy.ts` の `FORBIDDEN_PHRASES` をテストで強制）。常に「対象となる可能性があります」「公式ページで確認してください」。
2. **金額・期限・条件を捏造しない。** 全国一律で確かな事実のみ明記し、自治体差は `uncertainFields` で公式確認へ誘導。
3. **全ての制度表示面に 公式URL・最終確認日・免責。** 満たさない制度は公開しない（`isPublishable`）。
4. **診断はローカル完結・サーバ保存なし。** 機微情報を保存しない。
5. **相談窓口の電話番号は AI で生成しない。** 全国共通の公的短縮番号（110/119/189/188）と公式ポータルのみ（`app/data/helplines.ts`、`HELPLINES_VERIFIED`）。

## 公開前に必要なこと

- 法務ページ（プライバシー/利用規約）の運営者情報・連絡先・合意管轄の確定
- 相談窓口・公式URLの人手による最終検証（`HELPLINES_VERIFIED=true` へ）
- 本番ドメイン `astersupportnavi.jp` の取得と `NEXT_PUBLIC_SITE_URL` 設定
- Google Search Console / 計測の事業用アカウント設定

## ロードマップ

Phase 1（SEO公開サイト）と Phase 2核（診断・チェックリスト・保存・ガイド・比較・相談窓口）は実装済み。Phase 3 でアカウント・保存同期・期限リマインド（Supabase）。詳細は事業構想・[`docs/PRODUCT_NOTES.md`](./docs/PRODUCT_NOTES.md)。
