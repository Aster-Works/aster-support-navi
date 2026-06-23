import type { Metadata } from "next";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  Mail,
  Printer,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { JsonLd } from "@/app/components/JsonLd";
import { SITE } from "@/app/lib/site";
import { buildMetadata, faqJsonLd } from "@/app/lib/seo";
import { ProContactForm } from "./ProContactForm";
import { TrackedAnchor, TrackedLink } from "@/app/components/TrackedLink";

export const metadata: Metadata = buildMetadata({
  title: "Pro（相談支援現場向け）",
  description:
    "支援団体・相談員・士業・地域コミュニティ向けに、相談者へ渡せる制度確認パックを作成するAster Support Navi Proの案内です。",
  path: "/pro",
});

const FEATURES = [
  {
    icon: Search,
    title: "制度候補をすばやく整理",
    body: "自治体・カテゴリ・生活状況から、確認しておきたい制度を短時間で集められます。",
  },
  {
    icon: FileText,
    title: "相談パックを作成",
    body: "複数の制度をまとめ、対象条件・申請方法・公式リンクを1つの資料にできます。",
  },
  {
    icon: Printer,
    title: "印刷して渡せる",
    body: "面談後に相談者が持ち帰れる、落ち着いた申請前チェックリストを整えます。",
  },
  {
    icon: ShieldCheck,
    title: "非断定・公式確認を徹底",
    body: "受給可否を判定せず、公式ページ・窓口確認へつなぐ設計です。",
  },
] as const;

const AUDIENCES = [
  "NPO・地域の支援団体",
  "教会・子ども食堂・地域コミュニティ",
  "学校・フリースクール・若者支援",
  "FP・行政書士・社労士などの相談業務",
] as const;

const FAQ = [
  {
    question: "Aster Support Navi Proは申請代行サービスですか？",
    answer:
      "いいえ。制度の確認と申請前の準備を助ける情報整理ツールです。申請代行や受給可否の判定は行いません。",
  },
  {
    question: "相談者の個人情報を保存しますか？",
    answer:
      "Proの相談パックには、氏名・詳細住所・収入・病名などの機微情報を入れない運用を前提にしています。",
  },
  {
    question: "現在すぐに利用できますか？",
    answer:
      "ログイン機能と相談パックの原型はあります。現在は少数の支援者・団体向けに試用相談を受け付ける段階です。",
  },
] as const;

export default function ProLandingPage() {
  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: "Pro", path: "/pro" },
        ]}
      />
      <JsonLd data={faqJsonLd(FAQ)} />

      <main className="aw-container pb-16 pt-10">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-start">
          <div className="max-w-2xl">
            <p className="aw-eyebrow">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              相談支援現場向け
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl">
              相談者に渡せる制度確認パックを、数分で整える。
            </h1>
            <p className="mt-5 text-[16px] leading-8 text-charcoal">
              Aster Support Navi Proは、支援団体・相談員・士業・地域コミュニティが、相談者と一緒に確認すべき制度を整理し、申請前のチェックリストとして渡すための業務ツールです。
            </p>
            <p className="mt-3 text-[14px] leading-7 text-charcoal/75">
              公共情報を閉じ込めるのではなく、公式ページ・窓口確認へ進むための準備を短くします。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {/* pro_interest_click: Pro Hero の問い合わせCTAをクリックした時に発火。 */}
              <TrackedLink
                href="#contact"
                className="btn-primary"
                eventName="pro_interest_click"
                eventParams={{ source: "pro_hero_contact", plan_hint: "trial" }}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                試用について問い合わせる
              </TrackedLink>
              {/* pro_interest_click: Pro Hero のログインCTAをクリックした時に発火。 */}
              <TrackedLink
                href="/pro/dashboard"
                className="btn-secondary"
                eventName="pro_interest_click"
                eventParams={{ source: "pro_hero_login", plan_hint: "login" }}
              >
                ログイン
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            </div>
          </div>

          <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-[0_20px_60px_-42px_rgba(13,27,42,0.45)]">
            <div className="flex items-center justify-between border-b border-soft-gray pb-3">
              <div>
                <p className="text-xs font-semibold text-gold-ink">
                  相談パック例
                </p>
                <h2 className="mt-1 text-base font-bold text-navy">
                  出産・子育ての確認資料
                </h2>
              </div>
              <span className="aw-badge aw-badge--neutral">印刷用</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "児童手当の申請タイミングを確認",
                "子ども医療費助成の必要書類を確認",
                "公式ページと窓口を開く",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-soft-gray bg-cream/40 px-3 py-3"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-aster"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-6 text-charcoal">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] leading-6 text-charcoal/70">
              対象可否・金額・期限・必要書類は、必ず自治体の公式ページまたは担当窓口で確認する前提です。
            </p>
          </div>
        </section>

        <section className="mt-14">
          <div className="max-w-2xl">
            <p className="aw-eyebrow">できること</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy">
              制度を探すだけで終わらせず、面談後の一歩まで整えます
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="aw-card h-full">
                <Icon className="h-5 w-5 text-aster" aria-hidden="true" />
                <h3 className="mt-4 text-base font-bold text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-charcoal/75">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="aw-eyebrow">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              想定利用者
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy">
              支援する人のための小さな業務基盤
            </h2>
            <p className="mt-3 text-[15px] leading-8 text-charcoal">
              面談のたびに自治体サイトを行き来し、メモを作り直している現場に向けた機能です。まずは少数の支援者・団体と、実際の使い方を確かめながら整えます。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {AUDIENCES.map((audience) => (
              <div
                key={audience}
                className="rounded-xl border border-soft-gray bg-white px-4 py-3 text-sm font-medium text-navy"
              >
                {audience}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="aw-eyebrow">安全な境界</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy">
              便利さより先に、誤解を生まない設計にします
            </h2>
          </div>
          <div className="aw-callout">
            <ul className="space-y-2">
              <li>申請代行や行政手続きの代理は行いません。</li>
              <li>受給可否を確定する判定ツールにはしません。</li>
              <li>相談者の氏名・詳細住所・収入・病名などの機微情報を相談パックに入れない運用を前提にします。</li>
              <li>公式ページ・自治体窓口での最終確認を必ず促します。</li>
            </ul>
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="aw-eyebrow">問い合わせ</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy">
              試用・導入相談
            </h2>
            <p className="mt-3 text-[15px] leading-8 text-charcoal">
              使いたい地域、支援対象、相談現場で渡したい資料の形を教えてください。現在はベータ段階として、実際の運用に合う形を一緒に確かめています。
            </p>
            <p className="mt-3 text-sm leading-7 text-charcoal/70">
              直接メールする場合は{" "}
              {/* pro_interest_click: Pro問い合わせ欄の直接メールCTAをクリックした時に発火。 */}
              <TrackedAnchor
                className="aw-link"
                href={`mailto:${SITE.operator.contactEmail}`}
                eventName="pro_interest_click"
                eventParams={{
                  source: "pro_direct_mailto",
                  plan_hint: "trial",
                }}
              >
                {SITE.operator.contactEmail}
              </TrackedAnchor>{" "}
              へどうぞ。
            </p>
          </div>
          <div className="aw-card">
            <ProContactForm contactEmail={SITE.operator.contactEmail} />
          </div>
        </section>
      </main>
    </>
  );
}
