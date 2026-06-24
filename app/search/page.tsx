import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getPrograms,
  getActiveMunicipalities,
  getCategories,
  getLifeEvents,
  getMunicipalities,
  getPrefectures,
  type ProgramFilters,
} from "@/app/lib/data";
import { buildMetadata } from "@/app/lib/seo";
import { SupportCard } from "@/app/components/SupportCard";
import { SectionHeading } from "@/app/components/SectionHeading";

export const metadata: Metadata = buildMetadata({
  title: "支援制度をさがす",
  description:
    "自治体・生活イベント・カテゴリ・キーワードから支援制度をさがします。",
  path: "/search",
  noindex: true, // フィルタ違いの薄い・重複ページを index しない
});

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const PER_PAGE_OPTIONS = [10, 25, 50, 75, 100] as const;
const DEFAULT_PER_PAGE = 10;

const SORT_OPTIONS = [
  { key: "checked", label: "確認日順" },
  { key: "municipality", label: "自治体順" },
  { key: "category", label: "カテゴリ順" },
] as const;
const DEFAULT_SORT = "checked";

// URL から引き継ぐパラメータ（フィルタ＋表示設定）。
const KEEP_KEYS = [
  "q",
  "prefecture",
  "municipality",
  "category",
  "event",
  "online",
  "deadline",
  "sort",
  "perPage",
  "page",
];

