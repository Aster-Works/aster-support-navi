import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
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

  const [all, active] = await Promise.all([
    getMunicipalities(pref.slug),
    getActiveMunicipalities(pref.slug),
  ]);
  const activeSlugs = new Set(active.map((m) => m.slug));

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
            <h2 className="text-sm font-semibold tracking-wide text-charcoal/70">
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
                    <span className="text-[15px] font-bold text-navy">
                      {m.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-wide text-charcoal/70">
            すべての自治体（準備中を含む）
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {all.map((m) => {
              const isActive = activeSlugs.has(m.slug);
              return (
                <li key={m.slug}>
                  {isActive ? (
                    <Link
                      href={`/${m.prefectureSlug}/${m.slug}`}
                      className="aw-chip"
                    >
                      {m.name}
                    </Link>
                  ) : (
                    <span
                      className="aw-chip cursor-default border-soft-gray bg-soft-gray/40 text-charcoal/70"
                      aria-disabled="true"
                    >
                      {m.name}
                      <span className="aw-badge aw-badge--neutral text-[11px]">
                        準備中
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
