"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Play,
  Power,
  PowerOff,
  AlertTriangle,
  RefreshCw,
  Bot,
  ExternalLink,
  Inbox,
} from "lucide-react";
import {
  fetchCrawlerSettings,
  updateSetting,
  fetchCrawlerSources,
  setSourceActive,
  fetchCrawlerRuns,
  triggerManualRun,
  type SettingKey,
  type CrawlerSettingsMap,
  type CrawlerSourceAdmin,
  type CrawlerRunAdmin,
} from "@/app/lib/admin/crawler";

const NUMERIC_SETTINGS: { key: SettingKey; label: string; hint: string }[] = [
  { key: "max_sources_per_run", label: "1実行あたり最大source数", hint: "5" },
  { key: "max_urls_per_source", label: "1sourceあたり最大URL数", hint: "40" },
  { key: "max_depth", label: "最大深度", hint: "2" },
  { key: "domain_min_interval_ms", label: "同一ドメイン最小間隔(ms)", hint: "2000" },
  { key: "auto_pause_error_threshold", label: "自動停止する連続エラー回数", hint: "3" },
];

export default function AdminCrawlerPage() {
  const [settings, setSettings] = useState<CrawlerSettingsMap | null>(null);
  const [sources, setSources] = useState<CrawlerSourceAdmin[] | null>(null);
  const [runs, setRuns] = useState<CrawlerRunAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([fetchCrawlerSettings(), fetchCrawlerSources(), fetchCrawlerRuns()])
      .then(([s, src, r]) => {
        setSettings(s);
        setSources(src);
        setRuns(r);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSetting = useCallback(
    async (key: SettingKey, value: boolean) => {
      setBusy(key);
      setNotice(null);
      try {
        await updateSetting(key, value);
        setSettings((cur) => (cur ? { ...cur, [key]: value } : cur));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const saveNumber = useCallback(async (key: SettingKey, raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    setBusy(key);
    try {
      await updateSetting(key, n);
      setSettings((cur) => (cur ? { ...cur, [key]: n } : cur));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }, []);

  const onToggleSource = useCallback(async (s: CrawlerSourceAdmin) => {
    setBusy(s.id);
    try {
      await setSourceActive(s.id, !s.isActive);
      load();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }, [load]);

  const onRun = useCallback(async (sourceId?: string) => {
    setBusy(sourceId ?? "run-all");
    setNotice(null);
    setError(null);
    try {
      const r = await triggerManualRun(sourceId);
      setNotice(
        `実行: ${r.status} ・ source ${r.sources} ・ URL ${r.urlsChecked} ・ 変更 ${r.changedDocuments} ・ 候補 ${r.candidatesCreated} ・ エラー ${r.errors}` +
          (r.skipReason ? ` ・ skip: ${r.skipReason}` : ""),
      );
      load();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }, [load]);

  if (error && !settings) return <p className="text-sm text-red-600">{error}</p>;
  if (!settings || !sources || !runs) {
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );
  }

  const crawlerEnabled = Boolean(settings.crawler_enabled);
  const aiEnabled = Boolean(settings.ai_extraction_enabled);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-fg">発見クローラ</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          自治体公式サイトを日次で巡回し、変更があったページだけ AI で支援制度候補を抽出します。
          公開反映は
          <Link href="/admin/crawler/review" className="text-aster hover:underline">
            候補レビュー
          </Link>
          で承認したものだけです。
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>
      )}

      {/* 全体スイッチ */}
      <section className="aw-card p-5">
        <h2 className="text-sm font-semibold text-fg">全体の稼働状態</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ToggleRow
            label="クローラ全体"
            on={crawlerEnabled}
            busy={busy === "crawler_enabled"}
            onToggle={() => toggleSetting("crawler_enabled", !crawlerEnabled)}
            onText="稼働中（日次cronが実行）"
            offText="停止中（cronは即終了）"
          />
          <ToggleRow
            label="AI抽出"
            icon={<Bot className="h-4 w-4" aria-hidden="true" />}
            on={aiEnabled}
            busy={busy === "ai_extraction_enabled"}
            onToggle={() => toggleSetting("ai_extraction_enabled", !aiEnabled)}
            onText="有効（変更ページを抽出）"
            offText="無効（クロール・変更検知のみ）"
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NUMERIC_SETTINGS.map((s) => (
            <label key={s.key} className="block text-sm">
              <span className="mb-1 block text-charcoal/80">{s.label}</span>
              <input
                type="number"
                min={1}
                defaultValue={String(settings[s.key] ?? s.hint)}
                onBlur={(e) => saveNumber(s.key, e.target.value)}
                className="aw-input w-full"
                disabled={busy === s.key}
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={busy === "run-all"}
            onClick={() => onRun()}
          >
            {busy === "run-all" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            今すぐ手動実行（全体）
          </button>
          <span className="text-xs text-charcoal/60">
            手動実行は全体スイッチが停止中でも走ります（ANTHROPIC_API_KEY 未設定なら抽出はスキップ）。
          </span>
          <button type="button" className="btn-secondary ml-auto" onClick={load}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            更新
          </button>
        </div>
      </section>

      {/* source 一覧 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg">
          クロール対象（{sources.length}）
        </h2>
        <div className="divide-y divide-soft-gray rounded-xl border border-soft-gray">
          {sources.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{s.name}</span>
                  {s.isActive ? (
                    <span className="aw-badge bg-green-50 text-green-700">稼働</span>
                  ) : (
                    <span className="aw-badge bg-soft-gray text-charcoal/70">停止</span>
                  )}
                  {!s.municipalityId && (
                    <span className="aw-badge bg-amber-50 text-amber-700">
                      自治体未紐付け
                    </span>
                  )}
                  {s.consecutiveErrorCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      連続エラー {s.consecutiveErrorCount}
                    </span>
                  )}
                </span>
                <a
                  href={s.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-charcoal/60 hover:underline"
                >
                  {s.baseUrl}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
                <span className="mt-1 block text-xs text-charcoal/50">
                  {s.prefecture ?? ""} {s.municipalityName ?? ""}
                  {s.lastCheckedAt ? ` ・ 最終巡回 ${s.lastCheckedAt.slice(0, 16).replace("T", " ")}` : " ・ 未巡回"}
                  {s.lastSuccessAt ? ` ・ 最終成功 ${s.lastSuccessAt.slice(0, 10)}` : ""}
                </span>
                {s.pausedReason && (
                  <span className="mt-1 block text-xs text-amber-700">
                    停止理由: {s.pausedReason}
                  </span>
                )}
                {s.lastErrorMessage && (
                  <span className="mt-1 block truncate text-xs text-red-600">
                    直近エラー: {s.lastErrorMessage}
                  </span>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy === s.id}
                  onClick={() => onRun(s.id)}
                  title="このsourceだけ手動実行"
                >
                  {busy === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  実行
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy === s.id}
                  onClick={() => onToggleSource(s)}
                >
                  {s.isActive ? (
                    <PowerOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Power className="h-4 w-4" aria-hidden="true" />
                  )}
                  {s.isActive ? "停止" : "再開"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 実行ログ */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg">最近の実行ログ</h2>
        {runs.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-soft-gray px-4 py-8 text-sm text-charcoal/60">
            <Inbox className="h-5 w-5" aria-hidden="true" />
            まだ実行されていません。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-soft-gray">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft-gray/40 text-xs text-charcoal/70">
                <tr>
                  <th className="px-3 py-2">開始</th>
                  <th className="px-3 py-2">種別</th>
                  <th className="px-3 py-2">状態</th>
                  <th className="px-3 py-2">source</th>
                  <th className="px-3 py-2">URL</th>
                  <th className="px-3 py-2">変更</th>
                  <th className="px-3 py-2">候補</th>
                  <th className="px-3 py-2">エラー</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray">
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-charcoal/70">
                      {r.startedAt.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-3 py-2">{r.trigger}</td>
                    <td className="px-3 py-2">
                      <RunStatusBadge status={r.status} />
                      {r.skipReason ? (
                        <span className="ml-1 text-xs text-charcoal/50">{r.skipReason}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{r.totalSources}</td>
                    <td className="px-3 py-2">{r.totalUrlsChecked}</td>
                    <td className="px-3 py-2">{r.totalChangedDocuments}</td>
                    <td className="px-3 py-2">{r.totalCandidatesCreated}</td>
                    <td className="px-3 py-2">
                      {r.totalErrors > 0 ? (
                        <span className="text-red-600">{r.totalErrors}</span>
                      ) : (
                        0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  icon,
  on,
  busy,
  onToggle,
  onText,
  offText,
}: {
  label: string;
  icon?: React.ReactNode;
  on: boolean;
  busy: boolean;
  onToggle: () => void;
  onText: string;
  offText: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-soft-gray px-4 py-3">
      <span>
        <span className="flex items-center gap-2 font-medium text-fg">
          {icon}
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-charcoal/60">
          {on ? onText : offText}
        </span>
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-pressed={on}
        className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
          on ? "bg-green-500" : "bg-soft-gray"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            on ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-green-50 text-green-700",
    partial: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
    skipped: "bg-soft-gray text-charcoal/70",
    running: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`aw-badge ${map[status] ?? "bg-soft-gray text-charcoal/70"}`}>
      {status}
    </span>
  );
}
