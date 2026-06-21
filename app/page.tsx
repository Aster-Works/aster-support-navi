import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  Search,
  ArrowRight,
  ShieldCheck,
  ListChecks,
  Compass,
  BookOpen,
  GitCompare,
} from "lucide-react";
import {
  getActiveMunicipalities,
  getMunicipalities,
  getPrefectures,
  getLifeEvents,
  getCategories,
  getPresentCategories,
  getRecentlyUpdatedPrograms,
} from "@/app/lib/data";
import { SITE } from "@/app/lib/site";
import { buildAreaGroups } from "@/app/lib/region";
import { buildMetadata } from "@/app/lib/seo";
import { COPY } from "@/app/lib/copy";
import { HomeSearch, type MuniOption } from "@/app/components/HomeSearch";
import { LifeEventIcon } from "@/app/components/Icon";
import { SupportCard } from "@/app/components/SupportCard";
import { SectionHeading } from "@/app/components/SectionHeading";
import { AreaExplorer } from "@/app/components/AreaExplorer";

export const metadata: Metadata = buildMetadata({
  title: SITE.tagline,
  description: SITE.description,
  path: "/",
});

// ISR。制度の編集・公開時は管理画面から revalidatePath("/") で即時反映する。
export const revalidate = 86400;

export default async function HomePage() {
  const [
    active,
    allMunis,
    prefectures,
    lifeEvents,
    categories,
    presentCategories,
    recent,
  ] = await Promise.all([
    getActiveMunicipalities(), // 全都道府県の制度あり自治体
    getMunicipalities(), // 全自治体（検索補完用）
    getPrefectures(),
    getLifeEvents(),
    getCategories(),
    getPresentCategories(),
    getRecentlyUpdatedPrograms(6),
  ]);

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
  const catName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name;

  const areaGroups = buildAreaGroups(active, prefectures);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-soft-gray/70">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_85%_-10%,var(--color-gold-soft)_0%,transparent_60%)]"
        />
        <div className="aw-container py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="aw-eyebrow">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              支援制度ナビ・全国の主要自治体を順次整備中
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-navy sm:text-[42px] sm:leading-[1.2]">
              {COPY.brandPromise}
            </h1>
            <p className="mt-5 text-[16px] leading-8 text-charcoal">
              {COPY.tagline}
              <br className="hidden sm:block" />
              役所サイトを行き来しなくても、自治体と生活状況から「確認すべき制度」と「次にやること」が分かります。
            </p>

            <div className="mt-8 max-w-xl">
              <HomeSearch municipalities={muniOptions} />
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-charcoal/70">
                <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
                各制度に公式ページと最終確認日を明記。対象可否は断定しません。
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/check" className="btn-primary">
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                かんたん診断ではじめる
              </Link>
              <Link href="/search" className="btn-secondary">
                <Search className="h-4 w-4" aria-hidden="true" />
                制度を一覧から探す
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 地域から探す */}
      <section className="aw-container py-12">
        <SectionHeading
          eyebrow="エリアから探す"
          title="地方・都道府県から支援制度を探す"
          description="整備済みの都道府県と自治体を一覧できます。まずエリアを選び、お住まいの自治体ページへ進んでください。"
        />
        <div className="mt-8">
          <AreaExplorer groups={areaGroups} compact />
        </div>
        <div className="mt-6">
          <Link
            href="/area"
            className="inline-flex items-center gap-1 text-[14px] font-semibold text-navy hover:underline"
          >
            対応エリアをすべて見る
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 生活イベントから探す */}
      <section className="aw-container py-14">
        <SectionHeading
          eyebrow="生活イベントから探す"
          title="いまの状況から、確認すべき制度へ"
          description="制度名を知らなくても大丈夫です。あなたの状況に近いものから始めてください。"
        />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lifeEvents.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/search?event=${e.slug}`}
                className="aw-card aw-card-hover group flex items-start gap-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-aster-soft text-aster">
                  <LifeEventIcon name={e.icon} className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-navy">
                      {e.name}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-charcoal/40 transition-transform group-hover:translate-x-0.5 group-hover:text-navy"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-1 block text-[13px] leading-6 text-charcoal">
                    {e.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 人気カテゴリ */}
      <section className="aw-container pb-4">
        <h2 className="text-sm font-semibold tracking-wide text-charcoal/70">
          カテゴリから探す
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {presentCategories.map((c) => (
            <li key={c.slug}>
              <Link href={`/compare/${c.slug}`} className="aw-chip">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link
            href="/guides"
            className="inline-flex items-center gap-1 text-[14px] font-semibold text-navy hover:underline"
          >
            <BookOpen className="h-4 w-4 text-gold-ink" aria-hidden="true" />
            ガイドで制度のしくみを読む
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center gap-1 text-[14px] font-semibold text-navy hover:underline"
          >
            <GitCompare className="h-4 w-4 text-gold-ink" aria-hidden="true" />
            自治体で制度を比べる
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 3ステップ */}
      <section className="aw-container py-14">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: Search,
              title: "1. 探す",
              body: "自治体・生活イベント・カテゴリから、確認すべき制度を見つけます。",
            },
            {
              icon: ShieldCheck,
              title: "2. 確認する",
              body: "対象となる可能性・支援内容・公式ページ・最終確認日を落ち着いて確認します。",
            },
            {
              icon: ListChecks,
              title: "3. 申請準備する",
              body: "申請前のチェックリストで、必要書類・期限・問い合わせ先を整理します。",
            },
          ].map((s) => (
            <div key={s.title} className="aw-card">
              <s.icon className="h-6 w-6 text-gold" aria-hidden="true" />
              <h3 className="mt-3 text-[15px] font-bold text-navy">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-7 text-charcoal">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 診断バンド */}
      <section className="aw-container py-6">
        <div className="aw-card flex flex-col items-start gap-5 border-navy/10 bg-navy text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold">
              かんたん診断
            </p>
            <h2 className="mt-2 text-xl font-bold">
              5つほどの質問で、確認すべき制度の候補を出します
            </h2>
            <p className="mt-2 text-[13px] leading-7 text-white/80">
              ログインは不要・入力は保存しません。{COPY.candidateNote}。
            </p>
          </div>
          <Link
            href="/check"
            className="btn-primary shrink-0 bg-gold text-navy hover:bg-gold-soft hover:text-navy"
          >
            診断をはじめる
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 最近更新された制度 */}
      {recent.length > 0 && (
        <section className="aw-container py-14">
          <SectionHeading
            eyebrow="最近更新された制度"
            title="新しく確認・更新された制度"
            description="最終確認日が新しいものから表示しています。"
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <li key={p.slug} className="h-full">
                <SupportCard
                  program={p}
                  categoryName={catName(p.categorySlugs[0])}
                  municipalityName={
                    allMunis.find((m) => m.slug === p.municipalitySlug)?.name
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

    </>
  );
}
