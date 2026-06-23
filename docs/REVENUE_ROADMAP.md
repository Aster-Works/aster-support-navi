# Aster Support Navi — 収益化ロードマップ（90日）

作成: 2026-06-23 / 出典: ChatGPT 90日提案を現状コードベースへマッピングしたもの。
目標: SEOで信頼を作り、手動営業で支援者向け Pro 契約を取る形で **月数万円→数十万円** の MRR。

## 収益モデルの原則（YMYL と整合）

- **公共情報はペイウォール化しない。** 制度の検索・閲覧・かんたん診断・申請前パックの
  印刷/PDF保存は Free のまま無料（`PrepPacket` の方針）。
- 課金するのは「**支援する人の業務ツール**」: 名前/ロゴ入りPDF・テンプレート・保存履歴・
  地域別ダッシュボード・複数ユーザー・内部メモ等。公共データそのものには課金しない。
- 決済は **Stripe Payment Link**（MVP）。1〜3社の手動営業フェーズではこれで十分。
  契約が増えたら Checkout Session + Webhook + 購読状態同期へ昇格する（後述 Slice G）。

## 料金プラン（確定・`app/lib/pro/plans.ts` が単一の真実源）

| プラン | 月額 | 対象 | 主な内容 |
|---|---|---|---|
| Free | ¥0 | だれでも | 検索・診断・制度ページ・保存・印刷/PDF |
| Personal | ¥2,980 | 牧師・FP・個人支援者 | PDF月10件・個人名入り・主要テンプレ・保存履歴 |
| Pro（おすすめ） | ¥9,800 | 子ども食堂・教会・NPO・小規模団体 | PDF月100件・団体名/ロゴ入り・カテゴリテンプレ・地域ダッシュボード・更新通知・メールサポート |
| Team | ¥29,800 | 中規模団体・複数拠点・学校・相談事業者 | PDF無制限・複数ユーザー・地域優先整備・内部メモ・研修資料・月1改善リクエスト |

---

## Phase 0（0〜14日）収益導線 — ✅ 本ターンで実装完了

目的は売上ではなく **Proページのクリック率・問い合わせ率を測る**こと。

- [x] **Pro料金表**: `app/lib/pro/plans.ts`（4プラン）＋ `app/pro/PlansTable.tsx`、`/pro#pricing` に掲示。
- [x] **Stripe決済導線**: Payment Link 方式。各プランCTAは `NEXT_PUBLIC_STRIPE_LINK_*` の決済URLへ遷移。
      未設定時は問い合わせ（`#contact`）へフォールバック。クリックは `stripe_click`（plan付き）で計測。
- [x] **サンプル相談パック×3**: `/pro/samples`・`/pro/samples/{single-parent|livelihood-housing|birth-childcare}`。
      実在の公開制度で構成し、印刷・PDF保存可能。SEO 資産兼営業コラテラル（sitemap 登録・index 可）。
- [x] **トップページに支援者向け導線**: ホーム下部に「支援する人へ」バンド → `/pro`。
- [x] **診断結果に Pro 導線**: `/check/result` の申請前パック直下に「支援者・相談員の方へ」→ `/pro`。
- [x] **GA4イベント計測**（`src/lib/analytics.ts`）:
      `diagnosis_start` / `diagnosis_complete` / `official_link_click` / `checklist_printed`(PDF印刷) /
      `pro_view`(Proページ閲覧) / `pro_interest_click`(問い合わせ・導線) / `stripe_click`(申し込みCTA) /
      `sample_pack_view`。いずれも非PIIの短い列挙値のみ送信。

### Jimi の残作業（コード外・Stripe を実際に動かすため）

1. **Stripe アカウント**（Aster Works 事業用、`asterworks3322@gmail.com`）で各プランの
   **Payment Link** を作成（Personal ¥2,980 / Pro ¥9,800 / Team ¥29,800、いずれも月額サブスク）。
2. Vercel（astersupport プロジェクト・Production）に環境変数を設定:
   - `NEXT_PUBLIC_STRIPE_LINK_PERSONAL`
   - `NEXT_PUBLIC_STRIPE_LINK_PRO`
   - `NEXT_PUBLIC_STRIPE_LINK_TEAM`
   （`NEXT_PUBLIC_*` はビルド時に静的置換されるため、設定後に再デプロイが必要。未設定でも安全に動作＝問い合わせへ誘導）。
