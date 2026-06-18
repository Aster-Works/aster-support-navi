import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { getGuides } from "@/app/lib/data";
import { buildMetadata } from "@/app/lib/seo";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";
import { formatJaDate } from "@/app/lib/dates";

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: "ガイド｜制度のしくみと確認リスト",
  description:
    "児童手当・出産でうけられる支援・ひとり親の支援など、制度のしくみと申請前に確認することを、やさしく整理したガイドです。",
  path: "/guides",
});

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "ガイド", path: "/guides" },
        ]}
      />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow="ガイド"
          title="制度のしくみと、確認すること"
          description="制度名を知らなくても大丈夫です。困りごとに近いガイドから、確認しておくとよいことを整理できます。"
        />

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug} className="h-full">
              <Link
                href={`/guides/${g.slug}`}
                className="aw-card aw-card-hover group flex h-full flex-col"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aster-soft text-aster">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[11px] font-semibold tracking-wide text-charcoal/70">
                  {g.audience}
                </p>
                <h2 className="mt-1 text-[17px] font-bold leading-snug text-navy">
                  {g.title}
                </h2>
                <p className="mt-2 flex-1 text-[14px] leading-7 text-charcoal">
                  {g.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-navy transition-transform group-hover:translate-x-0.5">
                  読む
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="mt-1 text-[11px] text-charcoal/70">
                  更新：{formatJaDate(g.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
