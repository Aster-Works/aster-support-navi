# GA4 計測・コンバージョン設定（Jimi 作業分）

測定ID: `G-G7R90D7QMH`（Production のみ。env `NEXT_PUBLIC_GA_ID`）。
コード側のイベント実装は完了済み。以下は **GA4 管理画面での設定**（コードでは不可）。

## 1. 送信しているカスタムイベント（実装済み）

| イベント名 | 発火 | 主なパラメータ |
|---|---|---|
| `guide_view` | ガイド記事の表示 | `guide`(slug), `source` |
| `diagnosis_start` | 診断/CTAクリック（ヘッダー/ホーム/ガイド等） | `source` |
| `diagnosis_complete` | 診断結果（支援ルート）表示 | `result_count`, `prefecture`, `city`, `category_count` |
| `official_link_click` | 制度の公式リンククリック | `support_id`, `support_title`, `category`, `municipality`, `outbound_url_domain` |
| `pro_view` | Pro案内ページ表示 | `source` |
| `pro_interest_click` | Pro導線・問い合わせクリック | `source`, `plan_hint` |
| `stripe_click` | 有料プラン「申し込む」クリック | `plan`, `source` |
| `sample_pack_view` | サンプル相談パック表示 | `sample`, `source` |
| `checklist_printed` | 申請前パックの印刷/PDF | `context`, `count` |

※ いずれも非PII（自由入力・住所・電話・メール・クエリ文字列は送信しない）。

## 2. 主要なイベント（コンバージョン）に登録する

GA4 管理 → データの表示 → **イベント** で、各イベントが入ってきたら（または「イベントを作成」で先に定義）、
次を **「主要なイベント（Key events）」のトグルON** にする:

- ✅ `stripe_click` … 収益の最重要シグナル（申込ボタンのクリック）
- ✅ `pro_interest_click` … 問い合わせ・導入相談の意向
- ✅ `diagnosis_complete` … 中核エンゲージメント
- （任意）`pro_view` … Proファネルの入口

## 3. 見るべきファネル（探索レポート）

ChatGPT 90日計画の計測目標に対応:

1. **SEO流入 → 診断**: `guide_view` →（同一ユーザーの）`diagnosis_start` / `diagnosis_complete`
2. **Pro CVR**: `pro_view` → `stripe_click`（目標 1〜3%）
3. **問い合わせ率**: `pro_view` → `pro_interest_click`

探索 → 目標到達プロセス（ファネル）で上記ステップを並べると、各段の離脱率が見えます。

## 4. 確認・運用メモ

- **拡張計測（Enhanced Measurement）はオフのまま**（スクロール等の自動イベントが現在URLのクエリを拾うため。
  本サイトはクエリに診断回答・検索語が乗りうる）。
- 反映確認は **DebugView**（`?gtm_debug=1` 等）か、リアルタイムで `stripe_click`/`guide_view` が入るか確認。
- イベントは発生して初めて GA4 のイベント一覧に現れる（数時間〜1日かかることがある）。本番で一度クリックして発火させると早い。
