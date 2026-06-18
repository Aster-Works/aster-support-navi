import { ShieldCheck, CalendarCheck2, FileText } from "lucide-react";
import type { SupportProgram } from "@/app/lib/data/types";
import { formatJaDate } from "@/app/lib/dates";
import { OfficialLink } from "@/app/components/OfficialLink";

/** 制度詳細の「公式情報」ブロック（不変条件 §3）。
 *  公式URL・最終確認日を必ず本文に表示する。 */
export function TrustSignal({ program }: { program: SupportProgram }) {
  return (
    <section
      aria-labelledby="official-heading"
      className="aw-card border-ok/30 bg-ok-soft/40"
    >
      <h2
        id="official-heading"
        className="flex items-center gap-2 text-base font-bold text-navy"
      >
        <ShieldCheck className="h-5 w-5 text-ok" aria-hidden="true" />
        公式情報
      </h2>

      <dl className="mt-4 space-y-3 text-[14px]">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <dt className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
            <CalendarCheck2 className="h-4 w-4 text-charcoal/70" aria-hidden="true" />
            最終確認日
          </dt>
          <dd className="text-charcoal">
            {formatJaDate(program.lastOfficialCheckedAt) || "未設定"}
            <span className="ml-1 text-[12px] text-charcoal/70">時点の情報</span>
          </dd>
        </div>
        {program.officialSourceTitle && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <dt className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
              <FileText className="h-4 w-4 text-charcoal/70" aria-hidden="true" />
              出典
            </dt>
            <dd className="text-charcoal">{program.officialSourceTitle}</dd>
          </div>
        )}
      </dl>

      <p className="mt-4 text-[13px] leading-7 text-charcoal">
        制度の対象可否・金額・期限・必要書類は変わることがあります。申請の前に、必ず公式ページで最新の情報を確認してください。
      </p>

      <div className="mt-4">
        <OfficialLink url={program.officialUrl} />
      </div>
    </section>
  );
}
