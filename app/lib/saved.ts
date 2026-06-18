import { hasActiveDeadline, type SupportProgram } from "@/app/lib/data/types";

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
}

export const SAVED_STORAGE_KEY = "asn:saved";

/** 制度から保存スナップショットを作る（純関数・Vitest 対象）。savedAt は呼び出し側が渡す。 */
export function toSavedItem(
  p: SupportProgram,
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

export function persistSaved(items: SavedItem[]): void {
  try {
    window.localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* localStorage 利用不可でも致命的ではない */
  }
}
