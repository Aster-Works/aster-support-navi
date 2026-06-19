import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/app/lib/seo";
import { SITE } from "@/app/lib/site";
import { LegalPage } from "@/app/components/LegalPage";
import { OperatorInfo } from "@/app/components/OperatorInfo";

export const metadata: Metadata = buildMetadata({
  title: "このサイトについて",
  description:
    "Aster Support Navi は、自治体ごとに散らばる個人・世帯向けの支援制度を、住所と生活状況から探し、申請前に確認すべきことまで整理する生活支援ナビです。",
  path: "/about",
});

export default function AboutPage() {
  return (
    <LegalPage title="このサイトについて" path="/about" updated="2026-06-18">
      <p>
        {SITE.name} は、自治体ごとに散らばる個人・世帯向けの支援制度（給付・助成・減免・相談窓口）を、
        住所と生活状況から探し、申請前に確認すべきことまで整理する生活支援ナビです。
        {SITE.brand} が運営しています。
      </p>

      <h2>できること</h2>
      <ul>
        <li>自治体・生活イベント・カテゴリから、確認すべき制度を探せます。</li>
        <li>各制度の「対象となる可能性がある人」「支援内容」「申請方法」「公式ページ」「最終確認日」を確認できます。</li>
        <li>かんたん診断で、制度名を知らなくても確認すべき制度の候補を整理できます。</li>
        <li>申請前チェックリストで、必要書類・期限・問い合わせ先を整理できます。</li>
      </ul>

      <h2>大切にしていること</h2>
      <ul>
        <li>
          <strong>断定しません。</strong>
          受給できるかどうかは判定しません。常に「対象となる可能性があります」「公式ページで確認してください」とご案内します。
        </li>
        <li>
          <strong>公式の出典と最終確認日を示します。</strong>
          各制度に公式ページへのリンクと、情報を確認した日付を掲載しています。
        </li>
        <li>
          <strong>申請の代行はしません。</strong>
          本サービスは情報提供です。申請・手続きは各制度の公式窓口で行ってください。
        </li>
        <li>
          <strong>個人情報を必要以上に集めません。</strong>
          かんたん診断の入力は、この端末の中だけで使われ、サーバーには保存しません。
        </li>
      </ul>

      <h2>対応している範囲</h2>
      <p>
        現在は東京23区を中心に、出産・子育て、生活困窮・住まい、介護・高齢、障害・医療などのカテゴリを順次整備しています。
        対応状況は自治体・カテゴリによって異なり、公式ページと最終確認日を確認できた制度から公開しています。
      </p>

      <h2>関連ページ</h2>
      <ul>
        <li>
          <Link href="/disclaimer">免責事項</Link>
        </li>
        <li>
          <Link href="/privacy">プライバシーポリシー</Link>
        </li>
        <li>
          <Link href="/terms">利用規約</Link>
        </li>
      </ul>

      <OperatorInfo />
    </LegalPage>
  );
}
