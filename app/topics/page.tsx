import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPresentTopics, getProgramsByTopic } from "@/app/lib/data";
import { buildMetadata } from "@/app/lib/seo";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const topics = await getPresentTopics();
  if (topics.length === 0) {
    return buildMetadata({
      title: "見落としやすい自治体独自の支援（準備中）",
      description: "自治体独自の細かな支援テーマのまとめは準備中です。",
      path: "/topics",
      noindex: true,
    });
  }
  return buildMetadata({
    title: "見落としやすい自治体独自の支援",
    description:
      "補聴器・紙おむつ・産後ケアなど、自治体ごとに異なる細かな支援を、テーマごとに自治体で比べられます。",
    path: "/topics",
  });
}

export default async function TopicsIndexPage() {
  const topics = await getPresentTopics();
  const withCounts = await Promise.all(
    topics.map(async (t) => ({
      topic: t,
      count: (await getProgramsByTopic(t.slug)).length,
    })),
  );

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "テーマ", path: "/topics" },
        ]}
      />
      <div className="aw-container py-10">
        <SectionHeading
          as="h1"
          eyebrow="見落としやすい自治体独自支援"
          title="テーマから探す"
          description="補聴器・紙おむつ・産後ケアなど、自治体ごとに異なる細かな支援を、テーマごとに自治体で比べられます。対象や金額は自治体の公式ページで確認してください。"
        />
        {withCounts.length === 0 ? (
          <p className="mt-8 text-[15px] text-charcoal">
            現在準備中です。順次公開します。
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {withCounts.map(({ topic, count }) => (
              <li key={topic.slug}>
                <Link
                  href={`/topics/${topic.slug}`}
                  className="aw-card aw-card-hover group flex h-full flex-col gap-2"
                >
                  <span className="text-[15px] font-bold text-fg">
                    {topic.name}
                  </span>
                  {topic.description && (
                    <span className="text-[13px] leading-6 text-charcoal/80">
                      {topic.description}
                    </span>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1 text-[12px] font-semibold text-fg/70">
                    {count}自治体の制度を見る
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
