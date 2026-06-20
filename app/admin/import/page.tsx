"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import {
  fetchCategoryOptions,
  fetchLifeEventOptions,
  fetchMunicipalityOptions,
  importPrograms,
  type ImportResult,
} from "@/app/lib/admin/client";
import {
  parseCsv,
  validateImport,
  REQUIRED_COLUMNS,
  type ImportContext,
  type ValidateResult,
} from "@/app/lib/admin/csv";

export default function AdminImportPage() {
  const [text, setText] = useState("");
  const [ctx, setCtx] = useState<ImportContext | null>(null);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchCategoryOptions(),
      fetchLifeEventOptions(),
      fetchMunicipalityOptions(),
    ])
      .then(([cats, events, munis]) => {
        setCtx({
          categorySlugs: new Set(cats.map((c) => c.slug)),
          lifeEventSlugs: new Set(events.map((e) => e.slug)),
          municipalityKeys: new Set(
            munis.map((m) => `${m.prefectureSlug}/${m.slug}`),
          ),
        });
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const onValidate = () => {
    if (!ctx) return;
    setImported(null);
    setResult(validateImport(parseCsv(text), ctx));
  };

  const onImport = () => {
    if (!result || result.valid.length === 0) return;
    setBusy(true);
    setError(null);
    importPrograms(result.valid)
      .then((r) => setImported(r))
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-navy">CSV 取込</h1>
      <p className="mt-1 text-sm text-charcoal/70">
        制度データを CSV で一括登録・更新します（slug 衝突は更新）。published
        にする行は品質ゲートを満たす必要があります。
      </p>

      <details className="mt-3 rounded-lg bg-soft-gray/30 p-3 text-xs text-charcoal/70">
        <summary className="cursor-pointer font-medium">必須列と書式</summary>
        <p className="mt-2 break-words">{REQUIRED_COLUMNS.join(", ")}</p>
        <p className="mt-1">
          category_slugs / life_event_slugs はセル内で <code>|</code>
          （パイプ）区切り。日付は YYYY-MM-DD。status は
          draft/review/published/archived。
        </p>
      </details>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <textarea
        className="aw-input mt-4 h-48 w-full font-mono text-xs"
        placeholder="CSV を貼り付け（1行目はヘッダ）"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={!ctx || !text.trim()}
          onClick={onValidate}
        >
          検証
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={busy || !result || result.valid.length === 0 || !!result.headerError}
          onClick={onImport}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          {result ? `取り込む（${result.valid.length} 件）` : "取り込む"}
        </button>
      </div>

      {result?.headerError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {result.headerError}
        </p>
      )}

      {result && !result.headerError && (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            取込可能 {result.valid.length} 件
            {result.errors.length > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                エラー {result.errors.length} 件
              </span>
            )}
          </p>
          {result.errors.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-soft-gray text-xs">
              {result.errors.map((e) => (
                <div key={e.line} className="border-b border-soft-gray px-3 py-2 last:border-0">
                  <span className="font-medium text-navy">行 {e.line}</span>:{" "}
                  <span className="text-amber-700">{e.messages.join(" / ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {imported && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          <p className="font-medium">取込完了: 成功 {imported.ok} 件</p>
          {imported.failed.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-red-700">
              {imported.failed.map((f) => (
                <li key={f.slug}>
                  {f.slug}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
