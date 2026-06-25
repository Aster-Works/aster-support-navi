# 発見クローラ（Discovery Crawler）運用ガイド — Slice G

自治体公式サイトを**1日1回**自動巡回し、Zaim／母子モ／各種レジストリ／公式APIに綺麗に入っていない
**自治体独自の細かい支援**（紙おむつ支給・補聴器助成・タクシー券・配食・産後ケア・就学援助・
ひとり親支援・障害者福祉・高齢者福祉 等）を発見・更新管理する仕組みです。

抽出された情報は**すぐ公開されません**。管理者が
[`/admin/crawler/review`](https://astersupport.com/admin/crawler/review) で確認・編集・承認したものだけが
公開 `support_programs` に反映されます。

## 全体像

```
crawler_sources 登録
   ↓（日次 cron / 手動実行）
robots.txt 確認 → seed/sitemap/リンクBFS（深度・件数・締切で制限）
   ↓
ETag / Last-Modified / 本文SHA-256 で変更検知（変わっていなければAIを呼ばない）
   ↓ 変更ページだけ
本文抽出（cheerioでnav/footer/script除去）→ Claude Haiku 4.5 で構造化抽出（zod検証＋禁止表現ガード）
   ↓
既存 support_programs と差分比較（new / updated / unchanged / possibly_removed）
   ↓
support_program_candidates に保存（pending）
   ↓ 管理者が承認
support_programs へ反映 ＋ support_revisions に履歴
```

## テーブル

| テーブル | 役割 |
|---|---|
| `crawler_settings` | 全体ON/OFF・上限値（key/value） |
| `crawler_sources` | 自治体クロール対象（seed/許可ドメイン/include・exclude/カテゴリヒント/稼働状態/自動停止） |
| `crawled_documents` | 取得ページの生データ・正規化本文・ハッシュ（変更検知の土台） |
| `support_program_candidates` | AI抽出した候補（公開前のレビュー対象） |
| `crawler_runs` | 実行ログ |
| `support_revisions` | （既存を再利用）承認時の改訂履歴。`candidate_id`/`diff_summary`/`source_url` を追加 |

すべて RLS 有効・公開ポリシー無し・`private.is_admin()` の管理者のみ read/write。
クロール本体は `service_role`（RLSバイパス）で書き込みます。

## 環境変数

| 変数 | 用途 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | クロール結果の書き込み（server-only・check-sources と共用） |
| `CRON_SECRET` | Vercel Cron の Authorization 検証（共用） |
| `ANTHROPIC_API_KEY` | Claude Haiku 4.5 での構造化抽出。**未設定なら AI 抽出は安全に no-op**（クロール・変更検知のみ動作） |

## 稼働・停止（管理画面）

[`/admin/crawler`](https://astersupport.com/admin/crawler) で制御します。

- **クローラ全体 ON/OFF** … `crawler_settings.crawler_enabled`。false の間、日次 cron は即終了（run は `skipped: admin_disabled`）。
- **AI抽出 ON/OFF** … `ai_extraction_enabled`。false ならクロール・変更検知だけ行い、AI は呼ばない。
- **source 単位 ON/OFF** … `crawler_sources.is_active`。停止時は `paused_reason` を残す。
- **手動実行** … 全体／source 単位。全体スイッチが停止中でも手動実行は走る（`force=true`）。
- **上限値** … 1実行あたり source 数、1source あたり URL 数、最大深度、同一ドメイン最小間隔(ms)、自動停止する連続エラー回数。
- **実行ログ／最終巡回日時／成功・失敗** … 一覧表示。

### 自動停止（安全制御）

source 単位で **連続して重大エラー**（ドメインに1ページも到達できない等）が
`auto_pause_error_threshold`（既定3）回続くと、その source を自動で `is_active=false`・
`paused_reason=auto_paused: …` にします。理由は管理画面に表示されます。再開すると連続エラー数はリセットされます。

403 / 429 / robots disallow は回避しません。403/429 はそのまま失敗として記録し、robots で禁止された
パスは取得しません（`crawled_documents.crawl_status=blocked`）。

## 絶対方針（実装済み）

1. 対象は自治体・公的機関の公開ページのみ（許可ドメイン + 公的ホスト判定 `isOfficialHost`）。
2. robots.txt を尊重（最長一致 Allow/Disallow）。
3. 403/401/CAPTCHA/bot対策を回避しない。
4. 非公開API のリバースエンジニアリングをしない（公開HTMLのみ）。
5. 高速・大量アクセスをしない（深度・件数上限 + wall-clock 締切で1実行を打ち切り、翌日に未巡回sourceから再開）。
6. ドメインごとの rate limit（`domain_min_interval_ms`、既定2秒間隔）。
7. 透明な User-Agent: `AsterSupportNaviCrawler/1.0 (+https://astersupport.com/about)`。
8. 本番データを AI 抽出で直接上書きしない（必ず候補キュー経由）。
9. すべての変更は review queue に保存し、承認後に公開。
10. 公式URL・取得日時・最終確認日時・抽出元引用（source_quote）・変更履歴を保持。

### SSRF対策

`app/lib/crawler/ssrf.ts`：http/https 以外を拒否、localhost/*.local/metadata を拒否、private/loopback/
link-local IP を**リテラル + DNS 解決の両方**で拒否。リダイレクト先も毎ホップ再検証。

## 承認フロー

1. `/admin/crawler/review` で pending 候補を confidence 低い順に確認。
2. 変更種別・自治体・カテゴリでフィルタ、risk_flags / 差分 / source_quote / 抽出元URL を確認。
3. 必要なら各フィールドを編集。
4. **承認して反映** → 既定は `support_programs` に **draft** で作成（`updated` は `old_program_id` を更新）。
   「承認と同時に公開」を選ぶと published（**公開品質ゲート**＝公式URL・最終確認日・対象者・申請方法/問い合わせ先が必要。DBトリガで最終強制）。
5. 承認時に `support_revisions` に履歴（`candidate_id`/`diff_summary`/`source_url`）を残し、公開ページを即時 revalidate。
6. **却下** / **要追加情報** も選べる。

> 承認には対象の `crawler_source` に**自治体（municipality）の紐付け**が必要です（slug 生成・公開ページ反映を決定化するため）。
> seed 6自治体（世田谷区・渋谷区・港区・杉並区・横浜市・川崎市）は投入時にマスタへ自動紐付け済み。

## ローカル / 手動テスト

```bash
# 単体テスト（純関数 + オーケストレータをフェイク依存で検証）
npm test -- crawler

# 手動実行（要 CRON_SECRET）。dry ではなく実巡回なので少量から。
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3040/api/cron/crawl-support-sources?force=1"
```

cron は `vercel.json` で日次 `0 18 * * *`（UTC）= **JST 03:00**。

## コード構成（テスト容易な関数分離）

```
app/lib/crawler/
  types.ts      … 共有型 + zod スキーマ（依存は zod のみ・クライアント安全）
  url.ts        … URL正規化・ドメイン許可・パターン照合（純関数）
  robots.ts     … robots.txt パーサ + 最長一致判定（純関数）
  normalize.ts  … HTML→正規化本文+リンク抽出（cheerio）
  hash.ts       … SHA-256
  ssrf.ts       … SSRF対策（private IP / DNS 検査）
  fetcher.ts    … 条件付きGET・リダイレクト再検証・サイズ/timeout上限
  extract.ts    … AI抽出（プロバイダ非依存IF + Claude実装 + 禁止表現ガード）
  diff.ts       … 候補 vs 既存公開制度の差分判定（純関数）
  pipeline.ts   … オーケストレータ（CrawlerDeps 注入で純粋寄り）
  db.ts         … CrawlerDb の Supabase 実装（service_role 専用）
  service.ts    … 本物の依存配線（cron / 手動実行 API が使う）
app/api/cron/crawl-support-sources/route.ts … 日次 cron
app/api/admin/crawler/run/route.ts          … 管理者手動実行（Bearer認可）
app/lib/admin/crawler.ts                    … 管理画面データアクセス（RLS）+ 承認→反映
app/admin/crawler/(page|review/page).tsx    … 管理UI
```

## 今後の拡張（MVP後）

PDF / CSV / Excel のテキスト化、sitemap.xml の深掘り、削除検出（possibly_removed）の自動候補化、
より高度な類似度判定、Upstash への rate limit 移行、全国対象への拡大。
