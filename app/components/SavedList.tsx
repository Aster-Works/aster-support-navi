"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Trash2,
  Globe,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import {
  loadSaved,
  persistSaved,
  removeFromSaved,
  setSavedStatus,
  savedStatusCounts,
  isStale,
  SAVED_CHANGED_EVENT,
  SAVED_STATUS_LABEL,
  SAVED_STATUS_ORDER,
  type SavedItem,
  type SavedStatus,
} from "@/app/lib/saved";
import { formatCheckedAt } from "@/app/lib/dates";
import { track } from "@/app/lib/track";

export function SavedList() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const sync = () => setItems(loadSaved());
    sync();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    // クラウド同期（別端末からの取り込み）でも一覧を更新する。
    window.addEventListener(SAVED_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SAVED_CHANGED_EVENT, sync);
  }, []);

  function remove(slug: string) {
    const next = removeFromSaved(items, slug);
    persistSaved(next);
    setItems(next);
    setAnnounce(`保存リストから削除しました。残り${next.length}件です。`);
  }

  function changeStatus(slug: string, status: SavedStatus) {
    const next = setSavedStatus(items, slug, status);
    persistSaved(next);
    setItems(next);
    track("saved_status_changed", { context: status });
  }

  const today = new Date().toISOString().slice(0, 10);
  const counts = savedStatusCounts(items);

  // 全分岐で常設するライブリージョン（削除・残件数を読み上げる）。
  const liveRegion = (
    <span role="status" aria-live="polite" className="sr-only">
      {announce}
    </span>
  );

  if (!ready) {
    return (
      <>
        {liveRegion}
        <p className="mt-8 text-[14px] text-charcoal/70">読み込み中…</p>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        {liveRegion}
        <div className="aw-card mt-8">
          <Bookmark className="h-6 w-6 text-gold" aria-hidden="true" />
          <p className="mt-3 text-[15px] font-bold text-navy">
            保存した制度はまだありません
          </p>
          <p className="mt-2 text-[14px] leading-7 text-charcoal">
            気になる制度の詳細ページで「保存する」を押すと、ここで後から見返せます（この端末にだけ保存されます）。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/search" className="btn-primary">
              <Search className="h-4 w-4" aria-hidden="true" />
              制度をさがす
            </Link>
            <Link href="/check" className="btn-secondary">
              かんたん診断
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {liveRegion}
      <p className="mt-6 text-[13px] text-charcoal/70">
        {items.length} 件を保存中（この端末にのみ保存）
      </p>
      {/* 進捗サマリ（ステータス別件数） */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SAVED_STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <span
            key={s}
            className="aw-badge aw-badge--neutral"
            title={`${SAVED_STATUS_LABEL[s]} ${counts[s]}件`}
          >
            {SAVED_STATUS_LABEL[s]} {counts[s]}
          </span>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it.slug}>
            <article className="aw-card flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {it.categoryName && (
                    <span className="aw-badge aw-badge--category">
                      {it.categoryName}
                    </span>
                  )}
                  {it.online && (
                    <span className="aw-badge aw-badge--online">
                      <Globe className="h-3 w-3" aria-hidden="true" />
                      オンライン申請できる
                    </span>
                  )}
                  {it.hasDeadline && (
                    <span className="aw-badge aw-badge--deadline">
                      <CalendarClock className="h-3 w-3" aria-hidden="true" />
                      申請期限あり
                    </span>
                  )}
                  {isStale(it.lastOfficialCheckedAt, today) && (
                    <span className="aw-badge aw-badge--info" title="最終確認から時間が経っています">
                      情報が古い可能性
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-[16px] font-bold text-navy">
                  <Link href={`/supports/${it.slug}`} className="hover:underline">
                    {it.title}
                  </Link>
                </h2>
                <p className="mt-1 text-[12px] text-charcoal/70">
                  {it.municipalityName}
                </p>
                <p className="mt-2 line-clamp-2 text-[14px] leading-7 text-charcoal">
                  {it.summary}
                </p>
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-charcoal/70">
                  <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
                  {formatCheckedAt(it.lastOfficialCheckedAt)}
                </p>
              </div>

              <div className="flex shrink-0 gap-2 sm:w-40 sm:flex-col">
                <label className="block">
                  <span className="sr-only">{it.title}の進捗</span>
                  <select
                    className="aw-select w-full text-[13px]"
                    value={it.status ?? "saved"}
                    onChange={(e) =>
                      changeStatus(it.slug, e.target.value as SavedStatus)
                    }
                  >
                    {SAVED_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {SAVED_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <Link
                  href={`/supports/${it.slug}`}
                  className="btn-primary flex-1"
                >
                  詳しく見る
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => remove(it.slug)}
                  className="btn-secondary"
                  aria-label={`${it.title}を保存リストから削除`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  削除
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
