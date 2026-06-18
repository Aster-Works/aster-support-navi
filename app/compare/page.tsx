import type { Metadata } from "next";
import Link from "next/link";
import { GitCompare, ArrowRight } from "lucide-react";
import { getPresentCategories } from "@/app/lib/data";
import { buildMetadata } from "@/app/lib/seo";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";
import { Disclaimer } from "@/app/components/Disclaimer";

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: "自治体で制度を比べる",
  description:
    "同じカテゴリの支援制度を、東京の自治体ごとに並べて比べられます。オンライン申請の可否や申請期限の有無、最終確認日を一覧で確認できます。",
  path: "/compare",
});

export default async function CompareIndexPage() {
  const categories = await getPresentCategories();

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "比べる", path: "/compare" },
        ]}
      />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow="比べる"
          title="自治体で制度を比べる"
          description="気になるカテゴリを選ぶと、自治体ごとの制度を並べて比べられます。"
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/compare/${c.slug}`}
                className="aw-card aw-card-hover group flex items-center gap-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aster-soft text-aster">
                  <GitCompare className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-bold text-navy">
                    {c.name}
                  </span>
                  {c.description && (
                    <span className="mt-0.5 block text-[12px] text-charcoal/70">
                      {c.description}
                    </span>
                  )}
                </span>
                <ArrowRight
                  className="h-4 w-4 text-charcoal/40 transition-transform group-hover:translate-x-0.5 group-hover:text-navy"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <Disclaimer variant="short" />
        </div>
      </div>
    </>
  );
}
