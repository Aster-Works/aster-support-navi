import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import {
  getGuide,
  getGuides,
  getProgramsByKey,
  getRepresentativeProgramsByLifeEvent,
  getCategories,
  getMunicipalities,
} from "@/app/lib/data";
import { buildMetadata, articleJsonLd, faqJsonLd } from "@/app/lib/seo";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SupportCard } from "@/app/components/SupportCard";
import { JsonLd } from "@/app/components/JsonLd";
import { Disclaimer } from "@/app/components/Disclaimer";
import { TrackedLink } from "@/app/components/TrackedLink";
import { GuideAnalytics } from "@/app/guides/GuideAnalytics";
import { formatJaDate } from "@/app/lib/dates";
import { AdSenseUnit } from "@/app/components/AdSenseUnit";
import { ADSENSE_GUIDE_SLOT, canShowGuideAds } from "@/app/lib/ads";

export const revalidate = 86400;

export async function generateStaticParams() {
  return (await getGuides()).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return { title: "見つかりませんでした" };
  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    ogType: "article",
  });
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  const [related, categories, munis, allGuides] = await Promise.all([
    guide.relatedProgramKey
      ? getProgramsByKey(guide.relatedProgramKey)
      : guide.relatedLifeEventSlug
        ? getRepresentativeProgramsByLifeEvent(guide.relatedLifeEventSlug)
        : Promise.resolve([]),
    getCategories(),
    getMunicipalities("tokyo"),
    getGuides(),
  ]);
  const catName = (s: string) => categories.find((c) => c.slug === s)?.name;
  const muniName = (s: string) => munis.find((m) => m.slug === s)?.name;

  // 同じ生活イベントの関連ガイド（内部リンクの話題クラスタ）。
  const relatedGuides = guide.relatedLifeEventSlug
    ? allGuides
        .filter(
          (g) =>
            g.slug !== guide.slug &&
            g.relatedLifeEventSlug === guide.relatedLifeEventSlug,
        )
        .slice(0, 6)
    : [];

  // 生活イベント→比較カテゴリの対応（スラッグが異なる場合のみ明示）。
  const LIFEEVENT_TO_CATEGORY: Record<string, string> = { hardship: "livelihood" };
  const compareCategory = guide.relatedLifeEventSlug
    ? (LIFEEVENT_TO_CATEGORY[guide.relatedLifeEventSlug] ??
      guide.relatedLifeEventSlug)
    : undefined;

  const crumbs = [
    { name: "ホーム", path: "/" },
    { name: "ガイド", path: "/guides" },
    { name: guide.title, path: `/guides/${guide.slug}` },
  ];
  const guideAdSlot = canShowGuideAds(guide.slug)
    ? ADSENSE_GUIDE_SLOT
    : undefined;

  return (
    <>
      <Breadcrumbs crumbs={crumbs} />
      <GuideAnalytics guide={guide.slug} />
      <article className="aw-prose-container py-8">
        <p className="aw-eyebrow">{guide.audience}</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight text-navy sm:text-[30px]">
          {guide.title}
        </h1>
        <p className="mt-2 text-[12px] text-charcoal/70">
          更新：{formatJaDate(guide.updatedAt)}時点
        </p>
        <p className="mt-5 text-[15px] leading-8 text-charcoal">{guide.intro}</p>

        <div className="mt-6">
          <Disclaimer variant="short" />
        </div>

        {/* セクション */}
        <div className="mt-8 space-y-10">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-bold text-navy">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p
                  key={i}
                  className="mt-3 text-[15px] leading-8 text-charcoal"
                >
                  {p}
                </p>
              ))}
              {s.checks && s.checks.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {s.checks.map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-2.5 text-[14px] leading-7 text-charcoal"
                    >
                      <CheckCircle2
                        className="mt-1 h-4 w-4 shrink-0 text-ok"
                        aria-hidden="true"
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* つらいときの導線 */}
        {guide.showHelp && (
          <div className="mt-10 aw-callout flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[14px] font-medium text-navy">
              <HeartHandshake className="h-5 w-5 text-aster" aria-hidden="true" />
              ひとりで抱え込まなくて大丈夫です。
            </p>
            <Link href="/help" className="btn-secondary shrink-0">
              相談窓口を見る
            </Link>
          </div>
        )}

        {/* FAQ */}
        {guide.faq && guide.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-navy">よくある質問</h2>
            <dl className="mt-5 divide-y divide-soft-gray border-y border-soft-gray">
              {guide.faq.map((f) => (
                <div key={f.question} className="py-5">
                  <dt className="text-[15px] font-bold text-navy">
                    {f.question}
                  </dt>
                  <dd className="mt-2 text-[14px] leading-7 text-charcoal">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
            <JsonLd data={faqJsonLd(guide.faq)} />
          </section>
        )}

        {/* 公式の出典 */}
        {guide.sources && guide.sources.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-bold text-navy">参考（公式情報）</h2>
            <ul className="mt-3 space-y-2">
              {guide.sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="aw-link inline-flex items-center gap-1 text-[14px]"
                  >
                    {src.label}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <AdSenseUnit
        slot={guideAdSlot}
        className="aw-prose-container mt-0"
      />

      {/* 関連制度（prose 幅の外で広く） */}
      {related.length > 0 && (
        <section className="aw-container mt-4 pb-6">
          <h2 className="text-lg font-bold text-navy">この記事に関連する制度</h2>
          <p className="mt-1 text-[13px] text-charcoal/70">
            各区の制度ページで、対象・申請方法・公式ページ・最終確認日を確認できます。
          </p>
          {compareCategory && catName(compareCategory) && (
            <p className="mt-2">
              <Link
                href={`/compare/${compareCategory}`}
                className="aw-link inline-flex items-center gap-1 text-[13px] font-semibold"
              >
                {catName(compareCategory)}の制度を自治体で比べる
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </p>
          )}
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug} className="h-full">
                <SupportCard
                  program={p}
                  categoryName={catName(p.categorySlugs[0])}
                  municipalityName={muniName(p.municipalitySlug)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 関連ガイド（同じ生活イベントの話題クラスタ） */}
      {relatedGuides.length > 0 && (
        <section className="aw-container mt-4 pb-6">
          <h2 className="text-lg font-bold text-navy">関連するガイド</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedGuides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="aw-card aw-card-hover group flex h-full items-start gap-2"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-6 text-navy">
                      {g.title}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-navy/70">
                      読む
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 診断 CTA */}
      <section className="aw-container pb-16">
        <div className="aw-card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-charcoal">
            自分の状況に合う制度を、まとめて確認できます。
          </p>
          {/* diagnosis_start: ガイド末尾の診断CTA（ガイド→診断のファネル計測）。 */}
          <TrackedLink
            href="/check"
            className="btn-primary shrink-0"
            eventName="diagnosis_start"
            eventParams={{ source: "guide_cta" }}
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            かんたん診断
          </TrackedLink>
        </div>
      </section>

      <JsonLd
        data={articleJsonLd({
          title: guide.title,
          description: guide.description,
          path: `/guides/${guide.slug}`,
          datePublished: guide.updatedAt,
        })}
      />
    </>
  );
}
