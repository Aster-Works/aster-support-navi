import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  ListChecks,
  HeartHandshake,
  FileDown,
  Map,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import {
  getAllPublishedPrograms,
  getMunicipalities,
  getCategories,
  getLifeEvents,
} from "@/app/lib/data";
import { PrepPacket, type PrepProgram } from "@/app/components/PrepPacket";
import { buildMetadata } from "@/app/lib/seo";
import {
  decodeAnswers,
  matchPrograms,
  hasAnyAnswer,
} from "@/app/lib/eligibility";
import { ProgramBadges } from "@/app/components/StatusBadges";
import { OfficialLink } from "@/app/components/OfficialLink";
import { Disclaimer } from "@/app/components/Disclaimer";
import { SectionHeading } from "@/app/components/SectionHeading";
import { DiagnosisResultAnalytics } from "@/app/components/DiagnosisResultAnalytics";
import { TrackedLink } from "@/app/components/TrackedLink";

export const metadata: Metadata = buildMetadata({
  title: "支援ルート",
  description: "診断内容から、次に確認する支援ルートと申請前パックを整理します。",
  path: "/check/result",
  noindex: true,
});

type SP = Record<string, string | string[] | undefined>;

export default async function CheckResultPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const answers = decodeAnswers(sp);

  if (!hasAnyAnswer(answers)) {
    return (
      <div className="aw-prose-container py-16 text-center">
        <h1 className="text-2xl font-bold text-fg">
          支援ルートがありません
        </h1>
        <p className="mt-3 text-[15px] text-charcoal">
          先にかんたん診断にお答えください。
        </p>
        {/* diagnosis_start: 空の結果URLから診断へ戻るCTAをクリックした時に発火。 */}
        <TrackedLink
          href="/check"
          className="btn-primary mt-6"
          eventName="diagnosis_start"
          eventParams={{ source: "result_no_answers" }}
        >
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          かんたん診断へ
        </TrackedLink>
      </div>
    );
  }

  const [programs, categories, lifeEvents, allMunis] = await Promise.all([
    getAllPublishedPrograms(),
    getCategories(),
    getLifeEvents(),
    getMunicipalities(),
  ]);
  const muniNameOf = (prefSlug: string, slug: string) =>
    allMunis.find((m) => m.prefectureSlug === prefSlug && m.slug === slug)
      ?.name ?? slug;
  let candidates = matchPrograms(answers, programs);
  if (!answers.municipality) {
    // 自治体未指定（手書きURL等）では、自治体をまたいだ同種候補の重複を畳む。
    const seen = new Set<string>();
    candidates = candidates.filter((c) => {
      const key = c.program.slug.slice(
        `${c.program.prefectureSlug}-${c.program.municipalitySlug}-`.length,
      );
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const muni = answers.municipality
    ? allMunis.find(
        (m) =>
          m.slug === answers.municipality &&
          (!answers.prefecture || m.prefectureSlug === answers.prefecture),
      )
    : undefined;
  const muniHref = muni ? `/${muni.prefectureSlug}/${muni.slug}` : undefined;
  const catName = (s: string) => categories.find((c) => c.slug === s)?.name;

  // 「次に確認すること」：回答に関係する生活イベントの共通チェックを集約。
  const relevantEvents = new Set<string>();
  if (answers.pregnant) relevantEvents.add("birth");
  if (answers.childAgeBands?.some((b) => b === "0-2" || b === "3-5"))
    relevantEvents.add("childcare");
  if (answers.childAgeBands?.some((b) => b === "6-12" || b === "13-18"))
    relevantEvents.add("school");
  if (answers.moving) relevantEvents.add("moving");
  if (answers.singleParent) relevantEvents.add("single-parent");
  const nextChecks = Array.from(
    new Set(
      lifeEvents
        .filter((e) => relevantEvents.has(e.slug))
        .flatMap((e) => e.commonChecks ?? []),
    ),
  ).slice(0, 8);

  const prepPrograms: PrepProgram[] = candidates.map(({ program }) => ({
    slug: program.slug,
    title: program.title,
    municipalityName: muniNameOf(program.prefectureSlug, program.municipalitySlug),
    targetPeople: program.targetPeople,
    deadlineText: program.applicationDeadlineText,
    documentsText: program.requiredDocumentsText,
    methodText: program.applicationMethodText,
    online: !!program.onlineApplicationAvailable,
    officeName: program.contactName,
    phone: program.contactPhone,
    officialUrl: program.officialUrl,
  }));
  const routeTitle = muni ? `${muni.name}の支援ルート` : "あなたの支援ルート";
  const routeSummary = [
    {
      label: "1. 制度を確認",
      body: `${candidates.length}件の制度を、生活状況に近い順に確認します。`,
      icon: Map,
    },
    {
      label: "2. 公式情報へ進む",
      body: "対象条件・期限・必要書類は、公式ページや窓口で最終確認します。",
      icon: ShieldCheck,
    },
    {
      label: "3. 申請前パックを作る",
      body: "複数制度を1つにまとめ、印刷・PDF保存して相談や申請準備に使えます。",
      icon: FileDown,
    },
  ];
  const resultCategoryCount = new Set(
    candidates.flatMap(({ program }) => program.categorySlugs),
  ).size;

  return (
    <div className="aw-container py-10">
      <DiagnosisResultAnalytics
        resultCount={candidates.length}
        prefecture={answers.prefecture}
        city={answers.municipality}
        categoryCount={resultCategoryCount}
      />
      <div className="print:hidden">
        <SectionHeading
          as="h1"
          eyebrow="支援ルート"
          title={routeTitle}
          description="制度名を並べるだけではなく、公式確認、必要書類の準備、相談・申請前に持っていく資料までを1つの道筋として整理します。受給できることを保証する判定ではありません。"
        />

        <div className="mt-6">
          <Disclaimer variant="diagnosis" />
        </div>

        {candidates.length === 0 ? (
          <div className="aw-card mt-8">
            <p className="text-[15px] font-bold text-fg">
              支援ルートを作れませんでした
            </p>
            <p className="mt-2 text-[14px] leading-7 text-charcoal">
              選んだ条件では、次に確認する制度を絞り込めませんでした。自治体ページから直接さがすか、条件を変えて診断し直してください。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {/* diagnosis_start: 結果なし画面の再診断CTAをクリックした時に発火。 */}
              <TrackedLink
                href="/check"
                className="btn-primary"
                eventName="diagnosis_start"
                eventParams={{ source: "result_empty_retry" }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                もう一度診断する
              </TrackedLink>
              {muni && muniHref && (
                <Link href={muniHref} className="btn-secondary">
                  {muni.name}のページへ
                </Link>
              )}
              <Link href="/help" className="btn-secondary">
                <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                相談窓口を見る
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-3 md:grid-cols-3">
              {routeSummary.map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.label}
                    className="rounded-2xl border border-soft-gray bg-surface p-5"
                  >
                    <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
                    <h2 className="mt-3 text-[15px] font-bold text-fg">
                      {step.label}
                    </h2>
                    <p className="mt-2 text-[13px] leading-7 text-charcoal/80">
                      {step.body}
                    </p>
                  </article>
                );
              })}
            </section>

            <section className="mt-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="aw-eyebrow">
                    <Map className="h-3.5 w-3.5" aria-hidden="true" />
                    ルート上で確認する制度
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-fg">
                    {candidates.length}件を順番に確認します
                  </h2>
                </div>
                <p className="text-[13px] leading-6 text-charcoal/70">
                  上から順に、生活状況と関係が強い可能性があります。
                </p>
              </div>
              <ol className="mt-4 space-y-4">
                {candidates.map(({ program, reasons }, index) => (
                  <li key={program.slug}>
                    <article className="aw-card">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[13px] font-bold text-white">
                              {index + 1}
                            </span>
                            <span className="text-[12px] font-semibold tracking-wide text-charcoal/70">
                              支援ルートの確認先
                            </span>
                          </div>
                          <ProgramBadges
                            program={program}
                            categoryName={catName(program.categorySlugs[0])}
                          />
                          <h2 className="mt-2 text-[17px] font-bold text-fg">
                            <Link
                              href={`/supports/${program.slug}`}
                              className="hover:underline"
                            >
                              {program.title}
                            </Link>
                          </h2>
                          <p className="mt-1.5 text-[14px] leading-7 text-charcoal">
                            {program.summary}
                          </p>

                          <div className="mt-3 rounded-xl bg-aster-soft/60 px-3.5 py-2.5">
                            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-aster">
                              <Lightbulb
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              この制度をルートに入れた理由
                            </p>
                            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-charcoal">
                              {reasons.map((r) => (
                                <li key={r}>・{r}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                          <Link
                            href={`/supports/${program.slug}`}
                            className="btn-primary"
                          >
                            詳しく見る
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          <OfficialLink
                            url={program.officialUrl}
                            className="btn-secondary"
                            supportId={program.slug}
                            supportTitle={program.title}
                            category={catName(program.categorySlugs[0])}
                            municipality={muniNameOf(
                              program.prefectureSlug,
                              program.municipalitySlug,
                            )}
                          />
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>

      {/* 複数制度をまとめた申請前パック（印刷・PDF保存） */}
      <PrepPacket
        programs={prepPrograms}
        heading={
          muni
            ? `${muni.name}の支援ルート申請前パック`
            : "支援ルート申請前パック"
        }
        nextChecks={nextChecks}
        context="diagnosis"
      />

      {/* 支援者・相談員向け（Pro 導線） */}
      {candidates.length > 0 && (
        <section className="mt-12 print:hidden">
          <div className="aw-card flex flex-col items-start gap-4 border-gold/30 bg-cream/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="aw-eyebrow">
                <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                支援する人へ
              </p>
              <h2 className="mt-2 text-[17px] font-bold text-fg">
                相談者に渡す制度確認パックを整えるなら
              </h2>
              <p className="mt-2 text-[13px] leading-7 text-charcoal">
                この申請前パックは無料で印刷・PDF保存できます。教会・子ども食堂・NPO・相談員の方には、名前やロゴ入りの資料・テンプレート・履歴が使える Pro もあります。
              </p>
            </div>
            {/* pro_interest_click: 診断結果からPro案内へ。 */}
            <TrackedLink
              href="/pro"
              className="btn-secondary shrink-0"
              eventName="pro_interest_click"
              eventParams={{ source: "result_supporter", plan_hint: "pro" }}
            >
              支援者向けのご案内
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedLink>
          </div>
        </section>
      )}

      {/* 次に確認すること */}
      {nextChecks.length > 0 && (
        <section className="mt-12 print:hidden">
          <div className="aw-card">
            <h2 className="aw-card-heading">
              <ListChecks className="h-5 w-5 text-gold" aria-hidden="true" />
              次に確認すること
            </h2>
            <ul className="mt-4 space-y-2.5">
              {nextChecks.map((c) => (
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

      {/* 別ルート（対象外・見つからないときの迂回路） */}
      <section className="mt-12 print:hidden">
        <div className="aw-callout">
          <h2 className="aw-card-heading">
            <HeartHandshake className="h-5 w-5 text-aster" aria-hidden="true" />
            対象に当てはまらないと感じたら
          </h2>
          <p className="mt-2 text-[13px] leading-7 text-charcoal">
            候補が合わないときや、いまの暮らしがつらいときは、ひとりで抱え込まなくて大丈夫です。条件を変えて探したり、公的な相談窓口に相談したりできます。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {/* diagnosis_start: 支援ルート下部の条件変更CTAをクリックした時に発火。 */}
            <TrackedLink
              href="/check"
              className="btn-secondary"
              eventName="diagnosis_start"
              eventParams={{ source: "result_retry" }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              条件を変えて診断する
            </TrackedLink>
            {muni && muniHref && (
              <Link href={muniHref} className="btn-secondary">
                {muni.name}の制度一覧へ
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            <Link href="/help" className="btn-secondary">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              相談窓口を見る
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
