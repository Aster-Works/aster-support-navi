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

/** 上限（管理者の手元でも巨大入力でブラウザを固めないため）。 */
export const MAX_CSV_BYTES = 5_000_000;
export const MAX_CSV_ROWS = 5000;

/** YYYY-MM-DD の「実在する日付」か（2026-02-30 や 2026-13-45 を弾く）。 */
export function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export interface ImportContext {
  categorySlugs: Set<string>;
  lifeEventSlugs: Set<string>;
  /** `${prefectureSlug}/${municipalitySlug}` の集合。 */
  municipalityKeys: Set<string>;
  /** 既存制度の slug（upsert で更新になる行の判定用・任意）。 */
  existingSlugs?: Set<string>;
  /** 既存で status='published' の slug（公開中の上書き警告用・任意）。 */
  publishedSlugs?: Set<string>;
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
  /** 既存 slug への upsert（= 更新・上書き）か。 */
  isUpdate: boolean;
  /** 公開中（published）の制度を上書きするか（要注意）。 */
  overwritesPublished: boolean;
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
  if (text.length > MAX_CSV_BYTES) {
    throw new Error("CSV が大きすぎます（最大 5MB）。分割してください。");
  }
  // BOM（Excel 等が付与）を除去。
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
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
  if (rows.length - 1 > MAX_CSV_ROWS) {
    return {
      valid: [],
      errors: [],
      headerError: `行が多すぎます（最大 ${MAX_CSV_ROWS} 行）。分割してください。`,
    };
  }

  const valid: ImportRow[] = [];
  const errors: RowError[] = [];
  const seenSlugs = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (k: string) => (cells[idx[k]] ?? "").trim();
    const msgs: string[] = [];

    // 列数がヘッダと合わない（引用閉じ忘れ・カンマ過不足）を検出。
    if (cells.length !== headers.length) {
      msgs.push(
        `列数が不正です（ヘッダ ${headers.length} 列に対し ${cells.length} 列。引用符の閉じ忘れ等）`,
      );
    }

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
    if (!isRealDate(get("last_official_checked_at")))
      msgs.push(
        "last_official_checked_at は実在する YYYY-MM-DD が必要です",
      );
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
        isUpdate: ctx.existingSlugs?.has(slug) ?? false,
        overwritesPublished: ctx.publishedSlugs?.has(slug) ?? false,
      });
    }
  }

  return { valid, errors };
}
