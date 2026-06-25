/**
 * 抽出結果と既存公開制度（support_programs）の差分比較（純関数・Vitest 対象）。
 *
 * 判定:
 * - 同一制度が無ければ new
 * - 同一制度があり重要フィールドに差分があれば updated（human_review_required）
 * - 同一制度があり差分が無ければ unchanged
 * 照合キー: official_url 完全一致 → タイトル類似（同一自治体内）。
 */
import type { ExtractedProgram, ExistingProgram, ChangeType } from "./types";

export interface DiffResult {
  changeType: ChangeType;
  oldProgramId: string | null;
  diffSummary: string | null;
  /** 重要フィールドの変更があり人手レビュー必須か。 */
  importantChange: boolean;
  changedFields: string[];
}

/** 重要変更フィールド（抽出側キー → 既存側キー）。 */
const IMPORTANT_FIELDS: { ex: keyof ExtractedProgram; cur: keyof ExistingProgram; label: string }[] = [
  { ex: "title", cur: "title", label: "制度名" },
  { ex: "target_people", cur: "target_people", label: "対象者" },
  { ex: "amount", cur: "benefit_amount_text", label: "金額" },
  { ex: "application_method", cur: "application_method_text", label: "申請方法" },
  { ex: "required_documents", cur: "required_documents_text", label: "必要書類" },
  { ex: "deadline", cur: "application_deadline_text", label: "期限" },
  { ex: "contact_phone", cur: "contact_phone", label: "問い合わせ電話" },
  { ex: "official_url", cur: "official_url", label: "公式URL" },
];

/** 比較用に文字列を正規化（NFKC・空白除去・小文字）。 */
export function normalizeForCompare(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[、。・:：/-]/g, "")
    .toLowerCase()
    .trim();
}

/** タイトル類似（正規化後の一致 or 一方が他方を含む & 長さ近接）。 */
export function titleSimilar(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  return (
    shorter.length >= 4 &&
    longer.includes(shorter) &&
    shorter.length / longer.length >= 0.6
  );
}

function findMatch(
  ex: ExtractedProgram,
  existing: ExistingProgram[],
): ExistingProgram | null {
  const exUrl = normalizeForCompare(ex.official_url);
  const byUrl = existing.find((e) => exUrl && normalizeForCompare(e.official_url) === exUrl);
  if (byUrl) return byUrl;
  const byTitle = existing.find((e) => titleSimilar(ex.title, e.title));
  return byTitle ?? null;
}

export function classifyChange(
  ex: ExtractedProgram,
  existingForMunicipality: ExistingProgram[],
): DiffResult {
  const match = findMatch(ex, existingForMunicipality);
  if (!match) {
    return {
      changeType: "new",
      oldProgramId: null,
      diffSummary: "新規候補（既存の公開制度に一致なし）",
      importantChange: false,
      changedFields: [],
    };
  }

  const changed: string[] = [];
  for (const f of IMPORTANT_FIELDS) {
    const exVal = ex[f.ex];
    const curVal = match[f.cur];
    // 抽出側が null（本文に無い）は「変更」と見なさない（情報不足）。
    if (exVal == null || exVal === "") continue;
    if (normalizeForCompare(String(exVal)) !== normalizeForCompare(curVal)) {
      changed.push(f.label);
    }
  }

  if (changed.length === 0) {
    return {
      changeType: "unchanged",
      oldProgramId: match.id,
      diffSummary: null,
      importantChange: false,
      changedFields: [],
    };
  }
  return {
    changeType: "updated",
    oldProgramId: match.id,
    diffSummary: `重要フィールドの差分: ${changed.join(" / ")}`,
    importantChange: true,
    changedFields: changed,
  };
}
