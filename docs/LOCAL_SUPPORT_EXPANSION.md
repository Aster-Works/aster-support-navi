# 自治体独自支援の拡張（支援テーマ / 調査カバレッジ）

最終更新: 2026-06-24

## 目的

代表的な全国制度に加え、自治体ごとに異なる「見落としやすい細かな独自支援」（補聴器・紙おむつ・産後ケア
等）を、利用者と相談支援者が見つけ・比べられるようにする。単なる件数追加ではなく、(1) 細分類で検索/比較
でき、(2) どの自治体×テーマを調査済みか把握でき、(3) 公式根拠と確認日を持ち更新監視へ接続でき、(4) 薄い
自動生成ページを量産せず、(5) Pro 相談パックで使える情報量を持つこと、を満たす。

## 細分類テーマ設計

既存の大分類 `categories`（出産/子育て/医療費/…/介護/住まい/障害の10）は維持し、その下に細分類
**支援テーマ `support_topics`** を別レイヤーとして追加。制度は大分類カテゴリと細分類テーマの両方に関連付く。

- `support_topics`（master, 公開読取可）: slug, name, description, parent_category_id, priority, sort_order, indexable。初期15テーマを seed/migration で投入。
- `support_program_topics`（多対多, 公開読取可）: 1制度が複数テーマに関連可。`support_program_categories` と同形。
- `municipality_topic_coverage`（内部台帳, **anon非公開・admin専用**）: 自治体×テーマの調査状況。

ドメイン型は `app/lib/data/types.ts`（`SupportTopic` / `program.topicSlugs?` / `ResearchStatus` /
`MunicipalityTopicCoverage`）、seed は `app/data/topics.ts`（migration と一致）。

## 調査カバレッジの意味（重要）

`municipality_topic_coverage.research_status` は内部運用の状態であり、公開画面の断定とは分離する。

| status | 意味 |
|---|---|
| `not_started` | 未調査 |
| `researching` | 調査中 |
| `found` | 公式に該当制度を確認できた |
| `not_found_on_official_site` | **指定方法で公式を調べたが、確認日時点で確認できなかった。「制度が無い」断定ではない** |
| `needs_review` | ページはあるが古い/対象不明等で要再確認 |
| `not_applicable` | 当該自治体に該当しない（例: 雪のない地域の除雪） |

公開画面で「この自治体には制度がありません」と安易に表示しない。台帳には調査日・調査経路（公式URL/検索導線）・
メモを残す。`municipalities.coverage_status`（自治体全体の粗い状態）はそのまま残す。

## 追加・更新フロー（DATA_SOURCE=supabase 前提）

正本は Supabase DB。`app/data/programs.ts`（seed）へ新規制度を直接追記しない。テーマ master（topics）は
migration で管理。新規制度データは次のいずれか:

1. **研究バッチ → migration**（今回のパイロットの方法）: 研究→敵対検証WF → 新規行のみの冪等 migration を生成
   → `supabase db push --linked`。
2. **管理画面 CSV import**: 既存の `/admin/import`（CSV v1）。`topic_slugs` 列・トランザクション化（CSV v2 / RPC）は
   未実装の TODO（§7 参照）。当面は研究バッチ→migration を正路とする。

## 研究 → 敵対検証 → 公開 の手順

1. **研究**: 自治体公式（`*.lg.jp` / `*.tokyo.jp` / `city.*`）で該当制度を探し、構造化下書きを作る。根拠URL・確認日・
   調査メモを残す。新規は原則 `draft` 相当。
2. **敵対的検証**: URL到達・リダイレクト先の主体一致・title/対象/支援内容/リンク先範囲の一致・古い年度PDFでない・
   国制度の一般説明を独自制度と誤認していない・対象の一部を全体と書いていない・複数制度を1件に混ぜていない・
   禁止表現/断定の不在を独立に再確認。
3. **公開判定**: 合格（ok）のみ `published` 候補。不合格は `draft`/`review` のまま理由を残す（無理に修正して公開しない）。
   公開は人手の最終承認後（本番DB適用は Jimi 承認が必須）。

## パイロット対象と結果

