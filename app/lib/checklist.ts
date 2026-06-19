import { hasActiveDeadline, type SupportProgram } from "@/app/lib/data/types";

export interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
}

export type ChecklistProgramSource = Pick<
  SupportProgram,
  | "title"
  | "targetPeople"
  | "applicationDeadlineText"
  | "requiredDocumentsText"
  | "applicationMethodText"
  | "onlineApplicationAvailable"
  | "contactName"
  | "contactPhone"
  | "contactUrl"
>;

/** 制度から申請前チェックリストを組み立てる（純関数・Vitest 対象）。 */
export function buildChecklist(p: ChecklistProgramSource): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  items.push({
    id: "eligibility",
    label: "公式ページで対象条件を確認する",
    detail: p.targetPeople,
  });
  if (p.applicationDeadlineText) {
    items.push({
      id: "deadline",
      label: hasActiveDeadline(p)
        ? "申請期限・受付期間を確認する"
        : "受付状況（終了・移行の有無）を確認する",
      detail: p.applicationDeadlineText,
    });
  }
  if (p.requiredDocumentsText) {
    items.push({
      id: "documents",
      label: "必要書類を準備する",
      detail: p.requiredDocumentsText,
    });
  }
  items.push({
    id: "method",
    label: "申請方法（窓口・郵送・オンライン）を確認する",
    detail: p.applicationMethodText,
  });
  if (p.onlineApplicationAvailable) {
    items.push({
      id: "online",
      label: "オンライン申請の可否・手順を確認する",
    });
  }
  if (p.contactName || p.contactPhone || p.contactUrl) {
    items.push({
      id: "contact",
      label: "担当窓口に問い合わせる",
      detail: [p.contactName, p.contactPhone].filter(Boolean).join(" / "),
    });
  }
  items.push({
    id: "record",
    label: "申請後の控え（受付番号・提出書類の写し）を保存する",
  });
  return items;
}

/** 役所への問い合わせ文テンプレートを生成する（純関数・Vitest 対象）。
 *  断定せず、確認のための質問にとどめる。 */
export function buildInquiryText(
  p: ChecklistProgramSource,
  municipalityName: string,
): string {
  return [
    `お世話になっております。${municipalityName}に住んでいる者です。`,
    `「${p.title}」について、私の世帯が対象となる可能性があるかを確認したく、ご連絡しました。`,
    `お手数ですが、次の点を教えていただけますでしょうか。`,
    `・対象となる条件`,
    `・申請の期限／受付期間`,
    `・申請に必要な書類`,
    `・申請の方法（窓口・郵送・オンラインの可否）`,
    `どうぞよろしくお願いいたします。`,
  ].join("\n");
}