3. **GA4** で Phase 0 の各イベントを「主要なイベント（コンバージョン）」に登録し、
   `pro_view → stripe_click` のファネルを観測。拡張計測はオフのまま（クエリにPIIが乗るため）。

### Phase 0 の計測目標（クリック率・問い合わせ率）

- `pro_view`（Pro閲覧）が計測できている
- `pro_view → stripe_click` のCVRを観測（目標 1〜3%）
- `pro_interest_click`（問い合わせ・導線クリック）が発生している

---

## Phase 1（15〜30日）ひとり親カテゴリ集中強化 — ✅ 主要分を実装

最初の想定顧客を「ひとり親支援に関わる人」に絞る。

- [x] **ひとり親ガイド 10本**（`app/data/guides.ts`）。研究→敵対検証WFで作成し、全文を国の公式
      （こども家庭庁/厚労省/文科省/国税庁/年金機構/法務省/国交省/内閣府）に紐付け、出典URLは全件 HTTP 200・
      `.go.jp`/`.lg.jp` 準拠、禁止表現ゼロ（`safety.test` 緑）。テーマ＝児童扶養手当 / マル親医療費助成 /
      高等職業訓練促進給付金 / 自立支援教育訓練給付金 / 母子父子寡婦福祉資金貸付 / 養育費 / 就学援助・高校生等奨学給付金 /
      住まい支援 / ひとり親控除 / 遺族年金。
- [x] **東京23区・政令市 × ひとり親まとめ**＝既存 `/compare/single-parent` が全自治体横断で集約（新規ページ不要と判断）。
- [x] **ひとり親向け申請前チェックリスト**＝`/pro/samples/single-parent`（既存・印刷PDF）。
- [x] **内部リンク網**（ガイド詳細）: 同じ生活イベントの「関連ガイド」相互リンク（話題クラスタ）＋「自治体で比べる」
      （→ `/compare/single-parent`）＋既存の関連制度・診断CTA。ガイド↔比較↔制度↔診断↔サンプルの回遊。
- [ ] （任意・次）各ガイド末尾から `/pro/samples/single-parent`（支援者向け見本）への導線、ガイド一覧のひとり親グルーピング。

## Phase 2（31〜60日）住まい・生活困窮カテゴリ強化 — ⬜

- [ ] 「家賃が払えないときの支援」ガイド／住居確保給付金の申請準備ガイド／自立相談支援機関とは。
- [ ] 23区・政令市 × 住居確保給付金 のまとめ。
- [ ] 支援者向け「生活困窮相談パック」サンプル（`/pro/samples/livelihood-housing` 既存）。
- [ ] **手動営業の開始**: 教会・子ども食堂・地域支援団体へ。営業文の方向性 =
      「相談者が使える可能性のある制度を、公式リンク・確認事項・必要書類つきで1枚に整理する小さなツール。
      申請代行や受給判定ではなく、相談後の次の一歩を整理する用途」。

## Phase 3（61〜90日）有料化テスト — ⬜

- [ ] 無料トライアル申込 10件 / 有料転換 3件 / MRR ¥1〜3万。
- [ ] 取れない場合は機能不足ではなく **ターゲット・訴求・営業先のズレ**を疑う。

## Slice G（将来）課金の自動化 — ⬜（契約が増えてから）

Payment Link で手動運用が回らなくなったら:
- [ ] `stripe` パッケージ導入・Checkout Session API・Webhook。
- [ ] `organizations` に `stripe_customer_id` / `stripe_subscription_id` / `subscription_status` を追加し、
      Webhook で plan を自動同期。プラン別の機能ゲート（PDF生成上限・ロゴ差込・複数ユーザー）。

---

## 最重要改善リスト（ChatGPT 提案・優先順）

1. ✅ Proページに価格と決済導線（Payment Link）
2. ✅ 相談パックPDFサンプル×3
3. ✅ トップに支援者向け導線
4. ✅ 診断完了画面に Pro 導線
5. ⬜ ひとり親カテゴリのSEO記事拡充（Phase 1）
6. ⬜ 家賃・住まいカテゴリを第2の柱（Phase 2）
7. ⬜ 制度ページ→“悩みページ”からの内部リンク
8. ⬜ FAQ構造化データ・パンくず・Article schema（FAQ/パンくずは実装済。サンプルにArticle/HowTo検討）
9. ✅/⬜ 各ページに最終確認日・公式出典・免責（公開制度面は実装済。継続徹底）
10. ⬜ 教会・子ども食堂・NPO・FP・行政書士へ30件手動営業
