# Aster Support Navi — AIエージェント向けガイド

## これは「あなたの知っている Next.js」ではない

本リポジトリは **Next.js 16.2.6 / React 19 / Tailwind v4**（姉妹アプリ Aster Compass・Synaxis と同じ）。
学習データと API・規約・ファイル構成が異なる場合がある。コードを書く前に、必要なら
`node_modules/next/dist/` の該当ドキュメントや非推奨警告に従うこと。

## このプロダクトは何か

自治体ごとに散らばる個人・世帯向け支援制度（給付・助成・減免・相談窓口）を、**住所と生活状況から探し、
申請前に確認すべき情報まで整理する**生活支援ナビ。内部コンセプトは「支援制度版SUUMO」。Aster Works ブランド。

- 申請代行サービスではない。受給可否を**判定する**サービスでもない。「見落とし防止」と「申請準備の伴走」。
- 公開Website（SEO入口）＋ Webアプリ（診断・チェックリスト・将来の保存/リマインド）の二層。
- 仕様: `docs/` 配下の handoff ドキュメント要約、`docs/PRODUCT_NOTES.md`。

## 破ってはいけない不変条件（最優先・YMYL）

### 信頼性・非断定（Safety-first）
1. **制度の利用可否を断定しない。** 「あなたは対象です」「必ずもらえる」「申請すれば受給できます」は禁止。
   常に「対象となる可能性があります」「公式ページで確認してください」と表現する。
   禁止/推奨表現は `app/lib/copy.ts`（`FORBIDDEN_PHRASES` / 推奨マイクロコピー）に一元化し、テストで守る。
2. **金額・期限・必要書類・対象条件を創作しない。** 全国一律で検証できる事実（児童手当が国の制度であること等）
   のみ事実として書き、自治体ごとに異なる/未確認の値は「お住まいの自治体の公式ページで確認してください」に寄せる。
   seed データには `uncertainFields` と `sourceConfidence` を持たせ、未確認項目を明示する。
3. **全ての制度ページに「公式URL」「最終公式確認日（lastOfficialCheckedAt）」「免責」を必ず表示する。**
   これが無い制度は公開ステータスにしない（`isPublished` ゲート）。
4. **診断結果は「確認候補」であって「確定判定」ではない。** 結果には必ず公式確認CTAと免責を添える。
   候補抽出は決定的なルールベース純関数（`app/lib/eligibility.ts`）が行い、AI に判定させない。

### プライバシー
5. **診断はログイン不要・サーバ保存なしで動かす（MVP）。** 家族構成・収入帯・健康/介護に関わる入力は機微情報。
   収入は粗いバンドのみ、機微情報はサーバDB・ログに保存/出力しない。保存機能は明示同意後に限定（Phase 3）。

### ブランド
6. **配色・フォント・コンポーネントクラスは Aster Works 規約に従う**
   （navy `#0d1b2a` / gold `#d4a24c` / charcoal `#2b2d31` / soft-gray `#e6e7e8` / 背景 `#fafaf8` / cream、
   Inter + Noto Sans JP、`.aw-card` / `.btn-primary` / `.aw-eyebrow` / `.aw-badge`）。
   Support Navi 固有のセマンティック色（期限=amber / オンライン申請=teal / 確認済=green）は機能伝達用に追加するが、
   **色のみに依存しない**（必ずアイコン＋ラベルを併記）。タッチ 44px・`:focus-visible`（gold アウトライン）を守る。

### SEO（公開ページの存在意義）
7. **公開ページ（トップ/自治体/生活イベント/制度詳細）は本文をサーバー側でレンダリングする。**
   ログイン必須SPAにしない。各ページに generateMetadata（unique title/description/canonical/OG）、
   パンくず、JSON-LD、内部リンク、最終確認日を持たせる。検索結果・アプリ内ページは noindex。

## 技術スタック（姉妹アプリにピン留め）

- next `16.2.6` / react・react-dom `19.2.x` / typescript `^5`
- tailwindcss `^4`（`@theme` でブランドトークン）/ lucide-react（アイコン）
- zod `^3.25`（診断入力・将来のAI出力を検証）
- データ: MVPは型付き seed（`app/data`）。`app/lib/data/` のデータアクセス層経由でのみ読み、Supabase へ差し替え可能に。
- test: vitest `^2.1`（純関数・コンポーネント）/ @playwright/test `^1.49` + @axe-core/playwright（E2E・a11y）
- eslint `^9` + eslint-config-next `16.2.6` / tsconfig `paths` は `@/*` / App Router 配下に統一
- dev/start ポートは `3040`

## ディレクトリ方針

- `app/lib/` … 依存ゼロの純関数（`eligibility` / `slug` / `dates` / `copy` / `seo`）。Vitest で網羅。
- `app/lib/data/` … データアクセス層（型 + seed リポジトリ）。ページは seed を直接 import せずここ経由で読む。
- `app/data/` … 制度・自治体・カテゴリ・生活イベントの seed。
- `app/components/` … UIプリミティブと各ページ部品。
- `app/(public)` 相当の公開ルートと `/check`（アプリ）を分離。

## 開発の進め方 / 品質ゲート

段階を踏む：調査 → 実装計画 → 実装 → lint/型/テスト。各まとまりでゲートを回す。

```bash
npm run lint
npm run build
npm test          # Vitest（eligibility/slug/dates/copy の決定性・境界、コンポーネント）
npm run test:e2e  # Playwright（探す→自治体→詳細→診断→チェックリスト、禁止表現の不在、a11y）
```

不変条件 1〜7 が Vitest / Playwright で守られない限り本番に出さない。
