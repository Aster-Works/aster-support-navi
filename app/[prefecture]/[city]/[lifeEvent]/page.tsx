import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, ListChecks, ArrowRight } from "lucide-react";
import {
  getMunicipality,
  getPrefecture,
  getLifeEvent,
  getProgramsByLifeEvent,
  getCategories,
  getLifeEventParams,
} from "@/app/lib/data";
import { buildMetadata } from "@/app/lib/seo";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";
import { SupportCard } from "@/app/components/SupportCard";
import { LifeEventIcon } from "@/app/components/Icon";
import { Disclaimer } from "@/app/components/Disclaimer";
import { formatJaDate } from "@/app/lib/dates";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getLifeEventParams()).map((p) => ({
    prefecture: p.prefecture,
    city: p.city,
    lifeEvent: p.lifeEvent,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ prefecture: string; city: string; lifeEvent: string }>;
}): Promise<Metadata> {
  const { prefecture, city, lifeEvent } = await params;
  const [muni, le] = await Promise.all([
    getMunicipality(prefecture, city),
    getLifeEvent(lifeEvent),
  ]);
  if (!muni || !le) return { title: "見つかりませんでした" };
  const programs = await getProgramsByLifeEvent(prefecture, city, lifeEvent);
  if (programs.length === 0) {
    return buildMetadata({
      title: `${muni.name}の${le.name}の支援制度（準備中）`,
      description: `${muni.name}の${le.name}に関する支援制度は準備中です。`,
      path: `/${prefecture}/${city}/${lifeEvent}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `${muni.name}の${le.name}で確認したい支援制度`,
    description: `${muni.name}で${le.name}を迎える方へ。確認すべき給付・助成・手続きと、申請前の共通チェックを整理しています。対象の可能性・申請方法・公式ページ・最終確認日を掲載。`,
    path: `/${prefecture}/${city}/${lifeEvent}`,
  });
}

export default async function LifeEventPage({
  params,
}: {
  params: Promise<{ prefecture: string; city: string; lifeEvent: string }>;
}) {
  const { prefecture, city, lifeEvent } = await params;
  const [pref, muni, le] = await Promise.all([
    getPrefecture(prefecture),
    getMunicipality(prefecture, city),
    getLifeEvent(lifeEvent),
  ]);
  if (!pref || !muni || !le) notFound();

  const [programs, categories] = await Promise.all([
    getProgramsByLifeEvent(prefecture, city, lifeEvent),
    getCategories(),
  ]);
  const catName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name;

  const crumbs = [
    { name: "ホーム", path: "/" },
    { name: pref.name, path: `/${pref.slug}` },
    { name: muni.name, path: `/${pref.slug}/${muni.slug}` },
    { name: le.name, path: `/${pref.slug}/${muni.slug}/${le.slug}` },
  ];

  if (programs.length === 0) {
    return (
      <>
        <Breadcrumbs crumbs={crumbs} />
        <div className="aw-container py-16">
          <SectionHeading
            as="h1"
            title={`${muni.name}の「${le.name}」の支援制度（準備中）`}
            description="この生活イベントの制度情報は準備中です。自治体ページや、かんたん診断からお試しください。"
          />
          <div className="mt-6 flex gap-3">
            <Link href={`/${pref.slug}/${muni.slug}`} className="btn-primary">
              {muni.name}のページへ
            </Link>
            <Link href="/check" className="btn-secondary">
              かんたん診断
            </Link>
          </div>
        </div>
      </>
    );
  }

  const lastUpdated = programs
    .map((p) => p.lastOfficialCheckedAt)
    .sort()
    .at(-1);

  return (
    <>
      <Breadcrumbs crumbs={crumbs} />
      <div className="aw-container py-10">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-aster-soft text-aster">
            <LifeEventIcon name={le.icon} className="h-7 w-7" />
          </span>
          <SectionHeading
            as="h1"
            eyebrow={`${muni.name}`}
            title={`${le.name}のときに確認したい支援制度`}
            description={`${le.description ?? ""} ${muni.name}で確認できる制度と、申請前の共通チェックを整理しました。`}
          />
        </div>

        {lastUpdated && (
          <p className="mt-4 text-[12px] text-charcoal/70">
            最終更新（最終確認日の最新）：{formatJaDate(lastUpdated)}時点
          </p>
        )}

        {/* 確認すべき制度 */}
        <section className="mt-10">
          <SectionHeading
            title="確認すべき制度"
            description="対象となる可能性がある制度です。詳細ページで対象・申請方法・公式ページを確認できます。"
          />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <li key={p.slug} className="h-full">
                <SupportCard
                  program={p}
                  categoryName={catName(p.categorySlugs[0])}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* 申請前の共通チェック */}
        {le.commonChecks && le.commonChecks.length > 0 && (
          <section className="mt-12">
            <div className="aw-card">
              <h2 className="aw-card-heading">
                <ListChecks className="h-5 w-5 text-gold" aria-hidden="true" />
                申請前に共通で確認すること
              </h2>
              <p className="mt-2 text-[13px] text-charcoal/80">
                {le.name}のときに見落としやすいポイントです。各制度の詳細とあわせて確認してください。
              </p>
              <ul className="mt-4 space-y-2.5">
                {le.commonChecks.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-2.5 text-[14px] leading-7 text-charcoal"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                      aria-hidden="true"
                    />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 診断 CTA */}
        <section className="mt-8">
          <div className="aw-card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="aw-card-heading">
                <ClipboardCheck className="h-5 w-5 text-gold" aria-hidden="true" />
                自分の状況に合う制度を確認する
              </h2>
              <p className="mt-1 text-[13px] text-charcoal/80">
                5つほどの質問で、確認すべき制度の候補を整理します。ログイン不要・保存なし。
              </p>
            </div>
            <Link href="/check" className="btn-primary shrink-0">
              かんたん診断
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <div className="mt-10">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
