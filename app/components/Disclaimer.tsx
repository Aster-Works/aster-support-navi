import { Info } from "lucide-react";
import {
  DISCLAIMER_PROGRAM,
  DISCLAIMER_DIAGNOSIS,
  DISCLAIMER_SHORT,
} from "@/app/lib/copy";

type Variant = "program" | "diagnosis" | "short";

const TEXT: Record<Variant, string> = {
  program: DISCLAIMER_PROGRAM,
  diagnosis: DISCLAIMER_DIAGNOSIS,
  short: DISCLAIMER_SHORT,
};

/** 断定回避の免責コールアウト（不変条件 §1, §3, §4）。 */
export function Disclaimer({
  variant = "program",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <aside
      role="note"
      aria-label="ご確認ください"
      className={`aw-callout flex gap-3 ${className}`}
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
      <p className="text-[13px] leading-7 text-charcoal">{TEXT[variant]}</p>
    </aside>
  );
}
