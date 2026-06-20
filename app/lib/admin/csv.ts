/**
 * 管理画面 CSV 取込の純粋ロジック（パース＋検証）。DB アクセスを含まないので Vitest で網羅できる。
 * 仕様: aster-support-navi-handoff/REVENUE_ROADMAP_TECHNICAL_SPEC.md §16。
 *
 * 必須列:
 *   prefecture_slug, municipality_slug, title, slug, summary,
 *   category_slugs, life_event_slugs, benefit_type, target_people,
 *   application_method_text, official_url, last_official_checked_at,
 *   source_confidence, status
 * category_slugs / life_event_slugs はセル内で `|`（パイプ）区切り。
 */

export const REQUIRED_COLUMNS = [
  "prefecture_slug",
  "municipality_slug",
  "title",
  "slug",
  "summary",
  "category_slugs",
  "life_event_slugs",
  "benefit_type",
  "target_people",
  "application_method_text",
  "official_url",
  "last_official_checked_at",
  "source_confidence",
  "status",
] as const;

const STATUSES = new Set(["draft", "review", "published", "archived"]);
const BENEFIT_TYPES = new Set([
  "cash",
  "subsidy",
  "reduction",
  "service",
  "consultation",
  "other",
]);
const CONFIDENCES = new Set(["high", "medium", "low"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ImportContext {
  categorySlugs: Set<string>;
  lifeEventSlugs: Set<string>;
  /** `${prefectureSlug}/${municipalitySlug}` の集合。 */
  municipalityKeys: Set<string>;
}

export interface ImportRow {
  prefectureSlug: string;
  municipalitySlug: string;
  slug: string;
  title: string;
  summary: string;
  categorySlugs: string[];
  lifeEventSlugs: string[];
  benefitType: string;
  targetPeople: string;
  applicationMethodText: string;
  officialUrl: string;
  lastOfficialCheckedAt: string;
  sourceConfidence: string;
  status: string;
}

export interface RowError {
  line: number; // 1-based（ヘッダを 1 とする）
  messages: string[];
}

export interface ValidateResult {
  valid: ImportRow[];
  errors: RowError[];
  headerError?: string;
}

/** RFC4180 風 CSV パーサ（"" エスケープ・引用内のカンマ/改行に対応）。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let started = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    started = true;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\r") {
      // ignore
    } else if (c === "\n") {
      pushField();
      pushRow();
    } else {
      field += c;
    }
  }
  if (started && (field.length > 0 || row.length > 0)) {
    pushField();
    pushRow();
  }
  // 完全に空の行は除外。
  return rows.filter(
    (r) => !(r.length === 1 && r[0].trim() === ""),
  );
}

function splitList(s: string): string[] {
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** パース済みの行列を検証し、取込可能な行とエラーを返す。 */
export function validateImport(
  rows: string[][],
  ctx: ImportContext,
): ValidateResult {
  if (rows.length === 0) {
    return { valid: [], errors: [], headerError: "CSV が空です。" };
  }
  const headers = rows[0].map((h) => h.trim());
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    idx[h] = i;
  });
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in idx));
  if (missing.length) {
    return {
      valid: [],
      errors: [],
      headerError: `必須列が不足しています: ${missing.join(", ")}`,
    };
  }

  const valid: ImportRow[] = [];
  const errors: RowError[] = [];
  const seenSlugs = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (k: string) => (cells[idx[k]] ?? "").trim();
    const msgs: string[] = [];

    const slug = get("slug");
    const cats = splitList(get("category_slugs"));
    const events = splitList(get("life_event_slugs"));
    const status = get("status");
    const muniKey = `${get("prefecture_slug")}/${get("municipality_slug")}`;

    if (!slug) msgs.push("slug が空です");
    else if (seenSlugs.has(slug)) msgs.push(`slug が重複しています: ${slug}`);
    if (!get("title")) msgs.push("title が空です");
    if (!get("summary")) msgs.push("summary が空です");
    if (!get("target_people")) msgs.push("target_people が空です");
    if (!get("application_method_text"))
      msgs.push("application_method_text が空です");
    if (!get("official_url")) msgs.push("official_url が空です");
    if (!DATE_RE.test(get("last_official_checked_at")))
      msgs.push("last_official_checked_at は YYYY-MM-DD 形式が必要です");
    if (!STATUSES.has(status)) msgs.push(`status が不正です: ${status}`);
    if (!BENEFIT_TYPES.has(get("benefit_type")))
      msgs.push(`benefit_type が不正です: ${get("benefit_type")}`);
    if (!CONFIDENCES.has(get("source_confidence")))
      msgs.push(`source_confidence が不正です: ${get("source_confidence")}`);
    if (!ctx.municipalityKeys.has(muniKey))
      msgs.push(`自治体マスタに存在しません: ${muniKey}`);
    for (const c of cats)
      if (!ctx.categorySlugs.has(c)) msgs.push(`未定義のカテゴリ: ${c}`);
    for (const e of events)
      if (!ctx.lifeEventSlugs.has(e)) msgs.push(`未定義の生活イベント: ${e}`);

    // 公開品質ゲート（published にする行のみ）。
    if (status === "published") {
      if (cats.length === 0) msgs.push("published にはカテゴリが必要です");
      if (events.length === 0)
        msgs.push("published には生活イベントが必要です");
    }

    if (slug) seenSlugs.add(slug);

    if (msgs.length) {
      errors.push({ line: r + 1, messages: msgs });
    } else {
      valid.push({
        prefectureSlug: get("prefecture_slug"),
        municipalitySlug: get("municipality_slug"),
        slug,
        title: get("title"),
        summary: get("summary"),
        categorySlugs: cats,
        lifeEventSlugs: events,
        benefitType: get("benefit_type"),
        targetPeople: get("target_people"),
        applicationMethodText: get("application_method_text"),
        officialUrl: get("official_url"),
        lastOfficialCheckedAt: get("last_official_checked_at"),
        sourceConfidence: get("source_confidence"),
        status,
      });
    }
  }

  return { valid, errors };
}
