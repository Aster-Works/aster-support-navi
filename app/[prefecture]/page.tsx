import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Map, ArrowRight } from "lucide-react";
import {
  getPrefecture,
  getPrefectures,
  getMunicipalities,
  getActiveMunicipalities,
} from "@/app/lib/data";
import { buildMetadata } from "@/app/lib/seo";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const prefs = await getPrefectures();
  return prefs.map((p) => ({ prefecture: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ prefecture: string }>;
}): Promise<Metadata> {
  const { prefecture } = await params;
  const pref = await getPrefecture(prefecture);
  if (!pref) return { title: "見つかりませんでした" };
  const active = await getActiveMunicipalities(pref.slug);
  return buildMetadata({
    title: `${pref.name}の支援制度を自治体から探す`,
    description: `${pref.name}の区市町村ごとに、公開中の支援制度を整理しています。お住まいの自治体を選んで、確認すべき制度と申請準備を確認できます。`,
    path: `/${pref.slug}`,
    // 公開制度を持つ自治体が無い都道府県は薄いページのため index しない。
    noindex: active.length === 0,
  });
}

export default async function PrefecturePage({
  params,
}: {
  params: Promise<{ prefecture: string }>;
}) {
  const { prefecture } = await params;
  const pref = await getPrefecture(prefecture);
  if (!pref) notFound();

  const [all, active, allActive] = await Promise.all([
    getMunicipalities(pref.slug),
    getActiveMunicipalities(pref.slug),
    getActiveMunicipalities(), // 他の地域への導線を出すかの判定用（全都道府県）
  ]);
  const activeSlugs = new Set(active.map((m) => m.slug));
  // 「すべての自治体」は制度ありカードと重複するため、未整備（準備中）の自治体だけを別枠で出す。
  const inactive = all.filter((m) => !activeSlugs.has(m.slug));
  // 他の都道府県に公開制度があるか（あればエリア選択パネルへの導線を出す）。
  const hasOtherAreas = allActive.some((m) => m.prefectureSlug !== pref.slug);

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: pref.name, path: `/${pref.slug}` },
        ]}
      />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow={pref.region ?? "自治体から探す"}
          title={`${pref.name}の支援制度を自治体から探す`}
          description="お住まいの・転入予定の自治体を選んでください。公式ページと最終確認日を確認できた制度から公開しています。"
        />

        {active.length > 0 && (
          <section className="mt-10">
            <h2 className="aw-subheading">
              制度を確認できる自治体
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/${m.prefectureSlug}/${m.slug}`}
                    className="aw-card aw-card-hover flex items-center gap-3"
                  >
                    <MapPin className="h-5 w-5 text-gold" aria-hidden="true" />
                    <span className="text-[15px] font-bold text-fg">
                      {m.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {inactive.length > 0 && (
          <section className="mt-10">
            <h2 className="aw-subheading">
              準備中の自治体
            </h2>
            <p className="mt-1 text-[13px] text-charcoal/70">
              次の自治体は、公式情報を確認でき次第、順次公開します。
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {inactive.map((m) => (
                <li key={m.slug}>
                  <span
                    className="aw-chip cursor-default border-soft-gray bg-soft-gray/40 text-charcoal/70"
                    aria-disabled="true"
                  >
                    {m.name}
                    <span className="aw-badge aw-badge--neutral text-[11px]">
                      準備中
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasOtherAreas && (
          <section className="mt-12 border-t border-soft-gray pt-8">
            <div className="aw-card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy dark:bg-white/10 dark:text-white">
                  <Map className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[15px] font-bold text-fg">
                    他の都道府県から探す
                  </h2>
                  <p className="mt-1 text-[13px] leading-6 text-charcoal/75">
                    政令指定都市など、{pref.name}以外の地域も整備しています。エリア一覧から選び直せます。
                  </p>
                </div>
              </div>
              <Link href="/area" className="btn-secondary shrink-0">
                エリアから探す
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
