import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, CalendarClock, Minus, ArrowRight } from "lucide-react";
import {
  getTopic,
  getTopicParams,
  getProgramsByTopic,
  getMunicipalities,
  getCategory,
  shouldIndexTopic,
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
  return getTopicParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const t = await getTopic(topic);
  if (!t) return { title: "見つかりませんでした" };
  const programs = await getProgramsByTopic(topic);
  // 薄いページ・要件未達は index させない（不変条件 §SEO）。
  if (!shouldIndexTopic(t, programs)) {
    return buildMetadata({
      title: `${t.name}の自治体別まとめ（準備中）`,
      description: `${t.name}に関する自治体別のまとめは準備中です。`,
      path: `/topics/${t.slug}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `${t.name}を自治体で比べる｜自治体独自の支援`,
    description: `${t.name}に関する自治体ごとの支援制度を並べて確認できます。対象・申請方法・公式ページ・最終確認日へのリンクつき。${t.description ?? ""}`,
    path: `/topics/${t.slug}`,
  });
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const t = await getTopic(topic);
  if (!t) notFound();

  const [programs, munis, parentCat] = await Promise.all([
    getProgramsByTopic(topic),
    getMunicipalities(),
    t.parentCategorySlug
      ? getCategory(t.parentCategorySlug)
      : Promise.resolve(undefined),
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
          { name: "テーマ", path: "/topics" },
          { name: t.name, path: `/topics/${t.slug}` },
        ]}
      />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow="見落としやすい自治体独自支援"
          title={`${t.name}を自治体で比べる`}
          description={
            t.description ??
            `${t.name}に関する自治体ごとの支援制度を並べました。`
          }
        />

        {/* 申請前に確認するとよいこと（薄いページにしない・利用価値） */}
        <div className="mt-6 aw-card">
          <h2 className="text-[15px] font-bold text-fg">
            申請の前に確認するとよいこと
          </h2>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-7 text-charcoal">
            <li>
              対象・助成額・申請方法は自治体ごとに異なります。お住まいの自治体の公式ページで確認してください。
            </li>
            <li>
              制度名や対象が似ていても、受付期間や必要書類が違うことがあります。最終確認日も参考にしてください。
            </li>
            <li>
              不明な点は各自治体の担当窓口に問い合わせると確実です。
            </li>
          </ul>
          {parentCat && (
            <p className="mt-3 text-[13px]">
              <Link
                href={`/compare/${parentCat.slug}`}
                className="aw-link inline-flex items-center gap-1 font-semibold"
              >
                「{parentCat.name}」全体を自治体で比べる
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </p>
          )}
        </div>

        <p className="mt-6 text-[12px] text-charcoal/70 sm:hidden">
          ※ 表は横にスクロールできます。
        </p>
        <div
          role="region"
          aria-label={`${t.name}の自治体別比較表`}
          tabIndex={0}
          className="mt-3 overflow-x-auto rounded-2xl border border-soft-gray"
        >
          <table className="w-full min-w-[680px] border-collapse text-left">
            <caption className="sr-only">{t.name}の自治体別比較</caption>
            <thead>
              <tr className="bg-cream/60 text-[12px] text-charcoal/70">
                <th scope="col" className="px-4 py-3 font-semibold">制度名</th>
                <th scope="col" className="px-4 py-3 font-semibold">自治体</th>
                <th scope="col" className="px-4 py-3 font-semibold">オンライン申請</th>
                <th scope="col" className="px-4 py-3 font-semibold">申請期限</th>
                <th scope="col" className="px-4 py-3 font-semibold">最終確認日</th>
                <th scope="col" className="px-4 py-3 font-semibold">公式</th>
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
                      className="font-bold text-fg hover:underline"
                    >
                      {p.title}
                    </Link>
                  </th>
                  <td className="px-4 py-3 text-charcoal">
                    <Link
                      href={`/${p.prefectureSlug}/${p.municipalitySlug}`}
                      className="aw-link"
                    >
                      {nameOf(p)}
                    </Link>
                  </td>
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
                      supportId={p.slug}
                      supportTitle={p.title}
                      category={t.name}
                      municipality={nameOf(p)}
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
