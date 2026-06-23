"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, AlertTriangle, Plus } from "lucide-react";
import {
  fetchSupports,
  qualityIssues,
  SUPPORTS_LIST_LIMIT,
  type AdminProgram,
} from "@/app/lib/admin/client";
import type { PublishStatus } from "@/app/lib/data/types";

const STATUSES: { key: PublishStatus | "all"; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "draft", label: "下書き" },
  { key: "review", label: "レビュー" },
  { key: "published", label: "公開中" },
  { key: "archived", label: "アーカイブ" },
];

const STATUS_LABEL: Record<PublishStatus, string> = {
  draft: "下書き",
  review: "レビュー",
  published: "公開中",
  archived: "アーカイブ",
};

export default function AdminSupportsPage() {
  const [status, setStatus] = useState<PublishStatus | "all">("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 初回のみ URL の ?status= を反映（prerender 回避のため window 参照。
  // setState はマイクロタスクで遅延＝effect 内の同期 setState を避ける）。
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search).get("status");
    if (sp && STATUSES.some((s) => s.key === sp))
      void Promise.resolve().then(() => setStatus(sp as PublishStatus | "all"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSupports({ status, q })
      .then((r) => {
        if (cancelled) return;
        setRows(r);
        setError(null);
      })
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [status, q]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-fg">制度</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/import" className="btn-secondary">
            CSV取込
          </Link>
          <Link href="/admin/supports/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> 新規作成
          </Link>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            className="aw-chip"
            data-active={status === s.key}
            onClick={() => setStatus(s.key)}
          >
            {s.label}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 rounded-lg border border-soft-gray px-2">
          <Search className="h-4 w-4 text-charcoal/50" aria-hidden="true" />
          <input
            className="bg-transparent py-1.5 text-sm outline-none"
            placeholder="制度名で検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
      {!rows && !error && (
        <p className="mt-6 flex items-center gap-2 text-sm text-charcoal/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          読み込み中…
        </p>
      )}

      {rows && (
        <>
          <p className="mt-4 text-sm text-charcoal/60">
            {rows.length} 件
            {rows.length >= SUPPORTS_LIST_LIMIT &&
              `（上限 ${SUPPORTS_LIST_LIMIT} 件まで表示。絞り込んでください）`}
          </p>
          <div className="mt-2 divide-y divide-soft-gray rounded-xl border border-soft-gray">
            {rows.map((p) => {
              const issues = qualityIssues(p);
              return (
                <Link
                  key={p.id}
                  href={`/admin/supports/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-aster-soft/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">
                      {p.title}
                    </span>
                    <span className="block truncate text-xs text-charcoal/60">
                      {p.prefectureName} {p.municipalityName} ・ {p.slug}
                    </span>
                  </span>
                  {issues.length > 0 && p.status === "published" && (
                    <span
                      className="inline-flex items-center gap-1 text-xs text-amber-700"
                      title={issues.join(" / ")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      {issues.length}
                    </span>
                  )}
                  <span className="aw-badge aw-badge--neutral shrink-0">
                    {STATUS_LABEL[p.status]}
                  </span>
                </Link>
              );
            })}
            {rows.length === 0 && (
              <p className="px-4 py-6 text-sm text-charcoal/60">
                該当する制度がありません。
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
