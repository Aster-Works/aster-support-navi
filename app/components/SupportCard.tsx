import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import type { SupportProgram } from "@/app/lib/data/types";
import { ProgramBadges } from "@/app/components/StatusBadges";
import { formatCheckedAt } from "@/app/lib/dates";

/** 制度一覧で使うカード。詳細ページへ遷移。 */
export function SupportCard({
  program,
  categoryName,
  municipalityName,
}: {
  program: SupportProgram;
  categoryName?: string;
  municipalityName?: string;
}) {
  return (
    <Link
      href={`/supports/${program.slug}`}
      className="aw-card aw-card-hover group flex h-full flex-col"
    >
      <ProgramBadges program={program} categoryName={categoryName} />

      <h3 className="mt-3 text-[17px] font-bold leading-snug text-navy">
        {program.title}
      </h3>

      {municipalityName && (
        <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-charcoal/70">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {municipalityName}
        </p>
      )}

      <p className="mt-2 line-clamp-3 flex-1 text-[14px] leading-7 text-charcoal">
        {program.summary}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-soft-gray/70 pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] text-charcoal/70">
          <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
          {formatCheckedAt(program.lastOfficialCheckedAt)}
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-navy transition-transform group-hover:translate-x-0.5">
          詳しく見る
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