/** 現在の検索条件を保ったまま、一部パラメータだけ差し替えた /search URL を作る。 */
function buildSearchHref(
  sp: SP,
  patch: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const k of KEEP_KEYS) {
    const v = one(sp[k]);
    if (v) params.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "") params.delete(k);
    else params.set(k, String(v));
  }
  // 既定値は URL から省いて短く保つ。
  if (params.get("perPage") === String(DEFAULT_PER_PAGE)) params.delete("perPage");
  if (params.get("sort") === DEFAULT_SORT) params.delete("sort");
  if (params.get("page") === "1") params.delete("page");
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** 表示するページ番号（先頭・末尾・現在地まわり）と省略記号を返す。 */
function pageWindow(current: number, total: number): (number | "ellipsis")[] {
  const set = new Set<number>();
  for (const p of [1, total, current - 1, current, current + 1]) {
    if (p >= 1 && p <= total) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters: ProgramFilters = {
    keyword: one(sp.q) || undefined,
    prefectureSlug: one(sp.prefecture) || undefined,
    categorySlug: one(sp.category) || undefined,
    lifeEventSlug: one(sp.event) || undefined,
    municipalitySlug: one(sp.municipality) || undefined,
    onlineOnly: one(sp.online) === "1",
    hasDeadline: one(sp.deadline) === "1",
  };

  const [results, activeMunis, allMunis, categories, lifeEvents, prefectures] =
    await Promise.all([
      getPrograms(filters),
      getActiveMunicipalities(), // 全国の制度あり自治体（絞り込み用）
      getMunicipalities(), // 全自治体（名称解決用）
      getCategories(),
      getLifeEvents(),
      getPrefectures(),
    ]);

  const catName = (s: string) => categories.find((c) => c.slug === s)?.name;
  // 自治体名は 都道府県+slug で解決（slug 衝突を避ける）。
  const muniNameMap = new Map(
    allMunis.map((m) => [`${m.prefectureSlug}/${m.slug}`, m.name]),
  );
  const muniNameOf = (prefSlug: string, slug: string) =>
    muniNameMap.get(`${prefSlug}/${slug}`);

  // 都道府県ごとに active 自治体をグループ化（都道府県セレクト＋自治体 optgroup 用）。
  const areaGroups = prefectures
    .map((pref) => ({
      pref,
      munis: activeMunis.filter((m) => m.prefectureSlug === pref.slug),
    }))
    .filter((g) => g.munis.length > 0);

  const hasAnyFilter =
    !!filters.keyword ||
    !!filters.prefectureSlug ||
    !!filters.categorySlug ||
    !!filters.lifeEventSlug ||
    !!filters.municipalitySlug ||
    filters.onlineOnly ||
    filters.hasDeadline;

  // 並び替え（既定＝最終確認日が新しい順）。
  const sortRaw = one(sp.sort);
  const sort = SORT_OPTIONS.some((o) => o.key === sortRaw)
    ? (sortRaw as string)
    : DEFAULT_SORT;
  const sorted = [...results];
  if (sort === "municipality") {
    sorted.sort(
      (a, b) =>
        (muniNameOf(a.prefectureSlug, a.municipalitySlug) ?? "").localeCompare(
          muniNameOf(b.prefectureSlug, b.municipalitySlug) ?? "",
          "ja",
        ) || a.title.localeCompare(b.title, "ja"),
    );
  } else if (sort === "category") {
    sorted.sort(
      (a, b) =>
        (catName(a.categorySlugs[0]) ?? "").localeCompare(
          catName(b.categorySlugs[0]) ?? "",
          "ja",
        ) || a.title.localeCompare(b.title, "ja"),
    );
  } else {
    sorted.sort(
      (a, b) =>
        (b.lastOfficialCheckedAt ?? "").localeCompare(
          a.lastOfficialCheckedAt ?? "",
        ) || a.title.localeCompare(b.title, "ja"),
    );
  }

  // ページネーション（サーバー側・URLクエリ駆動。JS不要・共有可能）。
  const perPageRaw = Number(one(sp.perPage));
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(perPageRaw)
    ? perPageRaw
    : DEFAULT_PER_PAGE;
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageRaw = Math.floor(Number(one(sp.page)));
  const currentPage = Math.min(
    Math.max(Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1, 1),
    totalPages,
  );
  const start = (currentPage - 1) * perPage;
  const pageResults = sorted.slice(start, start + perPage);

  return (
    <div className="aw-container py-10">
      <SectionHeading
        as="h1"
        eyebrow="さがす"
        title="支援制度をさがす"
        description="自治体・生活イベント・カテゴリ・キーワードで絞り込めます。"
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* フィルター（GETフォーム・JS不要） */}
        <form
          method="get"
          action="/search"
          role="search"
          className="aw-card h-fit lg:sticky lg:top-20"
        >
          <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
            <SlidersHorizontal className="h-4 w-4 text-gold" aria-hidden="true" />
            絞り込み
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="q"
                className="text-[12px] font-semibold text-charcoal/70"
              >
                キーワード
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={filters.keyword ?? ""}
                placeholder="児童手当 など"
                className="aw-input mt-1.5"
              />
            </div>

            <div>
              <label
                htmlFor="prefecture"
                className="text-[12px] font-semibold text-charcoal/70"
              >
                都道府県
              </label>
              <select
                id="prefecture"
                name="prefecture"
                defaultValue={filters.prefectureSlug ?? ""}
                className="aw-select mt-1.5"
              >
                <option value="">すべての都道府県</option>
                {areaGroups.map((g) => (
                  <option key={g.pref.slug} value={g.pref.slug}>
                    {g.pref.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="municipality"
                className="text-[12px] font-semibold text-charcoal/70"
              >
                自治体
              </label>
              <select
                id="municipality"
                name="municipality"
                defaultValue={filters.municipalitySlug ?? ""}
                className="aw-select mt-1.5"
              >
                <option value="">すべての自治体</option>
                {areaGroups.map((g) => (
                  <optgroup key={g.pref.slug} label={g.pref.name}>
                    {g.munis.map((m) => (
                      <option key={`${m.prefectureSlug}/${m.slug}`} value={m.slug}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="category"
                className="text-[12px] font-semibold text-charcoal/70"
              >
                カテゴリ
              </label>
              <select
                id="category"
                name="category"
                defaultValue={filters.categorySlug ?? ""}
                className="aw-select mt-1.5"
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="event"
                className="text-[12px] font-semibold text-charcoal/70"
              >
                生活イベント
              </label>
              <select
                id="event"
                name="event"
                defaultValue={filters.lifeEventSlug ?? ""}
                className="aw-select mt-1.5"
              >
                <option value="">すべての生活イベント</option>
                {lifeEvents.map((e) => (
                  <option key={e.slug} value={e.slug}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[12px] font-semibold text-charcoal/70">
                条件
              </legend>
              <label className="flex items-center gap-2 text-[14px] text-charcoal">
                <input
                  type="checkbox"
                  name="online"
                  value="1"
                  defaultChecked={filters.onlineOnly}
                  className="h-4 w-4 rounded border-soft-gray accent-navy"
                />
                オンライン申請できる
              </label>
              <label className="flex items-center gap-2 text-[14px] text-charcoal">
                <input
                  type="checkbox"
                  name="deadline"
                  value="1"
                  defaultChecked={filters.hasDeadline}
                  className="h-4 w-4 rounded border-soft-gray accent-navy"
                />
                申請期限がある
              </label>
            </fieldset>
          </div>

          {/* 並び替え・表示件数は絞り込み後も保持する。 */}
          {sort !== DEFAULT_SORT && (
            <input type="hidden" name="sort" value={sort} />
          )}
          {perPage !== DEFAULT_PER_PAGE && (
            <input type="hidden" name="perPage" value={perPage} />
          )}

          <div className="mt-5 flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              <Search className="h-4 w-4" aria-hidden="true" />
              絞り込む
            </button>
            {hasAnyFilter && (
              <Link
                href="/search"
                className="btn-secondary px-3"
                aria-label="条件をクリア"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </form>

        {/* 結果 */}
        <div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[13px] text-charcoal/70" aria-live="polite">
              {total} 件の制度{hasAnyFilter ? "（絞り込み中）" : ""}
              {total > 0 && (
                <span className="text-charcoal/70">
                  {" "}
                  （{start + 1}–{Math.min(start + perPage, total)} 件目を表示）
                </span>
              )}
            </p>

            {total > 1 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-charcoal/70">並び替え</span>
                  {SORT_OPTIONS.map((o) => (
                    <Link
                      key={o.key}
                      href={buildSearchHref(sp, { sort: o.key, page: 1 })}
                      data-active={o.key === sort}
                      aria-current={o.key === sort ? "true" : undefined}
                      className="aw-chip"
                    >
                      {o.label}
                    </Link>
                  ))}
                </div>

                {total > PER_PAGE_OPTIONS[0] && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-charcoal/70">表示件数</span>
                    {PER_PAGE_OPTIONS.map((n) => (
                      <Link
                        key={n}
                        href={buildSearchHref(sp, { perPage: n, page: 1 })}
                        data-active={n === perPage}
                        aria-current={n === perPage ? "true" : undefined}
                        aria-label={`${n}件ずつ表示`}
                        className="aw-chip min-w-11 justify-center"
                      >
                        {n}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {total === 0 ? (
            <div className="aw-card mt-4">
              <p className="text-[15px] font-bold text-fg">
                条件に合う制度が見つかりませんでした
              </p>
              <p className="mt-2 text-[14px] leading-7 text-charcoal">
                条件を減らすか、キーワードを変えてお試しください。制度名が分からないときは、
                <Link href="/check" className="aw-link">
                  かんたん診断
                </Link>
                もご利用いただけます。
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {pageResults.map((p) => (
                  <li key={p.slug} className="h-full">
                    <SupportCard
                      program={p}
                      categoryName={catName(p.categorySlugs[0])}
                      municipalityName={muniNameOf(
                        p.prefectureSlug,
                        p.municipalitySlug,
                      )}
                    />
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <>
                  <nav
                    aria-label="検索結果のページ送り"
                    className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
                  >
                    {currentPage > 1 && (
                      <Link
                        href={buildSearchHref(sp, { page: currentPage - 1 })}
                        rel="prev"
                        aria-label="前のページ"
                        className="aw-chip"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        前へ
                      </Link>
                    )}

                    {pageWindow(currentPage, totalPages).map((p, i) =>
                      p === "ellipsis" ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="px-1 text-charcoal/70"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      ) : (
                        <Link
                          key={p}
                          href={buildSearchHref(sp, { page: p })}
                          aria-label={`${p}ページ目`}
                          aria-current={p === currentPage ? "page" : undefined}
                          data-active={p === currentPage}
                          className="aw-chip min-w-11 justify-center"
                        >
                          {p}
                        </Link>
                      ),
                    )}

                    {currentPage < totalPages && (
                      <Link
                        href={buildSearchHref(sp, { page: currentPage + 1 })}
                        rel="next"
                        aria-label="次のページ"
                        className="aw-chip"
                      >
                        次へ
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </nav>

                  <p className="mt-3 text-center text-[12px] text-charcoal/70">
                    {currentPage} / {totalPages} ページ
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
