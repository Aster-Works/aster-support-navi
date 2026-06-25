"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Inbox,
  ExternalLink,
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Quote,
} from "lucide-react";
import {
  fetchCandidates,
  updateCandidate,
  approveCandidate,
  rejectCandidate,
  markNeedsMoreInfo,
  type CandidateAdmin,
  type CandidateFilter,
  type CandidatePatch,
} from "@/app/lib/admin/crawler";
import type { ChangeType } from "@/app/lib/crawler/types";

const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  new: "新規",
  updated: "更新",
  unchanged: "変更なし",
  possibly_removed: "削除疑い",
};

const EDITABLE: { key: keyof CandidateAdmin; patch: keyof CandidatePatch; label: string; long?: boolean }[] = [
  { key: "title", patch: "title", label: "制度名" },
  { key: "summary", patch: "summary", label: "概要", long: true },
  { key: "targetPeople", patch: "target_people", label: "対象者", long: true },
  { key: "eligibilityConditions", patch: "eligibility_conditions", label: "対象条件", long: true },
  { key: "benefitDetail", patch: "benefit_detail", label: "支援内容", long: true },
  { key: "amount", patch: "amount", label: "金額・現物" },
  { key: "applicationMethod", patch: "application_method", label: "申請方法", long: true },
  { key: "requiredDocuments", patch: "required_documents", label: "必要書類", long: true },
  { key: "deadline", patch: "deadline", label: "期限" },
  { key: "contactDepartment", patch: "contact_department", label: "問い合わせ窓口" },
  { key: "contactPhone", patch: "contact_phone", label: "電話" },
  { key: "contactUrl", patch: "contact_url", label: "問い合わせURL" },
  { key: "officialUrl", patch: "official_url", label: "公式URL" },
  { key: "category", patch: "category", label: "カテゴリ" },
];

