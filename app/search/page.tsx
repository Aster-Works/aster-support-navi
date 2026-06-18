import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  getPrograms,
  getActiveMunicipalities,
  getCategories,
  getLifeEvents,
  getMunicipalities,
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filters: ProgramFilters = {
    keyword: one(sp.q) || undefined,
    categorySlug: one(sp.category) || undefined,
    lifeEventSlug: one(sp.event) || undefined,
    municipalitySlug: one(sp.municipality) || undefined,
    onlineOnly: one(sp.online) === "1",
    hasDeadline: one(sp.deadline) === "1",
  };

  const [results, munis, allMunis, categories, lifeEvents] = await Promise.all([
    getPrograms(filters),
    getActiveMunicipalities("tokyo"),
    getMunicipalities("tokyo"),
    getCategories(),
    getLifeEvents(),
  ]);
  const catName = (s: string) => categories.find((c) => c.slug === s)?.name;
  const muniName = (s: string) => allMunis.find((m) => m.slug === s)?.name;

  const hasAnyFilter =
    !!filters.keyword ||
    !!filters.categorySlug ||
    !!filters.lifeEventSlug ||
    !!filters.municipalitySlug ||
    filters.onlineOnly ||
    filters.hasDeadline;

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
          <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
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
                {munis.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
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
          <p className="text-[13px] text-charcoal/70" aria-live="polite">
            {results.length} 件の制度{hasAnyFilter ? "（絞り込み中）" : ""}
          </p>

          {results.length === 0 ? (
            <div className="aw-card mt-4">
              <p className="text-[15px] font-bold text-navy">
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
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {results.map((p) => (
                <li key={p.slug} className="h-full">
                  <SupportCard
                    program={p}
                    categoryName={catName(p.categorySlugs[0])}
                    municipalityName={muniName(p.municipalitySlug)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
