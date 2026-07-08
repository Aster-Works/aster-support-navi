"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Inbox, ExternalLink, RefreshCw } from "lucide-react";
import {
  fetchCoverage,
  fetchCoverageTopics,
  type CoverageAdmin,
  type CoverageFilter,
  type CoverageTopicOption,
} from "@/app/lib/admin/coverage";

const STATUS_LABELS: Record<string, string> = {
  not_started: "未着手",
  researching: "調査中",
  found: "確認済み",
  not_found_on_official_site: "未確認（公式で見つからず）",
  needs_review: "要確認",
  not_applicable: "対象外",
};

const STATUS_CLASS: Record<string, string> = {
  not_started: "bg-soft-gray text-charcoal/70",
  researching: "bg-blue-50 text-blue-700",
  found: "bg-green-50 text-green-700",
  not_found_on_official_site: "bg-amber-50 text-amber-700",
  needs_review: "bg-amber-50 text-amber-700",
  not_applicable: "bg-soft-gray text-charcoal/70",
};

export default function AdminCoveragePage() {
  const [items, setItems] = useState<CoverageAdmin[] | null>(null);
  const [topics, setTopics] = useState<CoverageTopicOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [researchStatus, setResearchStatus] =
    useState<CoverageFilter["researchStatus"]>("all");
  const [topicSlug, setTopicSlug] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    fetchCoverage({ researchStatus, topicSlug: topicSlug || undefined, q: q || undefined })
      .then((r) => {
        setItems(r);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [researchStatus, topicSlug, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchCoverageTopics()
      .then(setTopics)
      .catch(() => setTopics([]));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fg">調査カバレッジ台帳</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          自治体×テーマごとの調査状況（municipality_topic_coverage）を一覧します。
          「未確認」「要確認」は制度が無いと断定するものではなく、確認日時点で公式サイト上に
          見つからなかった、または人の確認待ちという内部状態です。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">調査状況</span>
          <select
            className="aw-input"
            value={researchStatus}
            onChange={(e) =>
              setResearchStatus(e.target.value as CoverageFilter["researchStatus"])
            }
          >
            <option value="all">すべて</option>
            {Object.entries(STATUS_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">テーマ</span>
          <select
            className="aw-input"
            value={topicSlug}
            onChange={(e) => setTopicSlug(e.target.value)}
          >
            <option value="">すべて</option>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">自治体名検索</span>
          <input
            className="aw-input"
            placeholder="札幌市 など"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <button type="button" className="btn-secondary" onClick={load}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          更新
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!items ? (
        <p className="flex items-center gap-2 text-sm text-charcoal/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          読み込み中…
        </p>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-soft-gray px-4 py-10 text-sm text-charcoal/60">
          <Inbox className="h-5 w-5" aria-hidden="true" />
          該当する行はありません。
        </div>
      ) : (
        <>
          <p className="text-xs text-charcoal/60">{items.length} 件</p>
          <div className="divide-y divide-soft-gray rounded-xl border border-soft-gray">
            {items.map((c) => (
              <div key={c.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg">
                      {c.prefectureName ?? ""} {c.municipalityName ?? "（不明）"}
                    </span>
                    <span className="text-xs text-charcoal/50">{c.topicName ?? ""}</span>
                    <span
                      className={`aw-badge ${STATUS_CLASS[c.researchStatus] ?? "bg-soft-gray text-charcoal/70"}`}
                    >
                      {STATUS_LABELS[c.researchStatus] ?? c.researchStatus}
                    </span>
                  </span>
                  {c.lastResearchedAt && (
                    <span className="mt-1 block text-xs text-charcoal/60">
                      確認日 {c.lastResearchedAt}
                    </span>
                  )}
                  {c.researchNote && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-charcoal/60">
                        調査メモを見る
                      </summary>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-charcoal/70">
                        {c.researchNote}
                      </p>
                    </details>
                  )}
                </span>
                {c.officialSourceUrl && (
                  <a
                    href={c.officialSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary shrink-0"
                  >
                    開く
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
