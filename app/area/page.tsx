import type { Metadata } from "next";
import { Building2, MapPinned } from "lucide-react";
import {
  getActiveMunicipalities,
  getMunicipalities,
  getPrefectures,
} from "@/app/lib/data";
import { buildAreaGroups } from "@/app/lib/region";
import { buildMetadata } from "@/app/lib/seo";
import { AreaExplorer } from "@/app/components/AreaExplorer";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { HomeSearch, type MuniOption } from "@/app/components/HomeSearch";
import { SectionHeading } from "@/app/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: "エリアから探す",
  description:
    "Aster Support Naviで公開中の支援制度を、地方・都道府県・自治体から探せます。整備済みの自治体から順次掲載しています。",
  path: "/area",
});

export default async function AreaPage() {
  const [active, allMunis, prefectures] = await Promise.all([
    getActiveMunicipalities(),
    getMunicipalities(),
    getPrefectures(),
  ]);

  const areaGroups = buildAreaGroups(active, prefectures);
  const activeKeys = new Set(
    active.map((m) => `${m.prefectureSlug}/${m.slug}`),
  );
  const muniOptions: MuniOption[] = allMunis.map((m) => ({
    name: m.name,
    nameKana: m.nameKana,
    slug: m.slug,
    prefectureSlug: m.prefectureSlug,
    active: activeKeys.has(`${m.prefectureSlug}/${m.slug}`),
  }));
  const prefectureCount = areaGroups.reduce(
    (sum, group) => sum + group.prefectures.length,
    0,
  );

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "エリアから探す", path: "/area" },
        ]}
      />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow="エリアから探す"
          title="地方・都道府県から支援制度を探す"
          description="公式情報を確認できた自治体から順次掲載しています。お住まい・転入予定の地域を選んで、制度一覧へ進んでください。"
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <AreaExplorer groups={areaGroups} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="aw-card">
              <h2 className="aw-card-heading">
                <MapPinned className="h-5 w-5 text-ok" aria-hidden="true" />
                自治体名で探す
              </h2>
              <p className="mt-2 text-[13px] leading-7 text-charcoal">
                地方名が分からない場合は、自治体名を直接入力できます。
              </p>
              <div className="mt-4">
                <HomeSearch municipalities={muniOptions} />
              </div>
            </section>

            <section className="rounded-2xl border border-soft-gray bg-cream/45 p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
                <Building2 className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                掲載状況
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div>
                  <dt className="text-[11px] text-charcoal/75">都道府県</dt>
                  <dd className="mt-1 text-2xl font-bold text-fg">
                    {prefectureCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-charcoal/75">自治体</dt>
                  <dd className="mt-1 text-2xl font-bold text-fg">
                    {active.length}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[12px] leading-6 text-charcoal/70">
                未整備の自治体は、公式情報の確認ができ次第追加します。
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
