/** Aster Support Navi ドメインモデル（MVP）。
 *  seed と将来の Supabase の双方が満たす型。データアクセスはすべて `app/lib/data` 経由。 */

export type SourceConfidence = "high" | "medium" | "low";
export type PublishStatus = "draft" | "review" | "published" | "archived";
export type BenefitType =
  | "cash" // 現金給付（手当・給付金）
  | "subsidy" // 助成（費用の一部補助）
  | "reduction" // 軽減・減免・無償化
  | "service" // 現物・サービス
  | "consultation" // 相談窓口
  | "other";

export interface Prefecture {
  slug: string; // 例: tokyo
  name: string; // 例: 東京都
  nameKana?: string;
  region?: string; // 例: 関東
}

export interface Municipality {
  slug: string; // 例: setagaya（prefecture 内で一意）
  prefectureSlug: string;
  name: string; // 例: 世田谷区
  nameKana?: string;
  officialSiteUrl?: string;
  population?: number;
  /** 自治体ページ冒頭の短い紹介（断定しない）。 */
  intro?: string;
}

export interface Category {
  slug: string; // 例: childcare
  name: string; // 例: 子育て
  description?: string;
  sortOrder: number;
}

export interface LifeEvent {
  slug: string; // 例: birth
  name: string; // 例: 妊娠・出産
  /** 生活者の言葉での説明（「子どもが生まれる・妊娠した」）。 */
  description?: string;
  /** lucide-react アイコン名（components 側でマップ）。 */
  icon?: string;
  sortOrder: number;
  /** この生活イベントで「申請前に共通で確認すること」。 */
  commonChecks?: string[];
}

export interface SupportProgram {
  id: string;
  slug: string; // 例: tokyo-setagaya-child-medical-aid（全体で一意）
  prefectureSlug: string;
  municipalitySlug: string;

  title: string; // 制度名（実在の制度名）
  summary: string; // 断定しない 1-2 文の概要
  plainLanguageSummary?: string; // さらに平易な言い換え

  categorySlugs: string[];
  lifeEventSlugs: string[];
  benefitType: BenefitType;

  /** 対象となる「可能性がある」人。断定しない。 */
  targetPeople: string;
  /** 金額・補助率。全国一律で検証できる場合のみ具体。それ以外は概括＋公式確認。 */
  benefitAmountText?: string;
  applicationDeadlineText?: string;
  /** 期限を構造的に持てる場合（バッジ・並べ替え用）。YYYY-MM-DD。 */
  applicationPeriodEnd?: string;
  applicationMethodText: string;
  requiredDocumentsText?: string;
  onlineApplicationAvailable?: boolean;

  contactName?: string;
  contactPhone?: string;
  contactUrl?: string;

  /** 公式URL（必須・検証済み）。 */
  officialUrl: string;
  /** 出典ページタイトル。 */
  officialSourceTitle?: string;
  /** 最終公式確認日（必須）。YYYY-MM-DD。 */
  lastOfficialCheckedAt: string;

  /** 内部の信頼性ラベル（公開側には直接出さない）。 */
  sourceConfidence: SourceConfidence;
  /** 区ごとに要確認/未確認の項目（公開側で「公式で確認」に変換）。 */
  uncertainFields?: string[];
  /** 制度固有の追加注意（任意）。 */
  disclaimerNote?: string;

  status: PublishStatus;
  updatedAt?: string;
}

/** 公開可能（不変条件 §3）の最低品質を満たすか。 */
export function isPublishable(p: SupportProgram): boolean {
  return (
    p.status === "published" &&
    !!p.officialUrl &&
    !!p.lastOfficialCheckedAt &&
    !!p.targetPeople &&
    (!!p.applicationMethodText || !!p.contactName || !!p.contactUrl)
  );
}

export type DeadlineSource = Pick<
  SupportProgram,
  "applicationDeadlineText" | "applicationPeriodEnd"
>;

/** 「申請期限あり」バッジを出してよいか。
 *  期限テキストが「確認できなかった」「受付終了」等の場合は前向きな期限ではないため出さない。 */
export function hasActiveDeadline(p: DeadlineSource): boolean {
  const t = p.applicationDeadlineText ?? "";
  if (!t && !p.applicationPeriodEnd) return false;
  if (
    /確認できません|記載は確認|受付を終了|受付は終了|すでに受付|終了しました|特に定め|設けられていない/.test(
      t,
    )
  ) {
    return false;
  }
  return true;
}
