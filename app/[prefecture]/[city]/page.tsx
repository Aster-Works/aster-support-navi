import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Globe, ArrowRight, Clock } from "lucide-react";
import {
  getMunicipality,
  getPrefecture,
  getProgramsByMunicipality,
  getLifeEventsForMunicipality,
  getCategoriesForMunicipality,
  getActiveMunicipalityParams,
  isActiveMunicipality,
  getCategories,
} from "@/app/lib/data";
import { buildMetadata, faqJsonLd } from "@/app/lib/seo";
import { hasActiveDeadline } from "@/app/lib/data/types";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";
import { SupportCard } from "@/app/components/SupportCard";
import { LifeEventIcon } from "@/app/components/Icon";
import { JsonLd } from "@/app/components/JsonLd";
import { Disclaimer } from "@/app/components/Disclaimer";
import { formatJaDate } from "@/app/lib/dates";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getActiveMunicipalityParams()).map((p) => ({
    prefecture: p.prefecture,
    city: p.city,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ prefecture: string; city: string }>;
}): Promise<Metadata> {
  const { prefecture, city } = await params;
  const muni = await getMunicipality(prefecture, city);
  if (!muni) return { title: "見つかりませんでした" };
  const active = await isActiveMunicipality(prefecture, city);
  if (!active) {
    return buildMetadata({
      title: `${muni.name}の支援制度（準備中）`,
      description: `${muni.name}の支援制度情報は現在準備中です。`,
      path: `/${prefecture}/${city}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `${muni.name}の支援制度一覧`,
    description: `${muni.name}に住む方・転入する方が確認したい支援制度を整理しています。対象の可能性・申請方法・公式ページ・最終確認日を掲載。`,
    path: `/${prefecture}/${city}`,
  });
}

export default async function MunicipalityPage({
  params,
}: {
  params: Promise<{ prefecture: string; city: string }>;
}) {
  const { prefecture, city } = await params;
  const [pref, muni] = await Promise.all([
    getPrefecture(prefecture),
    getMunicipality(prefecture, city),
  ]);
  if (!pref || !muni) notFound();

  const programs = await getProgramsByMunicipality(prefecture, city);

  const crumbs = [
    { name: "ホーム", path: "/" },
    { name: pref.name, path: `/${pref.slug}` },
    { name: muni.name, path: `/${pref.slug}/${muni.slug}` },
  ];

  // 準備中（公開制度なし）の自治体は、薄いインデックスを避ける。
  if (programs.length === 0) {
    return (
      <>
        <Breadcrumbs crumbs={crumbs} />
        <div className="aw-container py-16">
          <SectionHeading
            as="h1"
            title={`${muni.name}の支援制度（準備中）`}
            description="この自治体の制度情報は現在準備中です。先に、かんたん診断や他の自治体からお試しください。"
          />
          <div className="mt-6 flex gap-3">
            <Link href="/check" className="btn-primary">
              かんたん診断
            </Link>
            <Link href={`/${pref.slug}`} className="btn-secondary">
              {pref.name}の自治体一覧へ
            </Link>
          </div>
        </div>
      </>
    );
  }

  const [lifeEvents, presentCategories, allCategories] = await Promise.all([
    getLifeEventsForMunicipality(prefecture, city),
    getCategoriesForMunicipality(prefecture, city),
    getCategories(),
  ]);
  const catName = (slug: string) =>
    allCategories.find((c) => c.slug === slug)?.name;

  const withDeadline = programs.filter(hasActiveDeadline);
  const online = programs.filter((p) => p.onlineApplicationAvailable);
  const lastUpdated = programs
    .map((p) => p.lastOfficialCheckedAt)
    .sort()
    .at(-1);

  const faqs = [
    {
      question: `${muni.name}の子育て支援制度は、どこで申請できますか？`,
      answer: `制度ごとに窓口が異なります。各制度のページに申請方法と問い合わせ先、公式ページへのリンクを掲載しています。最終的な手続きは必ず${muni.name}の公式ページで確認してください。`,
    },
    {
      question: "自分が対象かどうかは、ここで分かりますか？",
      answer:
        "本サイトでは「対象となる可能性がある人」を整理していますが、受給可否は判定しません。対象条件は年度や世帯の状況で変わるため、必ず公式ページまたは窓口で確認してください。",
    },
    {
      question: "引っ越したばかりですが、何を確認すればよいですか？",
      answer:
        "児童手当や子ども医療費助成は、転入先で改めて手続きが必要なことがあります。生活イベント「引っ越し・転入」から、確認すべき制度をまとめて確認できます。",
    },
  ];

  return (
    <>
      <Breadcrumbs crumbs={crumbs} />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow={`${pref.name}`}
          title={`${muni.name}で確認したい支援制度`}
          description={
            muni.intro ??
            `${muni.name}に住む方・転入する方が確認したい支援制度を整理しています。`
          }
        />

        {lastUpdated && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-charcoal/70">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            最終更新（最終確認日の最新）：{formatJaDate(lastUpdated)}時点
          </p>
        )}

        {/* 生活イベント導線 */}
        {lifeEvents.length > 0 && (
          <section className="mt-8">
            <h2 className="aw-subheading">
              生活イベントから探す
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lifeEvents.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/${pref.slug}/${muni.slug}/${e.slug}`}
                    className="aw-card aw-card-hover group flex items-center gap-3 p-4 sm:p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aster-soft text-aster">
                      <LifeEventIcon name={e.icon} className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-[14px] font-bold text-navy">
                      {e.name}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-charcoal/40 transition-transform group-hover:translate-x-0.5 group-hover:text-navy"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* カテゴリ絞り込み導線 */}
        {presentCategories.length > 0 && (
          <section className="mt-8">
            <h2 className="aw-subheading">
              カテゴリで絞り込む
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {presentCategories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/search?municipality=${muni.slug}&category=${c.slug}`}
                    className="aw-chip"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 支援制度一覧 */}
        <section className="mt-12">
          <SectionHeading
            title="支援制度一覧"
            description={`${muni.name}で確認できる制度です。各制度に公式ページと最終確認日を掲載しています。`}
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

        {/* 期限がある制度 / オンライン申請 */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {withDeadline.length > 0 && (
            <section className="aw-card">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                <CalendarClock className="h-5 w-5 text-deadline" aria-hidden="true" />
                申請期限がある制度
              </h2>
              <ul className="mt-4 space-y-3">
                {withDeadline.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/supports/${p.slug}`}
                      className="flex items-baseline justify-between gap-3 text-[14px] text-charcoal hover:text-navy"
                    >
                      <span className="font-medium">{p.title}</span>
                      <span className="shrink-0 text-[12px] text-charcoal/70">
                        {p.applicationDeadlineText
                          ? "期限あり"
                          : formatJaDate(p.applicationPeriodEnd)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {online.length > 0 && (
            <section className="aw-card">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                <Globe className="h-5 w-5 text-online" aria-hidden="true" />
                オンライン申請できる制度
              </h2>
              <ul className="mt-4 space-y-3">
                {online.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/supports/${p.slug}`}
                      className="text-[14px] font-medium text-charcoal hover:text-navy"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* FAQ */}
        <section className="mt-12">
          <SectionHeading title="よくある質問" />
          <dl className="mt-6 divide-y divide-soft-gray border-y border-soft-gray">
            {faqs.map((f) => (
              <div key={f.question} className="py-5">
                <dt className="text-[15px] font-bold text-navy">{f.question}</dt>
                <dd className="mt-2 text-[14px] leading-7 text-charcoal">
                  {f.answer}
                </dd>
              </div>
            ))}
          </dl>
          <JsonLd data={faqJsonLd(faqs)} />
        </section>

        <div className="mt-12">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
