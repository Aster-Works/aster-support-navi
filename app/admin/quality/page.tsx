"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import {
  fetchSupports,
  qualityIssues,
  freshness,
  type AdminProgram,
} from "@/app/lib/admin/client";

export default function AdminQualityPage() {
  const [rows, setRows] = useState<AdminProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    fetchSupports({ status: "published" })
      .then(setRows)
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

  const failing = rows
    .map((p) => ({ p, issues: qualityIssues(p) }))
    .filter((x) => x.issues.length > 0);
  const stale = rows.filter((p) => freshness(p, today) === "stale");

  return (
    <div>
      <h1 className="text-xl font-semibold text-navy">品質チェック</h1>
      <p className="mt-1 text-sm text-charcoal/70">
        公開中なのに品質ゲートを満たさない制度と、最終確認から91日以上経った制度。
      </p>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          品質ゲート未達（公開中）: {failing.length}
        </h2>
        <div className="mt-2 divide-y divide-soft-gray rounded-xl border border-soft-gray">
          {failing.map(({ p, issues }) => (
            <Link
              key={p.id}
              href={`/admin/supports/${p.id}`}
              className="block px-4 py-3 hover:bg-aster-soft/40"
            >
              <div className="font-medium text-navy">{p.title}</div>
              <div className="text-xs text-charcoal/60">
                {p.prefectureName} {p.municipalityName}
              </div>
              <div className="mt-1 text-xs text-amber-700">
                {issues.join(" / ")}
              </div>
            </Link>
          ))}
          {failing.length === 0 && (
            <p className="px-4 py-6 text-sm text-charcoal/60">
              公開中の制度はすべて品質ゲートを満たしています。
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-charcoal/80">
          <Clock className="h-4 w-4" aria-hidden="true" />
          最終確認が古い（91日以上）: {stale.length}
        </h2>
        <div className="mt-2 divide-y divide-soft-gray rounded-xl border border-soft-gray">
          {stale.slice(0, 100).map((p) => (
            <Link
              key={p.id}
              href={`/admin/supports/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-aster-soft/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-navy">
                  {p.title}
                </span>
                <span className="block truncate text-xs text-charcoal/60">
                  {p.prefectureName} {p.municipalityName}
                </span>
              </span>
              <span className="shrink-0 text-xs text-charcoal/60">
                {p.lastOfficialCheckedAt}
              </span>
            </Link>
          ))}
          {stale.length === 0 && (
            <p className="px-4 py-6 text-sm text-charcoal/60">
              古い制度はありません。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
