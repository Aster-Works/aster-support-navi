import { hasActiveDeadline, type SupportProgram } from "@/app/lib/data/types";

/** 申請準備の進捗ステータス（保存リストのみ・機微情報ではない）。 */
export type SavedStatus =
  | "saved" // 保存しただけ
  | "checking" // 公式で確認中
  | "applied" // 申請した
  | "done" // 完了
  | "not_applicable"; // 対象外だった

export const SAVED_STATUS_LABEL: Record<SavedStatus, string> = {
  saved: "保存済み",
  checking: "確認中",
  applied: "申請した",
  done: "完了",
  not_applicable: "対象外",
};

export const SAVED_STATUS_ORDER: SavedStatus[] = [
  "saved",
  "checking",
  "applied",
  "done",
  "not_applicable",
];

/** 保存リストの1件（localStorage に持つ非正規スナップショット）。 */
export interface SavedItem {
  slug: string;
  title: string;
  municipalitySlug: string;
  municipalityName: string;
  categoryName?: string;
  summary: string;
  online: boolean;
  hasDeadline: boolean;
  lastOfficialCheckedAt: string;
  savedAt: string; // ISO
  /** 申請準備の進捗（既定 saved）。スナップショットで端末間同期される。 */
  status?: SavedStatus;
}

export const SAVED_STORAGE_KEY = "asn:saved";

export type SavedProgramSource = Pick<
  SupportProgram,
  | "slug"
  | "title"
  | "municipalitySlug"
  | "summary"
  | "onlineApplicationAvailable"
  | "applicationDeadlineText"
  | "applicationPeriodEnd"
  | "lastOfficialCheckedAt"
>;

/** 制度から保存スナップショットを作る（純関数・Vitest 対象）。savedAt は呼び出し側が渡す。 */
export function toSavedItem(
  p: SavedProgramSource,
  opts: { municipalityName: string; categoryName?: string; savedAt: string },
): SavedItem {
  return {
    slug: p.slug,
    title: p.title,
    municipalitySlug: p.municipalitySlug,
    municipalityName: opts.municipalityName,
    categoryName: opts.categoryName,
    summary: p.summary,
    online: !!p.onlineApplicationAvailable,
    hasDeadline: hasActiveDeadline(p),
    lastOfficialCheckedAt: p.lastOfficialCheckedAt,
    savedAt: opts.savedAt,
  };
}

export function isInSaved(items: SavedItem[], slug: string): boolean {
  return items.some((i) => i.slug === slug);
}

/** 保存/解除をトグルした新しい配列を返す（純関数）。新規は先頭に積む。 */
export function toggleSavedList(items: SavedItem[], item: SavedItem): SavedItem[] {
  return isInSaved(items, item.slug)
    ? items.filter((i) => i.slug !== item.slug)
    : [item, ...items];
}

export function removeFromSaved(items: SavedItem[], slug: string): SavedItem[] {
  return items.filter((i) => i.slug !== slug);
}

/** 保存項目のステータスを更新した新しい配列を返す（純関数）。 */
export function setSavedStatus(
  items: SavedItem[],
  slug: string,
  status: SavedStatus,
): SavedItem[] {
  return items.map((i) => (i.slug === slug ? { ...i, status } : i));
}

/** 進捗ステータス別の件数（保存ページのサマリ用）。 */
export function savedStatusCounts(
  items: SavedItem[],
): Record<SavedStatus, number> {
  const counts = {
    saved: 0,
    checking: 0,
    applied: 0,
    done: 0,
    not_applicable: 0,
  } as Record<SavedStatus, number>;
  for (const i of items) counts[i.status ?? "saved"] += 1;
  return counts;
}

/** 最終公式確認日が古い（91日以上）か。保存リストの「情報が古い可能性」表示用。 */
export function isStale(lastOfficialCheckedAt: string, todayIso: string): boolean {
  const days =
    (Date.parse(todayIso) - Date.parse(lastOfficialCheckedAt)) / 86_400_000;
  return !Number.isNaN(days) && days > 90;
}

// ---- localStorage 薄ラッパ（クライアントのみ） ----------------------------
export function loadSaved(): SavedItem[] {
  try {
    const raw = window.localStorage.getItem(SAVED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedItem[]) : [];
  } catch {
    return [];
  }
}

/** 保存リスト変更を全コンポーネント・同期プロバイダへ通知するイベント名。 */
export const SAVED_CHANGED_EVENT = "asn:saved-changed";

export function persistSaved(items: SavedItem[]): void {
  try {
    window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(SAVED_CHANGED_EVENT));
  } catch {
    /* localStorage 利用不可でも致命的ではない */
  }
}