export default function AdminCrawlerReviewPage() {
  const [items, setItems] = useState<CandidateAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [publish, setPublish] = useState(false);

  const [status, setStatus] = useState<CandidateFilter["status"]>("pending");
  const [changeType, setChangeType] = useState<CandidateFilter["changeType"]>("all");
  const [muni, setMuni] = useState("");

  const load = useCallback(() => {
    fetchCandidates({
      status,
      changeType,
      municipalityName: muni || undefined,
    })
      .then((r) => {
        setItems(r);
        setError(null);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [status, changeType, muni]);

  useEffect(() => {
    load();
  }, [load]);

  const municipalities = useMemo(() => {
    const set = new Set<string>();
    for (const it of items ?? []) if (it.municipalityName) set.add(it.municipalityName);
    return [...set].sort();
  }, [items]);

  const openEdit = useCallback((c: CandidateAdmin) => {
    if (openId === c.id) {
      setOpenId(null);
      return;
    }
    const d: Record<string, string> = {};
    for (const f of EDITABLE) {
      const v = c[f.key];
      d[f.patch] = typeof v === "string" ? v : "";
    }
    setDraft(d);
    setPublish(false);
    setOpenId(c.id);
  }, [openId]);

  const onApprove = useCallback(
    async (c: CandidateAdmin) => {
      setBusy(c.id);
      setError(null);
      setNotice(null);
      try {
        // 編集を先に永続化してから承認（編集値をそのまま反映）。
        const patch: CandidatePatch = {};
        for (const f of EDITABLE) {
          const val = draft[f.patch] ?? "";
          (patch as Record<string, unknown>)[f.patch] = val === "" ? null : val;
        }
        await updateCandidate(c.id, patch);
        const merged: CandidateAdmin = {
          ...c,
          title: draft.title || c.title,
          summary: draft.summary || null,
          targetPeople: draft.target_people || null,
          eligibilityConditions: draft.eligibility_conditions || null,
          benefitDetail: draft.benefit_detail || null,
          amount: draft.amount || null,
          applicationMethod: draft.application_method || null,
          requiredDocuments: draft.required_documents || null,
          deadline: draft.deadline || null,
          contactDepartment: draft.contact_department || null,
          contactPhone: draft.contact_phone || null,
          contactUrl: draft.contact_url || null,
          officialUrl: draft.official_url || c.officialUrl,
          category: draft.category || null,
        };
        const res = await approveCandidate(merged, {
          publish,
          categorySlug: draft.category || undefined,
        });
        setNotice(
          `承認しました: ${res.slug}（${res.status}）。公開制度に反映済みです。`,
        );
        setOpenId(null);
        setItems((cur) => (cur ?? []).filter((i) => i.id !== c.id));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setBusy(null);
      }
    },
    [draft, publish],
  );

  const onReject = useCallback(async (c: CandidateAdmin) => {
    setBusy(c.id);
    try {
      await rejectCandidate(c.id);
      setItems((cur) => (cur ?? []).filter((i) => i.id !== c.id));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }, []);

  const onNeedsInfo = useCallback(async (c: CandidateAdmin) => {
    setBusy(c.id);
    try {
      await markNeedsMoreInfo(c.id);
      setItems((cur) => (cur ?? []).filter((i) => i.id !== c.id));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fg">候補レビュー</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          発見クローラが抽出した支援制度候補。confidence が低い順に表示します。確認・編集して承認すると
          公開 support_programs に反映されます（承認するまで公開されません）。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">状態</span>
          <select
            className="aw-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as CandidateFilter["status"])}
          >
            <option value="pending">未対応</option>
            <option value="needs_more_info">要追加情報</option>
            <option value="approved">承認済</option>
            <option value="rejected">却下</option>
            <option value="all">すべて</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">変更種別</span>
          <select
            className="aw-input"
            value={changeType}
            onChange={(e) => setChangeType(e.target.value as CandidateFilter["changeType"])}
          >
            <option value="all">すべて</option>
            <option value="new">新規</option>
            <option value="updated">更新</option>
            <option value="possibly_removed">削除疑い</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-charcoal/70">自治体</span>
          <select className="aw-input" value={muni} onChange={(e) => setMuni(e.target.value)}>
            <option value="">すべて</option>
            {municipalities.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <Link href="/admin/crawler" className="btn-secondary ml-auto">
          クローラ設定へ
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>
      )}

      {!items ? (
        <p className="flex items-center gap-2 text-sm text-charcoal/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          読み込み中…
        </p>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-soft-gray px-4 py-10 text-sm text-charcoal/60">
          <Inbox className="h-5 w-5" aria-hidden="true" />
          該当する候補はありません。
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const open = openId === c.id;
            const conf = c.extractionConfidence;
            return (
              <div key={c.id} className="aw-card p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg">{c.title}</span>
                      <span className="aw-badge bg-aster-soft text-aster">
                        {CHANGE_TYPE_LABELS[c.changeType]}
                      </span>
                      <ConfidenceBadge value={conf} />
                      {c.riskFlags.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700"
                        >
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          {f}
                        </span>
                      ))}
                    </span>
                    <span className="mt-1 block text-xs text-charcoal/60">
                      {c.prefecture ?? ""} {c.municipalityName ?? ""}
                      {c.category ? ` ・ ${c.category}` : ""}
                      {c.sourceName ? ` ・ ${c.sourceName}` : ""}
                      {` ・ ${c.createdAt.slice(0, 10)}`}
                    </span>
                    {c.diffSummary && (
                      <span className="mt-1 block text-xs text-amber-700">{c.diffSummary}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary shrink-0"
                    onClick={() => openEdit(c)}
                  >
                    {open ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                    {open ? "閉じる" : "確認・編集"}
                  </button>
                </div>

                {c.summary && !open && (
                  <p className="mt-2 line-clamp-2 text-sm text-charcoal/80">{c.summary}</p>
                )}

                {c.sourceQuote && (
                  <p className="mt-2 flex gap-1.5 rounded bg-soft-gray/30 px-3 py-2 text-xs text-charcoal/70">
                    <Quote className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="line-clamp-3">{c.sourceQuote}</span>
                  </p>
                )}

                {c.officialUrl && (
                  <a
                    href={c.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-aster hover:underline"
                  >
                    抽出元を開く
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}

                {open && (
                  <div className="mt-4 space-y-3 border-t border-soft-gray pt-4">
                    {!c.municipalityId && (
                      <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        この候補は自治体マスタに紐付いていません。crawler_source に自治体を設定すると
                        承認できます。
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {EDITABLE.map((f) => (
                        <label
                          key={f.patch}
                          className={`block text-sm ${f.long ? "sm:col-span-2" : ""}`}
                        >
                          <span className="mb-1 block text-charcoal/70">{f.label}</span>
                          {f.long ? (
                            <textarea
                              className="aw-input w-full"
                              rows={2}
                              value={draft[f.patch] ?? ""}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, [f.patch]: e.target.value }))
                              }
                            />
                          ) : (
                            <input
                              className="aw-input w-full"
                              value={draft[f.patch] ?? ""}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, [f.patch]: e.target.value }))
                              }
                            />
                          )}
                        </label>
                      ))}
                    </div>

                    <label className="flex items-center gap-2 text-sm text-charcoal/80">
                      <input
                        type="checkbox"
                        checked={publish}
                        onChange={(e) => setPublish(e.target.checked)}
                      />
                      承認と同時に公開する（公開品質ゲートを満たす場合のみ）。既定は下書き保存。
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={busy === c.id || !c.municipalityId}
                        onClick={() => onApprove(c)}
                      >
                        {busy === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        )}
                        承認して反映
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={busy === c.id}
                        onClick={() => onNeedsInfo(c)}
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                        要追加情報
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-red-600"
                        disabled={busy === c.id}
                        onClick={() => onReject(c)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        却下
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value == null) return null;
  const cls =
    value >= 0.7
      ? "bg-green-50 text-green-700"
      : value >= 0.4
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";
  return <span className={`aw-badge ${cls}`}>conf {value.toFixed(2)}</span>;
}
