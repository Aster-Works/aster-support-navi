import { Globe, CalendarClock, AlarmClock, Tag } from "lucide-react";
import { hasActiveDeadline, type SupportProgram } from "@/app/lib/data/types";
import { deadlineStatus } from "@/app/lib/dates";
import { getTodayIso } from "@/app/lib/now";

/** オンライン申請バッジ（色＋アイコン＋ラベルで二重符号化）。 */
export function OnlineBadge() {
  return (
    <span className="aw-badge aw-badge--online">
      <Globe className="h-3 w-3" aria-hidden="true" />
      オンライン申請できる
    </span>
  );
}

/** 期限バッジ。soon（締切が近い）と open（期限あり）を区別。 */
export function DeadlineBadge({
  endIso,
  label,
}: {
  endIso?: string;
  label?: string;
}) {
  const status = endIso ? deadlineStatus(endIso, getTodayIso()) : "open";
  if (status === "closed") return null;
  const isSoon = status === "soon";
  return (
    <span className="aw-badge aw-badge--deadline">
      {isSoon ? (
        <AlarmClock className="h-3 w-3" aria-hidden="true" />
      ) : (
        <CalendarClock className="h-3 w-3" aria-hidden="true" />
      )}
      {isSoon ? "締切が近い" : label ?? "申請期限あり"}
    </span>
  );
}

export function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="aw-badge aw-badge--category">
      <Tag className="h-3 w-3" aria-hidden="true" />
      {name}
    </span>
  );
}

/** 制度カードのバッジ群をまとめて出す。 */
export function ProgramBadges({
  program,
  categoryName,
}: {
  program: SupportProgram;
  categoryName?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {categoryName && <CategoryBadge name={categoryName} />}
      {program.onlineApplicationAvailable && <OnlineBadge />}
      {hasActiveDeadline(program) && (
        <DeadlineBadge endIso={program.applicationPeriodEnd} />
      )}
    </div>
  );
}
