import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, CalendarClock, Minus } from "lucide-react";
import {
  getCategory,
  getPresentCategories,
  getPrograms,
  getMunicipalities,
} from "@/app/lib/data";
import { hasActiveDeadline } from "@/app/lib/data/types";
import { buildMetadata } from "@/app/lib/seo";
import { formatJaDate } from "@/app/lib/dates";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";
import { OfficialLink } from "@/app/components/OfficialLink";
import { Disclaimer } from "@/app/components/Disclaimer";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPresentCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat) return { title: "見つかりませんでした" };
  const programs = await getPrograms({ categorySlug: category });
  if (programs.length === 0) {
    return buildMetadata({
      title: `${cat.name}の制度比較（準備中）`,
      description: `${cat.name}の比較は準備中です。`,
      path: `/compare/${cat.slug}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `${cat.name}の支援制度を自治体で比べる`,
    description: `東京の自治体ごとに、${cat.name}に関する支援制度を並べて比較します。オンライン申請の可否・申請期限の有無・最終確認日・公式ページを一覧で確認できます。`,
    path: `/compare/${cat.slug}`,
  });
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat) notFound();

  const [programs, munis] = await Promise.all([
    getPrograms({ categorySlug: category }),
    getMunicipalities(),
  ]);
  if (programs.length === 0) notFound();

  const nameOf = (p: { prefectureSlug: string; municipalitySlug: string }) =>
    munis.find(
      (m) =>
        m.prefectureSlug === p.prefectureSlug && m.slug === p.municipalitySlug,
    )?.name ?? p.municipalitySlug;
  const rows = [...programs].sort(
    (a, b) =>
      nameOf(a).localeCompare(nameOf(b), "ja") ||
      a.title.localeCompare(b.title, "ja"),
  );

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "比べる", path: "/compare" },
          { name: cat.name, path: `/compare/${cat.slug}` },
        ]}
      />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow="比べる"
          title={`${cat.name}の制度を自治体で比べる`}
          description={`${cat.name}に関する制度を、自治体ごとに並べました。対象や金額の詳細は各制度ページと公式ページで確認してください。`}
        />

        <p className="mt-4 text-[12px] text-charcoal/70 sm:hidden">
          ※ 表は横にスクロールできます。
        </p>

        <div
          role="region"
          aria-label={`${cat.name}の制度比較表`}
          tabIndex={0}
          className="mt-6 overflow-x-auto rounded-2xl border border-soft-gray"
        >
          <table className="w-full min-w-[680px] border-collapse text-left">
            <caption className="sr-only">
              {cat.name}の支援制度の自治体別比較
            </caption>
            <thead>
              <tr className="bg-cream/60 text-[12px] text-charcoal/70">
                <th scope="col" className="px-4 py-3 font-semibold">
                  制度名
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  自治体
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  オンライン申請
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  申請期限
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  最終確認日
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  公式
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.slug}
                  className="border-t border-soft-gray align-top text-[14px]"
                >
                  <th scope="row" className="px-4 py-3 font-normal">
                    <Link
                      href={`/supports/${p.slug}`}
                      className="font-bold text-navy hover:underline"
                    >
                      {p.title}
                    </Link>
                  </th>
                  <td className="px-4 py-3 text-charcoal">{nameOf(p)}</td>
                  <td className="px-4 py-3">
                    {p.onlineApplicationAvailable ? (
                      <span className="inline-flex items-center gap-1 text-online">
                        <Globe className="h-4 w-4" aria-hidden="true" />
                        できる
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-charcoal/70">
                        <Minus className="h-4 w-4" aria-hidden="true" />
                        公式で確認
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {hasActiveDeadline(p) ? (
                      <span className="inline-flex items-center gap-1 text-deadline">
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        あり
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-charcoal/70">
                        <Minus className="h-4 w-4" aria-hidden="true" />
                        公式で確認
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-charcoal/80">
                    {formatJaDate(p.lastOfficialCheckedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <OfficialLink
                      url={p.officialUrl}
                      label="公式"
                      className="aw-link inline-flex items-center gap-1 text-[13px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
