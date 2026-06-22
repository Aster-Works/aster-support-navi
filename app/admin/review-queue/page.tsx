"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Check, Inbox, ExternalLink } from "lucide-react";
import {
  fetchReviewQueue,
  resolveReviewItem,
  type ReviewItem,
} from "@/app/lib/admin/client";

export default function AdminReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchReviewQueue()
      .then((r) => {
        setItems(r);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onResolve = useCallback(
    async (id: string) => {
      setBusy(id);
      try {
        await resolveReviewItem(id);
        setItems((cur) => (cur ?? []).filter((i) => i.id !== id));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items)
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );

  return (
    <div>
      <h1 className="text-xl font-semibold text-navy">レビューキュー</h1>
      <p className="mt-1 text-sm text-charcoal/70">
        更新確認や差分検知で「要確認」になった制度。確認できたら解決にします。
      </p>

      {items.length === 0 ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-dashed border-soft-gray px-4 py-10 text-sm text-charcoal/60">
          <Inbox className="h-5 w-5" aria-hidden="true" />
          未対応のレビュー項目はありません。
        </div>
      ) : (
        <div className="mt-4 divide-y divide-soft-gray rounded-xl border border-soft-gray">
          {items.map((it) => (
            <div key={it.id} className="flex items-start gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                {it.programId ? (
                  <Link
                    href={`/admin/supports/${it.programId}`}
                    className="inline-flex max-w-full items-center gap-1 font-medium text-navy hover:underline"
                  >
                    <span className="truncate">
                      {it.programTitle ?? it.programSlug ?? "制度を開く"}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="block truncate font-medium text-navy">
                    （制度未指定）
                  </span>
                )}
                <span className="mt-1 block text-xs text-charcoal/60">
                  {it.reason} ・ 優先度 {it.priority} ・ {it.severity}
                  {it.issueCode ? ` ・ ${it.issueCode}` : ""}
                  {it.detectedBy ? ` ・ ${it.detectedBy}` : ""}
                  {it.dueOn ? ` ・ 期限 ${it.dueOn}` : ""}
                </span>
                <span className="mt-1 block text-xs text-charcoal/50">
                  作成 {it.createdAt.slice(0, 10)}
                  {it.sourceLastCheckedAt
                    ? ` ・ 出典確認 ${it.sourceLastCheckedAt}`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={busy === it.id}
                onClick={() => onResolve(it.id)}
                className="btn-secondary shrink-0"
              >
                {busy === it.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                解決
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
