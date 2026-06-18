import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  Gift,
  CalendarClock,
  FileText,
  Send,
  Phone,
  Globe,
  HelpCircle,
  MapPin,
} from "lucide-react";
import {
  getProgram,
  getMunicipality,
  getPrefecture,
  getCategories,
  getRelatedPrograms,
  getAllPublishedPrograms,
} from "@/app/lib/data";
import { hasActiveDeadline } from "@/app/lib/data/types";
import { buildMetadata, articleJsonLd } from "@/app/lib/seo";
import { humanizeUncertain } from "@/app/lib/copy";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { JsonLd } from "@/app/components/JsonLd";
import { ProgramBadges } from "@/app/components/StatusBadges";
import { TrustSignal } from "@/app/components/TrustSignal";
import { Disclaimer } from "@/app/components/Disclaimer";
import { SupportCard } from "@/app/components/SupportCard";
import { ApplicationChecklist } from "@/app/components/ApplicationChecklist";
import { SaveButton } from "@/app/components/SaveButton";

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const all = await getAllPublishedPrograms();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return { title: "見つかりませんでした" };
  const muni = await getMunicipality(
    program.prefectureSlug,
    program.municipalitySlug,
  );
  const cityName = muni?.name ?? "";
  return buildMetadata({
    title: `${cityName}の${program.title}：対象・申請方法・必要書類`,
    description: program.summary.slice(0, 110),
    path: `/supports/${program.slug}`,
    ogType: "article",
  });
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-soft-gray pt-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-navy">
        <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
        {label}
      </h2>
      <div className="mt-3 text-[15px] leading-8 text-charcoal">{children}</div>
    </section>
  );
}

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();

  const [pref, muni, categories, related] = await Promise.all([
    getPrefecture(program.prefectureSlug),
    getMunicipality(program.prefectureSlug, program.municipalitySlug),
    getCategories(),
    getRelatedPrograms(program, 3),
  ]);
  if (!pref || !muni) notFound();

  const primaryCategory = categories.find(
    (c) => c.slug === program.categorySlugs[0],
  );
  const catName = (s: string) => categories.find((c) => c.slug === s)?.name;

  const crumbs = [
    { name: "ホーム", path: "/" },
    { name: pref.name, path: `/${pref.slug}` },
    { name: muni.name, path: `/${pref.slug}/${muni.slug}` },
    { name: program.title, path: `/supports/${program.slug}` },
  ];

  return (
    <>
      <Breadcrumbs crumbs={crumbs} />
      <article className="aw-container py-8">
        {/* ヘッダー */}
        <header>
          <ProgramBadges
            program={program}
            categoryName={primaryCategory?.name}
          />
          <h1 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-navy sm:text-3xl">
            {program.title}
          </h1>
          <Link
            href={`/${pref.slug}/${muni.slug}`}
            className="mt-2 inline-flex items-center gap-1 text-[13px] text-charcoal/70 hover:text-navy"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {muni.name}
            {primaryCategory && (
              <span className="text-charcoal/70">／{primaryCategory.name}</span>
            )}
          </Link>
          <p className="mt-4 max-w-2xl text-[15px] leading-8 text-charcoal">
            {program.summary}
          </p>
          <div className="mt-5">
            <SaveButton
              program={program}
              municipalityName={muni.name}
              categoryName={primaryCategory?.name}
            />
          </div>
        </header>

        {/* レイアウト：本文 + サイド（チェックリスト/公式情報） */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {/* まず確認すること */}
            <section className="aw-card bg-cream/50">
              <h2 className="text-sm font-bold tracking-wide text-charcoal/70">
                まず確認すること
              </h2>
              <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[12px] font-semibold text-charcoal/70">
                    対象となる可能性がある人
                  </dt>
                  <dd className="mt-0.5 text-[14px] leading-7 text-navy">
                    {program.targetPeople.slice(0, 60)}
                    {program.targetPeople.length > 60 ? "…" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold text-charcoal/70">
                    支援内容
                  </dt>
                  <dd className="mt-0.5 text-[14px] leading-7 text-navy">
                    {program.benefitAmountText
                      ? `${program.benefitAmountText.slice(0, 50)}${
                          program.benefitAmountText.length > 50 ? "…" : ""
                        }`
                      : "公式ページで確認"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold text-charcoal/70">
                    申請方法
                  </dt>
                  <dd className="mt-0.5 text-[14px] leading-7 text-navy">
                    {program.onlineApplicationAvailable
                      ? "窓口・郵送・オンラインなど"
                      : "窓口・郵送など"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold text-charcoal/70">
                    申請期限
                  </dt>
                  <dd className="mt-0.5 text-[14px] leading-7 text-navy">
                    {hasActiveDeadline(program) ? "期限の確認が必要" : "公式ページで確認"}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="mt-8 space-y-8">
              <Field icon={Users} label="対象となる可能性がある人">
                <p>{program.targetPeople}</p>
              </Field>

              <Field icon={Gift} label="支援内容・金額">
                <p>
                  {program.benefitAmountText ??
                    "支援の内容・金額は、年度や世帯の状況により異なります。公式ページで確認してください。"}
                </p>
              </Field>

              {program.applicationDeadlineText && (
                <Field icon={CalendarClock} label="申請期限・受付">
                  <p>{program.applicationDeadlineText}</p>
                </Field>
              )}

              {program.requiredDocumentsText && (
                <Field icon={FileText} label="申請前に準備するもの">
                  <p>{program.requiredDocumentsText}</p>
                </Field>
              )}

              <Field icon={Send} label="申請方法">
                <p>{program.applicationMethodText}</p>
                {program.onlineApplicationAvailable && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-online">
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    オンライン申請に対応している可能性があります（公式ページで確認）。
                  </p>
                )}
              </Field>

              {(program.contactName ||
                program.contactPhone ||
                program.contactUrl) && (
                <Field icon={Phone} label="問い合わせ先">
                  {program.contactName && <p>{program.contactName}</p>}
                  {program.contactPhone && (
                    <p className="mt-1">
                      電話：
                      <a
                        href={`tel:${program.contactPhone.replace(/[^0-9]/g, "")}`}
                        className="aw-link"
                      >
                        {program.contactPhone}
                      </a>
                    </p>
                  )}
                  {program.contactUrl && (
                    <p className="mt-1">
                      <a
                        href={program.contactUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="aw-link"
                      >
                        問い合わせ先ページを開く
                      </a>
                    </p>
                  )}
                </Field>
              )}

              {/* 公式で確認する項目 */}
              {program.uncertainFields && program.uncertainFields.length > 0 && (
                <section className="border-t border-soft-gray pt-6">
                  <h2 className="flex items-center gap-2 text-base font-bold text-navy">
                    <HelpCircle className="h-5 w-5 text-info" aria-hidden="true" />
                    公式ページで確認したい項目
                  </h2>
                  <p className="mt-2 text-[13px] text-charcoal/70">
                    次の点は最新の情報を公式ページでご確認ください。
                  </p>
                  <ul className="mt-3 space-y-2">
                    {program.uncertainFields.map((u) => (
                      <li
                        key={u}
                        className="flex items-start gap-2 text-[14px] leading-7 text-charcoal"
                      >
                        <span
                          className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info"
                          aria-hidden="true"
                        />
                        {humanizeUncertain(u)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {program.disclaimerNote && (
                <div className="aw-note">{program.disclaimerNote}</div>
              )}
            </div>
          </div>

          {/* サイド */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <TrustSignal program={program} />
            <ApplicationChecklist
              program={program}
              municipalityName={muni.name}
            />
          </aside>
        </div>

        <div className="mt-10">
          <Disclaimer variant="program" />
        </div>

        {/* 関連制度 */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-lg font-bold text-navy">
              {muni.name}の関連する制度
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug} className="h-full">
                  <SupportCard
                    program={p}
                    categoryName={catName(p.categorySlugs[0])}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
        <JsonLd
          data={articleJsonLd({
            title: `${muni.name}の${program.title}：対象・申請方法・必要書類`,
            description: program.summary,
            path: `/supports/${program.slug}`,
            datePublished: program.lastOfficialCheckedAt,
            dateModified: program.updatedAt ?? program.lastOfficialCheckedAt,
          })}
        />
      </article>
    </>
  );
}
