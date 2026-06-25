"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Inbox,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  fetchCrawledDocuments,
  fetchCrawlerSources,
  type CrawledDocAdmin,
  type CrawledDocFilter,
  type CrawlerSourceAdmin,
} from "@/app/lib/admin/crawler";

const CRAWL_STATUS_LABELS: Record<string, string> = {
  changed: "変更あり",
  unchanged: "変更なし",
  fetched: "取得",
  error: "エラー",
  blocked: "robots等で取得不可",
  not_found: "404/削除",
  skipped: "スキップ",
  pending: "未取得",
};

export default function AdminCrawlerDocumentsPage() {
  const [items, setItems] = useState<CrawledDocAdmin[] | null>(null);
  const [sources, setSources] = useState<CrawlerSourceAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [changedOnly, setChangedOnly] = useState(true);
  const [crawlStatus, setCrawlStatus] = useState<CrawledDocFilter["crawlStatus"]>("all");
  const [sourceId, setSourceId] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    fetchCrawledDocuments({
      changedOnly,
      crawlStatus,
      sourceId: sourceId || undefined,
      q: q || undefined,
    })
      .then((r) => {
        setItems(r);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [changedOnly, crawlStatus, sourceId, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchCrawlerSources()
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fg">変更ページ一覧</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          クローラが取得した公式ページのうち、前回から内容が変わったものを新しい順に表示します。
          AI抽出がオフでも「どの公式ページがいつ更新されたか」を確認でき、開いて自分で内容をチェックできます。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm text-charcoal/80">
          <input
            type="checkbox"
            checked={changedOnly}
            onChange={(e) => setChangedOnly(e.target.checked)}
          />
          変更があったページのみ
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">取得状態</span>
          <select
            className="aw-input"
            value={crawlStatus}
            onChange={(e) =>
              setCrawlStatus(e.target.value as CrawledDocFilter["crawlStatus"])
            }
          >
            <option value="all">すべて</option>
            <option value="changed">変更あり</option>
            <option value="unchanged">変更なし</option>
            <option value="error">エラー</option>
            <option value="blocked">取得不可</option>
            <option value="not_found">404/削除</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">自治体</span>
          <select
            className="aw-input"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            <option value="">すべて</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">URL・タイトル検索</span>
          <input
            className="aw-input"
            placeholder="/kosodate/ など"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <button type="button" className="btn-secondary" onClick={load}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          更新
        </button>
        <Link href="/admin/crawler" className="btn-secondary ml-auto">
          クローラ設定へ
        </Link>
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
          該当するページはありません。
          {changedOnly && "（まだクロールしていない、または変更が検出されていません）"}
        </div>
      ) : (
        <>
          <p className="text-xs text-charcoal/60">{items.length} 件</p>
          <div className="divide-y divide-soft-gray rounded-xl border border-soft-gray">
            {items.map((d) => (
              <div key={d.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-fg">
                      {d.title || d.url}
                    </span>
                    <CrawlStatusBadge status={d.crawlStatus} />
                    {typeof d.statusCode === "number" && (
                      <span className="text-xs text-charcoal/50">HTTP {d.statusCode}</span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-charcoal/60">
                    {d.prefecture ?? ""} {d.municipalityName ?? d.sourceName ?? ""}
                    {d.changedAt
                      ? ` ・ 変更 ${fmt(d.changedAt)}`
                      : d.fetchedAt
                        ? ` ・ 取得 ${fmt(d.fetchedAt)}`
                        : ""}
                  </span>
                  {d.errorMessage && (
                    <span className="mt-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      {d.errorMessage}
                    </span>
                  )}
                </span>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary shrink-0"
                >
                  開く
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function fmt(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

function CrawlStatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    changed: "bg-amber-50 text-amber-700",
    unchanged: "bg-soft-gray text-charcoal/70",
    fetched: "bg-blue-50 text-blue-700",
    error: "bg-red-50 text-red-700",
    blocked: "bg-red-50 text-red-700",
    not_found: "bg-red-50 text-red-700",
    skipped: "bg-soft-gray text-charcoal/70",
    pending: "bg-soft-gray text-charcoal/70",
  };
  return (
    <span className={`aw-badge ${cls[status] ?? "bg-soft-gray text-charcoal/70"}`}>
      {CRAWL_STATUS_LABELS[status] ?? status}
    </span>
  );
}
