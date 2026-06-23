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
import { PlansTable } from "./PlansTable";
import { ProPageAnalytics } from "./ProPageAnalytics";
import { SAMPLE_PACKS } from "@/app/lib/pro/samples";
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
  "子ども食堂・地域コミュニティ",
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
    question: "制度を調べるだけなら料金はかかりますか？",
    answer:
      "いいえ。制度の検索・閲覧・かんたん診断・申請前パックの印刷やPDF保存は、どなたでも無料で使えます。有料プランは、支援する人が面談で渡す資料に名前やロゴを入れたり、テンプレートや履歴を使ったりするための業務ツールです。",
  },
  {
    question: "相談者の個人情報を保存しますか？",
    answer:
      "Proの相談パックには、氏名・詳細住所・収入・病名などの機微情報を入れない運用を前提にしています。",
  },
  {
    question: "支払いはどうなりますか？",
    answer:
      "月額のサブスクリプションです。現在は少数の支援者・団体と一緒に使い方を確かめている段階で、お申し込み前にご相談いただけます。",
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
      <ProPageAnalytics />

      <main className="aw-container pb-16 pt-10">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-start">
          <div className="max-w-2xl">
            <p className="aw-eyebrow">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              相談支援現場向け
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">
              相談者に渡せる制度確認パックを、数分で整える。
            </h1>
            <p className="mt-5 text-[16px] leading-8 text-charcoal">
              Aster Support Navi Proは、支援団体・相談員・士業・地域コミュニティが、相談者と一緒に確認すべき制度を整理し、申請前のチェックリストとして渡すための業務ツールです。
            </p>
            <p className="mt-3 text-[14px] leading-7 text-charcoal/75">
              公共情報を閉じ込めるのではなく、公式ページ・窓口確認へ進むための準備を短くします。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {/* pro_interest_click: Pro Hero の料金表CTAをクリックした時に発火。 */}
              <TrackedLink
                href="#pricing"
                className="btn-primary"
                eventName="pro_interest_click"
                eventParams={{ source: "pro_hero_pricing", plan_hint: "pricing" }}
              >
                料金プランを見る
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
              {/* pro_interest_click: Pro Hero の問い合わせCTAをクリックした時に発火。 */}
              <TrackedLink
                href="#contact"
                className="btn-secondary"
                eventName="pro_interest_click"
                eventParams={{ source: "pro_hero_contact", plan_hint: "trial" }}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                試用について問い合わせる
              </TrackedLink>
              {/* pro_interest_click: Pro Hero のログインCTAをクリックした時に発火。 */}
              <TrackedLink
                href="/pro/dashboard"
                className="aw-link self-center text-sm"
                eventName="pro_interest_click"
                eventParams={{ source: "pro_hero_login", plan_hint: "login" }}
              >
                ログイン
              </TrackedLink>
            </div>
          </div>

          <div className="rounded-2xl border border-fg/10 bg-surface p-5 shadow-[0_20px_60px_-42px_rgba(13,27,42,0.45)]">
            <div className="flex items-center justify-between border-b border-soft-gray pb-3">
              <div>
                <p className="text-xs font-semibold text-gold-ink">
                  相談パック例
                </p>
                <h2 className="mt-1 text-base font-bold text-fg">
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
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg">
              制度を探すだけで終わらせず、面談後の一歩まで整えます
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="aw-card h-full">
                <Icon className="h-5 w-5 text-aster" aria-hidden="true" />
                <h3 className="mt-4 text-base font-bold text-fg">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-charcoal/75">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 料金プラン */}
        <section id="pricing" className="mt-16 scroll-mt-24">
          <div className="max-w-2xl">
            <p className="aw-eyebrow">料金プラン</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg">
              制度を調べるのは無料。支援する人の道具に課金します
            </h2>
            <p className="mt-3 text-[15px] leading-8 text-charcoal">
              制度の検索・診断・申請前パックの印刷やPDF保存は、どなたでも無料です。有料プランは、面談で渡す資料に名前やロゴを入れ、テンプレート・履歴・地域別の整理を使うための業務ツールです。
            </p>
          </div>
          <div className="mt-7">
            <PlansTable />
          </div>
          <p className="mt-4 text-[12px] leading-6 text-charcoal/65">
            表示は月額（税込）。対象可否・金額・期限・必要書類は、必ず自治体の公式ページまたは担当窓口で確認する前提です。受給可否の判定や申請の代行は行いません。
          </p>
        </section>

        {/* サンプル相談パック */}
        <section className="mt-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="aw-eyebrow">サンプル</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg">
                相談パックの仕上がりを見てみる
              </h2>
              <p className="mt-3 text-[15px] leading-8 text-charcoal">
                実際に相談者へ渡せる「制度確認パック」の見本です。印刷・PDF保存して、現場での使い心地を確かめてください。
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {SAMPLE_PACKS.map((s) => (
              <TrackedLink
                key={s.slug}
                href={`/pro/samples/${s.slug}`}
                className="aw-card aw-card-hover group flex h-full flex-col"
                eventName="pro_interest_click"
                eventParams={{ source: "pro_sample_card", plan_hint: s.slug }}
              >
                <span className="aw-badge aw-badge--neutral self-start">
                  サンプル
                </span>
                <h3 className="mt-3 text-base font-bold text-fg">{s.title}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-7 text-charcoal/75">
                  {s.audience}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-fg">
                  見本を開く
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </TrackedLink>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="aw-eyebrow">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              想定利用者
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg">
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
                className="rounded-xl border border-soft-gray bg-surface px-4 py-3 text-sm font-medium text-fg"
              >
                {audience}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="aw-eyebrow">安全な境界</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg">
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

        <section
          id="contact"
          className="mt-14 grid scroll-mt-24 gap-8 lg:grid-cols-[0.85fr_1.15fr]"
        >
          <div>
            <p className="aw-eyebrow">問い合わせ</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg">
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