- 対象: **東京23区 × 補聴器購入費助成（hearing-aid）**。
- 調査セル数: **23 / 23**（全区調査済み）。
- found: **23**（全区に区独自の補聴器助成を確認）/ not_found_on_official_site: **0** / needs_review: **0**。
- 公開候補（二段検証 ok）: **21**（`published`）。
- `review` 据え置き **2**:
  - 千代田区: 60歳以上向けと60歳未満向けの2制度を1ページが束ねており、単一制度要件を厳密には満たさないため（情報自体は実在・正確）。単一制度へ整理後に公開可。
  - 足立区: 公式情報だが officialUrl が `adachi-faq.jp`（許可ホスト `.lg.jp/.tokyo.jp` 外）。正規の区公式URLへ差替後に公開可。
- migration: `supabase/migrations/20260624140000_pilot_hearing_aid_23ku.sql`（23制度 + category/life_event/topic join + sources + revisions + 23 coverage、冪等 upsert・新規行のみ）。**seed には入れない（§5-3）。**

## 公開UI

- `/topics` … テーマ一覧（公開制度を持つテーマのみ）。
- `/topics/[topic]` … テーマの自治体別比較（表）+ 申請前の確認事項 + 親カテゴリ比較への導線。**index 条件**
  `shouldIndexTopic`（説明文あり・公開3件以上・2自治体以上）を満たさなければ noindex。
- 自治体ページ … 「見落としやすい〇〇区独自の支援」セクション（その区に実在するテーマのチップ → `/topics/[topic]`）。
- 制度詳細 … テーマのチップ + 「他の自治体の同じテーマ」セクション（横断比較への導線）。公式URL・最終確認日・免責は従来どおり常時表示。
- sitemap … index 条件を満たすテーマハブと `/topics` を追加。

## 調査済みテーマ（東京23区）

| テーマ | found | published | review | migration |
|---|---|---|---|---|
| 補聴器購入費助成（hearing-aid） | 23/23 | 21 | 2（千代田=2制度束ね/足立=非.lg.jpホスト） | 20260624140000 |
| 紙おむつ支給・助成（elderly-diapers） | 23/23 | 22 | 1（品川） | 20260624150000 |
| 産後ケア事業（postpartum-care） | 23/23 | 23 | 0 | 20260624160000 |
| 福祉タクシー（welfare-taxi） | 21 found+1 found(未取得)/1 not_found | 21 | 0 | 20260624170000 |
| 産前産後ヘルパー（prenatal-postpartum-helper） | 22 found/1 needs_review | 22 | 0 | 20260624180000 |
| 緊急通報・見守り（emergency-alert）※未適用 | 23/23 | 23 | 0 | 20260624190000（適用済） |
| エアコン助成（air-conditioner-energy） | 23/23 | 23 | 0 | 20260624200000 |

## 未完了範囲（次の拡張候補）

- §4 優先3テーマ（補聴器・紙おむつ・産後ケア）は東京23区で完了。次: 他テーマ（福祉タクシー・産前産後ヘルパー等）・他地域。
- 千代田/足立の `review` を整理し公開へ。
- import v2（CSV `topic_slugs` 列 + トランザクション RPC + coverage 連動 + dry-run）。
- 診断（categories→topics）からの細分類テーマ提示の磨き込み。
- coverage 台帳の管理UI（admin）と更新監視（source fetch）への接続。

## 本番適用手順

前提: `supabase` CLI が本番 `atdhkmniczfxowfkzwjr` に linked。明示 begin/commit なし（CLIがtxnラップ）。

```bash
supabase migration list --linked          # 20260624130000 / 20260624140000 が pending か確認
supabase db push --linked --dry-run       # 適用予定の確認
echo Y | supabase db push --linked        # 適用（topics → pilot の順に冪等 upsert）
```

適用後の確認: テーブル/RLS/件数/代表クエリ（support_topics 15件・support_program_topics・
municipality_topic_coverage 23件、published 制度がテーマ join を持つ）、`get_advisors` で security/performance 警告。
その後にコードを deploy（コードは topics テーブル前提のため、**migration 適用後に push**）。

## ロールバック方針

- migration は冪等 upsert・新規行のみで既存DB行を破壊しない。問題時はデータを論理的に戻す:
  - パイロット制度を非公開化: `update public.support_programs set status='archived' where slug like 'tokyo-%-hearing-aid';`
  - テーマ join/coverage は残しても公開影響なし（公開は published 制度のみ）。
- スキーマを撤去する場合（最終手段）: 逆 migration で
  `drop table if exists public.municipality_topic_coverage, public.support_program_topics, public.support_topics cascade;`
  （`support_program_topics` の cascade で join のみ消え、`support_programs` 本体は残る）。
- コード側は migration 未適用の本番へ deploy しない（PROGRAM_SELECT が support_program_topics を参照するため）。
