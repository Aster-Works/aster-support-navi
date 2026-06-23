/**
 * Pro（相談支援現場向け）の料金プラン。料金表・CTA・将来の課金判定が参照する単一の真実源。
 *
 * 【YMYL / 事業方針】
 * - 公共情報（制度の検索・閲覧・かんたん診断・申請前パックの印刷/PDF）は Free のまま無料。
 *   有料化するのは「支援者の業務ツール（個人名/団体名入りPDF・テンプレート・保存履歴・
 *   地域ダッシュボード・複数ユーザー等）」であって、公共データそのものをペイウォール化しない。
 * - 決済は Stripe Payment Link（MVP）。各プランの決済URLは環境変数で注入し、未設定なら
 *   問い合わせ導線へフォールバックする（バックエンド/Webhook 不要）。
 */

export type PlanId = "free" | "personal" | "pro" | "team";

export interface Plan {
  id: PlanId;
  name: string;
  /** 月額（円）。0 は無料。 */
  priceMonthly: number;
  /** 表示用の対象読者（だれ向けか）。 */
  audience: string;
  /** 一覧での短い説明。 */
  tagline: string;
  features: string[];
  /** 推し（中央で強調）プランか。 */
  highlighted?: boolean;
  /** CTA ラベル。 */
  ctaLabel: string;
  /**
   * Stripe Payment Link の URL を入れる環境変数名（NEXT_PUBLIC_*）。
   * Free は決済不要のため未設定。Next が静的に置換できるよう、参照側は
   * `process.env.NEXT_PUBLIC_...` をリテラルで読む（`paymentLinkFor` 参照）。
   */
  paymentLinkEnv?: string;
}

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    audience: "はじめての方・制度を調べたいすべての人",
    tagline: "制度を探し、診断し、申請前パックを印刷・PDF保存できます。",
    features: [
      "制度の検索・閲覧",
      "かんたん診断（候補の整理）",
      "制度ページ・公式リンク",
      "保存機能",
      "申請前パックの印刷・PDF保存",
    ],
    ctaLabel: "無料ではじめる",
  },
  {
    id: "personal",
    name: "Personal",
    priceMonthly: 2980,
    audience: "FP・個人で支援にあたる方",
    tagline: "面談で渡す資料に、あなたの名前を入れて整えます。",
    features: [
      "相談パックPDF 月10件",
      "個人名入りPDF",
      "主要テンプレート",
      "保存履歴",
    ],
    ctaLabel: "Personal を申し込む",
    paymentLinkEnv: "NEXT_PUBLIC_STRIPE_LINK_PERSONAL",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 9800,
    audience: "子ども食堂・NPO・小規模団体",
    tagline: "団体として相談支援を回すための業務基盤。",
    features: [
      "相談パックPDF 月100件",
      "団体名・ロゴ入りPDF",
      "相談カテゴリテンプレート",
      "地域別ダッシュボード",
      "更新通知",
      "メールサポート",
    ],
    highlighted: true,
    ctaLabel: "Pro を申し込む",
    paymentLinkEnv: "NEXT_PUBLIC_STRIPE_LINK_PRO",
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 29800,
    audience: "中規模団体・複数拠点・学校・相談事業者",
    tagline: "複数の支援者で、地域ぐるみの相談支援を。",
    features: [
      "相談パックPDF 無制限",
      "複数ユーザー",
      "活動地域の優先整備",
      "内部メモ",
      "研修資料",
      "月1回の改善リクエスト",
    ],
    ctaLabel: "Team を申し込む",
    paymentLinkEnv: "NEXT_PUBLIC_STRIPE_LINK_TEAM",
  },
] as const;

/** 月額の表示文字列（例: "¥2,980 / 月"、Free は "¥0"）。 */
export function formatPlanPrice(plan: Pick<Plan, "priceMonthly">): string {
  if (plan.priceMonthly <= 0) return "¥0";
  return `¥${plan.priceMonthly.toLocaleString("ja-JP")} / 月`;
}

/**
 * プランの Stripe Payment Link URL を返す（未設定なら undefined）。
 * NEXT_PUBLIC_* は Next がビルド時に静的置換するため、参照はリテラルで列挙する。
 */
export function paymentLinkFor(planId: PlanId): string | undefined {
  const map: Record<PlanId, string | undefined> = {
    free: undefined,
    personal: process.env.NEXT_PUBLIC_STRIPE_LINK_PERSONAL,
    pro: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO,
    team: process.env.NEXT_PUBLIC_STRIPE_LINK_TEAM,
  };
  const url = map[planId]?.trim();
  return url ? url : undefined;
}

export function getPlan(planId: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === planId);
}
