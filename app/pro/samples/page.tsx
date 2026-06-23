import type { Metadata } from "next";
import { ArrowRight, FileText } from "lucide-react";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";
import { buildMetadata } from "@/app/lib/seo";
import { SAMPLE_PACKS } from "@/app/lib/pro/samples";
import { TrackedLink } from "@/app/components/TrackedLink";

export const metadata: Metadata = buildMetadata({
  title: "サンプル相談パック",
  description:
    "支援の現場で相談者に渡せる「制度確認パック」の見本です。ひとり親・生活困窮や住まい・出産子育ての3種を、印刷・PDF保存して確かめられます。",
  path: "/pro/samples",
});

export default function SamplePacksIndexPage() {
  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "Pro", path: "/pro" },
          { name: "サンプル相談パック", path: "/pro/samples" },
        ]}
      />
      <main className="aw-container pb-16 pt-10">
        <SectionHeading
          as="h1"
          eyebrow="サンプル"
          title="相談パックの見本"
          description="支援の現場で相談者に渡せる「制度確認パック」の仕上がりを確かめられます。実在の制度（公式リンク・最終確認日つき）で構成し、印刷・PDF保存できます。受給可否の判定ではありません。"
        />

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SAMPLE_PACKS.map((s) => (
            <article key={s.slug} className="aw-card flex h-full flex-col">
              <FileText className="h-5 w-5 text-aster" aria-hidden="true" />
              <h2 className="mt-3 text-base font-bold text-fg">{s.title}</h2>
              <p className="mt-2 flex-1 text-[13px] leading-7 text-charcoal/75">
                {s.audience}
              </p>
              {/* pro_interest_click: サンプル一覧から見本を開いた時に発火。 */}
              <TrackedLink
                href={`/pro/samples/${s.slug}`}
                className="btn-secondary mt-4 justify-center"
                eventName="pro_interest_click"
                eventParams={{ source: "sample_index_card", plan_hint: s.slug }}
              >
                見本を開く
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <TrackedLink
            href="/pro#pricing"
            className="btn-primary"
            eventName="pro_interest_click"
            eventParams={{ source: "sample_index_to_pricing", plan_hint: "pricing" }}
          >
            Pro の料金プランを見る
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedLink>
        </div>
      </main>
    </>
  );
}
