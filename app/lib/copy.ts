/**
 * 文言ガードレール（YMYL・不変条件 §1）
 * 断定・誇大表現を禁止し、推奨表現に一元化する。
 * `FORBIDDEN_PHRASES` は Vitest / Playwright で「描画テキストに含まれないこと」を検証する。
 */

/** 画面・seed・コピーのどこにも出してはいけない断定/誇大/代行表現。
 *  断定の「主張」を禁止する。免責の「否定」（例「申請の代行は行いません」）は substring に当たらない。 */
export const FORBIDDEN_PHRASES: readonly string[] = [
  // 断定・誇大
  "必ずもらえる",
  "必ずもらえます",
  "必ず受給できます",
  "あなたは対象です",
  "あなたは必ず対象",
  "確実に得する",
  "確実にもらえる",
  "確実に受け取れます",
  "申請すれば受給できます",
  "申請すれば必ず",
  "100%もらえる",
  "100%受給可能",
  "誰でももらえる",
  "誰でも給付金がもらえます",
  "審査に通ります",
  "不支給になることはありません",
  // 受給可否の保証
  "受給を保証します",
  "受給を保証",
  "国があなたに支払う義務があります",
  // 申請代行・行政書士等の独占業務への誤認（“主張”形のみ。否定形は対象外）
  "当サイトが代わりに申請します",
  "申請を代行します",
  "あなたの代理で手続きします",
  "弊社が交渉します",
  "このボタンを押せば受給手続きが完了します",
  // 煽り
  "今すぐ申請しないと損します",
] as const;

/** テキストに禁止表現が含まれていれば、その配列を返す（空配列＝適合）。 */
export function findForbiddenPhrases(text: string): string[] {
  return FORBIDDEN_PHRASES.filter((p) => text.includes(p));
}

/** 推奨表現（画面で繰り返し使う定型句）。 */
export const COPY = {
  targetMaybe: "対象となる可能性があります",
  confirmOfficial: "公式ページで確認してください",
  beforeApply: "申請前に確認すること",
  lastCheckedLabel: "最終確認日",
  officialPage: "公式ページで確認する",
  candidateNote: "確認すべき制度の候補です（確定した受給判定ではありません）",
  brandPromise: "くらしの支援制度を、見落とさない。",
  tagline: "住所と生活状況から、確認すべき支援制度と次にやることを整理します。",
} as const;

/** 短い免責（フッター・カード下部）。 */
export const DISCLAIMER_SHORT =
  "本サービスは支援制度の確認を助ける情報提供です。対象可否・金額・期限・必要書類は、必ず自治体の公式ページで確認してください。申請の代行は行いません。";

/** 制度詳細ページ用の免責。 */
export const DISCLAIMER_PROGRAM =
  "このページは支援制度を確認するための整理情報です。実際の対象可否・支援内容・金額・申請期限・必要書類は、年度や世帯状況により異なる場合があります。申請の前に、必ず自治体の公式ページまたは担当窓口で最新情報を確認してください。Aster Support Navi は申請の代行や受給可否の判定を行いません。";

/** seed の uncertainFields（内部表現）を、公開ページ向けの自然な文へ整える。 */
const FIELD_LABELS: Record<string, string> = {
  benefitAmountText: "金額・補助率",
  applicationDeadlineText: "申請期限",
  requiredDocumentsText: "必要書類",
  targetPeople: "対象条件",
  applicationMethodText: "申請方法",
  onlineApplicationAvailable: "オンライン申請の可否",
};

export function humanizeUncertain(s: string): string {
  const m = /^([A-Za-z]+)\s*[（(](.+)[）)]\s*$/.exec(s);
  if (m) {
    const label = FIELD_LABELS[m[1]] ?? m[1];
    return `${label}：${m[2]}`;
  }
  return s;
}

/** 診断結果ページ用の免責。 */
export const DISCLAIMER_DIAGNOSIS =
  "この結果は、入力内容から「確認するとよい制度の候補」を機械的に並べたものです。受給できることを保証する判定ではありません。各制度の対象条件・期限・手続きは、必ず自治体の公式ページで確認してください。";
