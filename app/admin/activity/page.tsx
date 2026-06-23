"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Loader2, UserRound } from "lucide-react";
import {
  fetchAdminPrincipal,
  fetchRecentRevisions,
  type AdminPrincipal,
  type SupportRevision,
} from "@/app/lib/admin/client";

function shortDateTime(value: string | null | undefined): string {
  if (!value) return "未設定";
  return value.replace("T", " ").slice(0, 16);
}

function changedFieldNames(rev: SupportRevision): string[] {
  if (
    !rev.beforeJson ||
    !rev.afterJson ||
    typeof rev.beforeJson !== "object" ||
    typeof rev.afterJson !== "object" ||
    Array.isArray(rev.beforeJson) ||
    Array.isArray(rev.afterJson)
  ) {
    return [];
  }
  const before = rev.beforeJson as Record<string, unknown>;
  const after = rev.afterJson as Record<string, unknown>;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .slice(0, 10);
}

function actorLabel(
  rev: SupportRevision,
  principal: AdminPrincipal | null,
): string {
  if (!rev.changedBy) return "system / ops";
  if (principal?.userId === rev.changedBy) {
    return principal.email ? `自分 (${principal.email})` : "自分";
  }
  return `user ${rev.changedBy.slice(0, 8)}`;
}

export default function AdminActivityPage() {
  const [rows, setRows] = useState<SupportRevision[] | null>(null);
  const [principal, setPrincipal] = useState<AdminPrincipal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRecentRevisions(120), fetchAdminPrincipal()])
      .then(([revisionRows, admin]) => {
        setRows(revisionRows);
        setPrincipal(admin);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!rows)
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold text-fg">
        <Activity className="h-5 w-5" aria-hidden="true" />
        変更履歴
      </h1>
      <p className="mt-1 text-sm text-charcoal/70">
        revision に残った制度変更を新しい順に表示します。system / ops はバルク移行や手動SQLの記録です。
      </p>

      <div className="mt-6 divide-y divide-soft-gray rounded-xl border border-soft-gray bg-surface">
        {rows.map((rev) => {
          const fields = changedFieldNames(rev);
          return (
            <div key={rev.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/admin/supports/${rev.supportProgramId}`}
                  className="min-w-0 font-medium text-fg hover:underline"
                >
                  {rev.programTitle ?? rev.programSlug ?? rev.supportProgramId}
                </Link>
                <span className="shrink-0 text-xs text-charcoal/50">
                  {shortDateTime(rev.createdAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal/60">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {actorLabel(rev, principal)}
                </span>
                <span>{rev.changeType}</span>
                {rev.programSlug && <span>{rev.programSlug}</span>}
              </div>
              <p className="mt-1 text-xs text-charcoal/70">
                {rev.changeSummary ?? rev.externalKey ?? "自動記録"}
              </p>
              {fields.length > 0 && (
                <p className="mt-1 text-xs text-charcoal/45">
                  変更: {fields.join(" / ")}
                </p>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="px-4 py-6 text-sm text-charcoal/60">
            変更履歴はまだありません。
          </p>
        )}
      </div>
    </div>
  );
}
