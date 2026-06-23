import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  ExternalLink,
  HeartHandshake,
  TriangleAlert,
  ClipboardCheck,
} from "lucide-react";
import { buildMetadata } from "@/app/lib/seo";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { SectionHeading } from "@/app/components/SectionHeading";
import {
  helplineGroups,
  HELPLINES_VERIFIED,
  type Helpline,
} from "@/app/data/helplines";

export const metadata: Metadata = buildMetadata({
  title: "ひとりで抱え込まないために｜相談窓口",
  description:
    "困ったとき、ひとりで抱え込まなくて大丈夫です。子育て・ひとり親・こころ・暮らしの公的な相談窓口を整理しています。緊急のときの連絡先も掲載。",
  path: "/help",
});

function HelplineCard({ item }: { item: Helpline }) {
  return (
    <div
      className={`aw-card ${
        item.urgent ? "border-deadline/30 bg-deadline-soft/40" : ""
      }`}
    >
      <p className="text-[11px] font-semibold tracking-wide text-charcoal/70">
        {item.category}
      </p>
      <h3 className="mt-1 text-[16px] font-bold text-fg">{item.title}</h3>
      <p className="mt-2 text-[14px] leading-7 text-charcoal">
        {item.description}
      </p>

      {item.tel && (
        <p className="mt-3">
          <a
            href={`tel:${item.tel}`}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-bold ${
              item.urgent
                ? "bg-deadline text-white"
                : "bg-navy text-white hover:bg-ink"
            }`}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {item.tel}
          </a>
          {item.telNote && (
            <span className="mt-1 block text-[12px] text-charcoal/70">
              {item.telNote}
            </span>
          )}
        </p>
      )}

      {item.url && (
        <p className="mt-3">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="aw-link inline-flex items-center gap-1 text-[14px]"
          >
            {item.urlLabel ?? "公式ページ"}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "相談窓口", path: "/help" },
        ]}
      />
      <div className="aw-container py-10">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-aster-soft text-aster">
            <HeartHandshake className="h-6 w-6" aria-hidden="true" />
          </span>
          <SectionHeading
            as="h1"
            eyebrow="相談窓口"
            title="ひとりで抱え込まないために"
            description="困ったときは、ひとりで抱え込まなくて大丈夫です。助けを求めることは、弱さではありません。公的な相談窓口を整理しました。"
          />
        </div>

        {/* 緊急・検証の注記 */}
        <div className="mt-8 aw-note flex gap-3">
          <TriangleAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-deadline"
            aria-hidden="true"
          />
          <p className="text-[13px] leading-7 text-charcoal">
            命や身の安全に関わるときは、迷わず <strong>110</strong>（警察）・
            <strong>119</strong>（救急・消防）へ電話してください。
            掲載の番号・受付時間・URLは変わることがあります。利用の前に、各窓口の公式ページで最新の情報を確認してください。
            {!HELPLINES_VERIFIED && (
              <span className="mt-1 block text-charcoal/70">
                ※ 受付時間・公式URLは公開前に最終確認します（110・119・189・188などの全国共通番号は制度として固定です）。
              </span>
            )}
          </p>
        </div>

        {/* 相談窓口グループ */}
        <div className="mt-10 space-y-12">
          {helplineGroups.map((group) => (
            <section key={group.heading}>
              <h2 className="text-lg font-bold text-fg">{group.heading}</h2>
              {group.intro && (
                <p className="mt-2 max-w-2xl text-[14px] leading-7 text-charcoal">
                  {group.intro}
                </p>
              )}
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <li key={item.title} className="h-full">
                    <HelplineCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* 次の一歩 */}
        <section className="mt-14">
          <div className="aw-card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-[15px] font-bold text-fg">
                使える制度がないか、あわせて確認する
              </h2>
              <p className="mt-1 text-[13px] leading-7 text-charcoal">
                相談とあわせて、確認しておくとよい支援制度があるかもしれません。かんたん診断から探せます。
              </p>
            </div>
            <Link href="/check" className="btn-primary shrink-0">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              かんたん診断
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
