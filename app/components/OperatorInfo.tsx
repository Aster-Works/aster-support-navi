import { SITE } from "@/app/lib/site";

/** 運営者表示（特定商取引法・個人情報保護法の公示用）。
 *  屋号（Aster Works）を公示し、代表者の氏名・住所・電話番号は最小開示方針
 *  （請求により遅滞なく開示）。連絡先メールは SITE.operator.contactEmail。 */
export function OperatorInfo() {
  const op = SITE.operator;
  return (
    <section aria-labelledby="operator-heading" className="aw-card mt-8">
      <h2 id="operator-heading" className="text-base font-bold text-fg">
        運営者の表示
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-[14px] sm:grid-cols-[12rem_1fr]">
        <dt className="font-semibold text-charcoal">サービス名</dt>
        <dd className="text-charcoal">
          {SITE.name}（{op.serviceName} が運営）
        </dd>

        <dt className="font-semibold text-charcoal">運営者</dt>
        <dd className="text-charcoal">
          {op.tradeName}（{op.legalKind}）
        </dd>

        <dt className="font-semibold text-charcoal">
          代表者氏名・所在地・電話番号
        </dt>
        <dd className="text-charcoal">{op.disclosurePolicy}</dd>

        <dt className="font-semibold text-charcoal">お問い合わせ</dt>
        <dd className="text-charcoal">
          <a href={`mailto:${op.contactEmail}`} className="aw-link">
            {op.contactEmail}
          </a>
        </dd>
      </dl>
      <p className="mt-4 text-[12px] text-charcoal/70">
        本欄は特定商取引法・個人情報保護法に基づく公示です。無料の情報提供を主とする現在の運用にあわせ、
        代表者の氏名・所在地・電話番号は最小開示としています。特定商取引法に基づく請求があったときは、遅滞なく開示します。
      </p>
    </section>
  );
}
