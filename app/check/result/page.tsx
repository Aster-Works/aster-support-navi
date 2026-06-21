import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  ListChecks,
  HeartHandshake,
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

export const metadata: Metadata = buildMetadata({
  title: "診断結果",
  description: "確認するとよい支援制度の候補です。",
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
        <h1 className="text-2xl font-bold text-navy">診断結果がありません</h1>
        <p className="mt-3 text-[15px] text-charcoal">
          先にかんたん診断にお答えください。
        </p>
        <Link href="/check" className="btn-primary mt-6">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          かんたん診断へ
        </Link>
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

  return (
    <div className="aw-container py-10">
      <SectionHeading
        as="h1"
        eyebrow="診断結果"
        title={
          muni
            ? `${muni.name}で確認するとよい制度の候補`
            : "確認するとよい制度の候補"
        }
        description="入力内容から、確認するとよい制度を機械的に並べました。受給できることを保証する判定ではありません。"
      />

      <div className="mt-6">
        <Disclaimer variant="diagnosis" />
      </div>

      {candidates.length === 0 ? (
        <div className="aw-card mt-8">
          <p className="text-[15px] font-bold text-navy">
            候補となる制度が見つかりませんでした
          </p>
          <p className="mt-2 text-[14px] leading-7 text-charcoal">
            選んだ条件では候補が出ませんでした。自治体ページから直接さがすか、条件を変えて診断し直してください。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/check" className="btn-primary">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              もう一度診断する
            </Link>
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
          <p className="mt-8 text-[14px] font-semibold text-charcoal">
            {candidates.length} 件の候補が見つかりました
          </p>
          <ul className="mt-4 space-y-4">
            {candidates.map(({ program, reasons }) => (
              <li key={program.slug}>
                <article className="aw-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <ProgramBadges
                        program={program}
                        categoryName={catName(program.categorySlugs[0])}
                      />
                      <h2 className="mt-2 text-[17px] font-bold text-navy">
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
                          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                          この制度が候補に出た理由
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
                      />
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* 複数制度をまとめた申請準備リスト（印刷・PDF保存。diagnosis_completed も計測） */}
      <PrepPacket
        programs={prepPrograms}
        heading={
          muni
            ? `${muni.name}で確認するとよい制度の申請準備リスト`
            : "確認するとよい制度の申請準備リスト"
        }
        nextChecks={nextChecks}
        context="diagnosis"
      />

      {/* 次に確認すること */}
      {nextChecks.length > 0 && (
        <section className="mt-12">
          <div className="aw-card">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy">
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
      <section className="mt-12">
        <div className="aw-callout">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-navy">
            <HeartHandshake className="h-5 w-5 text-aster" aria-hidden="true" />
            対象に当てはまらないと感じたら
          </h2>
          <p className="mt-2 text-[13px] leading-7 text-charcoal">
            候補が合わないときや、いまの暮らしがつらいときは、ひとりで抱え込まなくて大丈夫です。条件を変えて探したり、公的な相談窓口に相談したりできます。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/check" className="btn-secondary">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              条件を変えて診断する
            </Link>
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
