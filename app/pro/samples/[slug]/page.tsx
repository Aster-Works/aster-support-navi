import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { Disclaimer } from "@/app/components/Disclaimer";
import { PrepPacket, type PrepProgram } from "@/app/components/PrepPacket";
import { TrackedLink } from "@/app/components/TrackedLink";
import { buildMetadata } from "@/app/lib/seo";
import { getAllPublishedPrograms, getMunicipalities } from "@/app/lib/data";
import {
  SAMPLE_PACKS,
  getSamplePack,
  selectSampleProgramsFrom,
} from "@/app/lib/pro/samples";
import { SamplePackAnalytics } from "../SamplePackAnalytics";

export function generateStaticParams() {
  return SAMPLE_PACKS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sample = getSamplePack(slug);
  if (!sample) return buildMetadata({ title: "サンプル相談パック", description: "見本", path: "/pro/samples", noindex: true });
  return buildMetadata({
    title: sample.title,
    description: sample.description,
    path: `/pro/samples/${sample.slug}`,
  });
}

export default async function SamplePackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sample = getSamplePack(slug);
  if (!sample) notFound();

  const [programs, munis] = await Promise.all([
    getAllPublishedPrograms(),
    getMunicipalities(),
  ]);
  const muniNameOf = (prefSlug: string, muniSlug: string) =>
    munis.find((m) => m.prefectureSlug === prefSlug && m.slug === muniSlug)
      ?.name ?? muniSlug;

  const selected = selectSampleProgramsFrom(
    programs,
    sample.categorySlugs,
    sample.limit,
  );
  const prepPrograms: PrepProgram[] = selected.map((p) => ({
    slug: p.slug,
    title: p.title,
    municipalityName: muniNameOf(p.prefectureSlug, p.municipalitySlug),
    targetPeople: p.targetPeople,
    deadlineText: p.applicationDeadlineText,
    documentsText: p.requiredDocumentsText,
    methodText: p.applicationMethodText,
    online: !!p.onlineApplicationAvailable,
    officeName: p.contactName,
    phone: p.contactPhone,
    officialUrl: p.officialUrl,
  }));

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "Pro", path: "/pro" },
          { name: "サンプル相談パック", path: "/pro/samples" },
          { name: sample.title, path: `/pro/samples/${sample.slug}` },
        ]}
      />
      <SamplePackAnalytics sample={sample.slug} />

      <main className="aw-container pb-16 pt-10">
        <div className="print:hidden">
          <p className="aw-eyebrow">相談パックの見本</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl">
            {sample.title}
          </h1>
          <p className="mt-2 text-[13px] font-semibold text-gold-ink">
            {sample.audience}
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-8 text-charcoal">
            {sample.intro}
          </p>
          <div className="mt-5">
            <Disclaimer variant="diagnosis" />
          </div>
          <p className="mt-4 max-w-2xl text-[13px] leading-7 text-charcoal/70">
            これは見本です。実際の相談パックは、1つの自治体・相談者の状況に合わせて制度を選び直して作成します。掲載の制度はいずれも実在の公開情報で、公式リンクと最終確認日がついています。
          </p>
        </div>

        {/* 印刷・PDF保存できる相談パック本体（団体名・担当者の差込は見本表示） */}
        <PrepPacket
          programs={prepPrograms}
          heading={sample.title}
          nextChecks={sample.nextChecks}
          context="pro_sample"
          branding={{
            orgName: "◯◯支援センター（見本）",
            preparedBy: "相談担当",
          }}
        />

        {/* 自分の地域・状況で作る導線 */}
        <section className="mt-12 print:hidden">
          <div className="aw-callout">
            <h2 className="aw-card-heading">自分の地域・状況で整える</h2>
            <p className="mt-2 text-[14px] leading-7 text-charcoal">
              この見本のような相談パックを、お住まいの自治体や相談者の状況に合わせて作れます。まずは無料のかんたん診断から、必要に応じて支援者向けの Pro へ。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {/* diagnosis_start: サンプルから無料診断へ。 */}
              <TrackedLink
                href="/check"
                className="btn-secondary"
                eventName="diagnosis_start"
                eventParams={{ source: "sample_to_check" }}
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                無料でかんたん診断
              </TrackedLink>
              {/* pro_interest_click: サンプルから料金プランへ。 */}
              <TrackedLink
                href="/pro#pricing"
                className="btn-primary"
                eventName="pro_interest_click"
                eventParams={{ source: "sample_to_pricing", plan_hint: "pricing" }}
              >
                Pro の料金プランを見る
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
