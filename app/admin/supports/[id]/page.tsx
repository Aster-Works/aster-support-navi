"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ExternalLink,
  ArrowLeft,
  Save,
  AlertTriangle,
  Check,
  History,
  LinkIcon,
  Plus,
  Inbox,
} from "lucide-react";
import {
  fetchSupport,
  updateSupport,
  setStatus,
  setProgramTags,
  fetchSupportSources,
  saveSupportSource,
  fetchSupportRevisions,
  fetchReviewQueue,
  resolveReviewItem,
  fetchCategoryOptions,
  fetchLifeEventOptions,
  qualityIssues,
  publishBlockingIssues,
  affectedPaths,
  revalidatePublic,
  type AdminProgram,
  type SupportPatch,
  type MasterOption,
  type SupportSource,
  type SupportRevision,
  type ReviewItem,
} from "@/app/lib/admin/client";
import { TagPicker } from "@/app/admin/TagPicker";
import type { BenefitType, PublishStatus, SourceConfidence } from "@/app/lib/data/types";

const TEXT_FIELDS: { key: keyof SupportPatch; label: string; area?: boolean }[] = [
  { key: "title", label: "制度名" },
  { key: "summary", label: "概要", area: true },
  { key: "plain_language_summary", label: "やさしい概要", area: true },
  { key: "target_people", label: "対象となる可能性がある人", area: true },
  { key: "benefit_amount_text", label: "支援内容・金額" },
  { key: "application_deadline_text", label: "申請期限" },
  { key: "application_method_text", label: "申請方法", area: true },
  { key: "required_documents_text", label: "必要書類", area: true },
  { key: "contact_name", label: "問い合わせ先" },
  { key: "contact_phone", label: "電話" },
  { key: "contact_url", label: "問い合わせURL" },
  { key: "official_url", label: "公式URL" },
  { key: "official_source_title", label: "出典ページタイトル" },
  { key: "last_official_checked_at", label: "最終確認日 (YYYY-MM-DD)" },
  { key: "disclaimer_note", label: "注意書き", area: true },
];

const BENEFIT_TYPES: BenefitType[] = ["cash", "subsidy", "reduction", "service", "consultation", "other"];
const CONFIDENCES: SourceConfidence[] = ["high", "medium", "low"];
const NEXT_STATUS: Record<PublishStatus, { to: PublishStatus; label: string }[]> = {
  draft: [{ to: "review", label: "レビューへ" }],
  review: [
    { to: "published", label: "公開する" },
    { to: "draft", label: "下書きに戻す" },
  ],
  published: [{ to: "archived", label: "アーカイブ" }],
  archived: [{ to: "draft", label: "下書きに戻す" }],
};

const SOURCE_KINDS = [
  { value: "official", label: "公式" },
  { value: "related", label: "関連" },
  { value: "archive", label: "アーカイブ" },
  { value: "manual", label: "手動確認" },
];

const SOURCE_QUALITY_STATES = [
  { value: "ok", label: "OK" },
  { value: "unchecked", label: "未確認" },
  { value: "needs_review", label: "要確認" },
  { value: "broken", label: "リンク切れ" },
  { value: "low_confidence", label: "低信頼" },
];

interface SourceForm {
  id?: string;
  url: string;
  title: string;
  publisher: string;
  officialCheckedAt: string;
  sourceKind: string;
  qualityState: string;
  detectedIssueCodesText: string;
  reviewIntervalDays: string;
  notes: string;
}

function toForm(p: AdminProgram): SupportPatch {
  return {
    title: p.title,
    summary: p.summary,
    plain_language_summary: p.plainLanguageSummary ?? "",
    target_people: p.targetPeople,
    benefit_amount_text: p.benefitAmountText ?? "",
    application_deadline_text: p.applicationDeadlineText ?? "",
    application_method_text: p.applicationMethodText,
    required_documents_text: p.requiredDocumentsText ?? "",
    contact_name: p.contactName ?? "",
    contact_phone: p.contactPhone ?? "",
    contact_url: p.contactUrl ?? "",
    official_url: p.officialUrl,
    official_source_title: p.officialSourceTitle ?? "",
    last_official_checked_at: p.lastOfficialCheckedAt,
    disclaimer_note: p.disclaimerNote ?? "",
    benefit_type: p.benefitType,
    source_confidence: p.sourceConfidence,
    online_application_available: p.onlineApplicationAvailable ?? null,
  };
}

function toSourceForm(
  source: SupportSource | undefined,
  program: AdminProgram | null,
): SourceForm {
  return {
    id: source?.id,
    url: source?.url ?? program?.officialUrl ?? "",
    title: source?.title ?? program?.officialSourceTitle ?? "",
    publisher: source?.publisher ?? program?.municipalityName ?? "",
    officialCheckedAt:
      source?.officialCheckedAt ?? program?.lastOfficialCheckedAt ?? "",
    sourceKind: source?.sourceKind ?? "official",
    qualityState: source?.qualityState ?? "unchecked",
    detectedIssueCodesText: (source?.detectedIssueCodes ?? []).join("\n"),
    reviewIntervalDays: String(source?.reviewIntervalDays ?? 90),
    notes: source?.notes ?? "",
  };
}

function parseIssueCodes(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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
    .slice(0, 8);
}

export default function AdminSupportEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [program, setProgram] = useState<AdminProgram | null>(null);
  const [form, setForm] = useState<SupportPatch>({});
  const [sources, setSources] = useState<SupportSource[]>([]);
  const [sourceForm, setSourceForm] = useState<SourceForm>(() =>
    toSourceForm(undefined, null),
  );
  const [revisions, setRevisions] = useState<SupportRevision[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [catOptions, setCatOptions] = useState<MasterOption[]>([]);
  const [eventOptions, setEventOptions] = useState<MasterOption[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    return Promise.all([
      fetchSupport(id),
      fetchSupportSources(id),
      fetchSupportRevisions(id),
      fetchReviewQueue({ programId: id, limit: 20 }),
    ])
      .then(([p, sourceRows, revisionRows, queueRows]) => {
        setProgram(p);
        setSources(sourceRows);
        setRevisions(revisionRows);
        setReviewItems(queueRows);
        if (p) {
          setForm(toForm(p));
          setSelectedCats(p.categorySlugs);
          setSelectedEvents(p.lifeEventSlugs);
          setSourceForm((current) => {
            const selected = sourceRows.find((s) => s.id === current.id);
            return toSourceForm(selected ?? sourceRows[0], p);
          });
        }
      })
      .catch((e) =>
        setMsg({ ok: false, text: String((e as Error).message ?? e) }),
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    void load();
    Promise.all([fetchCategoryOptions(), fetchLifeEventOptions()])
      .then(([c, e]) => {
        setCatOptions(c);
        setEventOptions(e);
      })
      .catch(() => {});
  }, [load]);

  const onSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setMsg(null);
      try {
        await updateSupport(id, form);
        await setProgramTags(id, selectedCats, selectedEvents);
        if (program) {
          await revalidatePublic(
            affectedPaths({
              prefectureSlug: program.prefectureSlug,
              municipalitySlug: program.municipalitySlug,
              slug: program.slug,
              categorySlugs: selectedCats,
              lifeEventSlugs: selectedEvents,
            }),
          );
        }
        await load();
        setMsg({ ok: true, text: "保存し、公開ページへ反映しました。" });
      } catch (err) {
        setMsg({ ok: false, text: String((err as Error).message ?? err) });
      } finally {
        setSaving(false);
      }
    },
    [id, form, load, selectedCats, selectedEvents, program],
  );

  const onStatus = useCallback(
    async (to: PublishStatus) => {
      if (!program) return;
      setSaving(true);
      setMsg(null);
      try {
        await setStatus(program, to);
        await revalidatePublic(
          affectedPaths({
            prefectureSlug: program.prefectureSlug,
            municipalitySlug: program.municipalitySlug,
            slug: program.slug,
            categorySlugs: program.categorySlugs,
            lifeEventSlugs: program.lifeEventSlugs,
          }),
        );
        await load();
        setMsg({ ok: true, text: `ステータスを「${to}」にし、公開ページへ反映しました。` });
      } catch (err) {
        setMsg({ ok: false, text: String((err as Error).message ?? err) });
      } finally {
        setSaving(false);
      }
    },
    [program, load],
  );

  const onSaveSource = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!program) return;
      setSourceSaving(true);
      setMsg(null);
      try {
        const reviewIntervalDays = Number.parseInt(
          sourceForm.reviewIntervalDays,
          10,
        );
        await saveSupportSource({
          id: sourceForm.id,
          supportProgramId: program.id,
          url: sourceForm.url,
          title: sourceForm.title,
          publisher: sourceForm.publisher,
          officialCheckedAt: sourceForm.officialCheckedAt,
          sourceKind: sourceForm.sourceKind,
          qualityState: sourceForm.qualityState,
          detectedIssueCodes: parseIssueCodes(sourceForm.detectedIssueCodesText),
          reviewIntervalDays: Number.isFinite(reviewIntervalDays)
            ? reviewIntervalDays
            : 90,
          notes: sourceForm.notes,
        });
        await load();
        setMsg({ ok: true, text: "出典を保存しました。" });
      } catch (err) {
        setMsg({ ok: false, text: String((err as Error).message ?? err) });
      } finally {
        setSourceSaving(false);
      }
    },
    [load, program, sourceForm],
  );

  const onResolveReview = useCallback(async (reviewId: string) => {
    setReviewBusy(reviewId);
    setMsg(null);
    try {
      await resolveReviewItem(reviewId);
      setReviewItems((current) => current.filter((i) => i.id !== reviewId));
      setMsg({ ok: true, text: "レビュー項目を解決しました。" });
    } catch (err) {
      setMsg({ ok: false, text: String((err as Error).message ?? err) });
    } finally {
      setReviewBusy(null);
    }
  }, []);

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );
  if (!program) return <p className="text-sm text-red-600">制度が見つかりません。</p>;

  const issues = qualityIssues(program);
  const blockingIssues = publishBlockingIssues(program);
  const set = (k: keyof SupportPatch, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setSource = (k: keyof SourceForm, v: string) =>
    setSourceForm((f) => ({ ...f, [k]: v }));
  const selectedSource = sourceForm.id
    ? sources.find((source) => source.id === sourceForm.id)
    : undefined;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/supports" className="aw-link inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> 制度一覧へ
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-navy">{program.title}</h1>
      <p className="mt-1 text-sm text-charcoal/60">
        {program.prefectureName} {program.municipalityName} ・ {program.slug} ・
        現在: <span className="font-medium">{program.status}</span>
      </p>

      {/* 品質ゲート */}
      {issues.length > 0 ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">品質ゲート検出（{issues.length}）</p>
            <ul className="mt-1 list-disc pl-4">
              {issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-green-50 p-2 text-sm text-green-800">
          公開品質ゲート: 満たしています。
        </p>
      )}

      {/* ステータス操作 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {NEXT_STATUS[program.status].map((a) => (
          <button
            key={a.to}
            type="button"
            disabled={saving || (a.to === "published" && blockingIssues.length > 0)}
            onClick={() => onStatus(a.to)}
            className={a.to === "published" ? "btn-primary" : "btn-secondary"}
            title={
              a.to === "published" && blockingIssues.length > 0
                ? "品質ゲート未達のため公開できません"
                : undefined
            }
          >
            {a.label}
          </button>
        ))}
        {program.officialUrl && (
          <a
            href={program.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="aw-link inline-flex items-center gap-1 text-sm"
          >
            公式ページ <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>

      {msg && (
        <p className={`mt-4 text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      {/* 編集フォーム */}
      <form onSubmit={onSave} className="mt-6 space-y-4">
        {TEXT_FIELDS.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="mb-1 block text-charcoal/80">{f.label}</span>
            {f.area ? (
              <textarea
                className="aw-input w-full"
                rows={3}
                value={(form[f.key] as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <input
                className="aw-input w-full"
                value={(form[f.key] as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-charcoal/80">給付種別</span>
            <select
              className="aw-select w-full"
              value={form.benefit_type ?? "other"}
              onChange={(e) => set("benefit_type", e.target.value as BenefitType)}
            >
              {BENEFIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-charcoal/80">信頼度</span>
            <select
              className="aw-select w-full"
              value={form.source_confidence ?? "medium"}
              onChange={(e) =>
                set("source_confidence", e.target.value as SourceConfidence)
              }
            >
              {CONFIDENCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-charcoal/80">オンライン申請</span>
            <select
              className="aw-select w-full"
              value={
                form.online_application_available === true
                  ? "yes"
                  : form.online_application_available === false
                    ? "no"
                    : "unknown"
              }
              onChange={(e) =>
                set(
                  "online_application_available",
                  e.target.value === "yes"
                    ? true
                    : e.target.value === "no"
                      ? false
                      : null,
                )
              }
            >
              <option value="unknown">不明</option>
              <option value="yes">可</option>
              <option value="no">不可</option>
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-lg bg-soft-gray/30 p-3">
          <TagPicker
            label="カテゴリ"
            options={catOptions}
            selected={selectedCats}
            onChange={setSelectedCats}
          />
          <TagPicker
            label="生活イベント"
            options={eventOptions}
            selected={selectedEvents}
            onChange={setSelectedEvents}
          />
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          保存
        </button>
      </form>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
            <LinkIcon className="h-4 w-4" aria-hidden="true" />
            出典
          </h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSourceForm(toSourceForm(undefined, program))}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            新規
          </button>
        </div>

        <div className="mt-3 divide-y divide-soft-gray rounded-xl border border-soft-gray">
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => setSourceForm(toSourceForm(source, program))}
              className="block w-full px-4 py-3 text-left hover:bg-aster-soft/40"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-navy">
                    {source.title ?? source.url}
                  </span>
                  <span className="block truncate text-xs text-charcoal/60">
                    {source.publisher ?? "publisher 未設定"} ・ {source.sourceKind} ・
                    {source.qualityState}
                  </span>
                  <span className="block truncate text-xs text-charcoal/50">
                    自動取得 {shortDateTime(source.lastFetchedAt)}
                    {source.lastFetchStatus ? ` ・ HTTP ${source.lastFetchStatus}` : ""}
                    {source.lastFetchError ? ` ・ ${source.lastFetchError}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-charcoal/50">
                  {source.officialCheckedAt ?? "未確認"}
                </span>
              </span>
            </button>
          ))}
          {sources.length === 0 && (
            <p className="px-4 py-6 text-sm text-charcoal/60">
              出典はまだ登録されていません。
            </p>
          )}
        </div>

        <form onSubmit={onSaveSource} className="mt-4 space-y-4 rounded-xl border border-soft-gray p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-charcoal/80">URL</span>
              <input
                className="aw-input w-full"
                value={sourceForm.url}
                onChange={(e) => setSource("url", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-charcoal/80">タイトル</span>
              <input
                className="aw-input w-full"
                value={sourceForm.title}
                onChange={(e) => setSource("title", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-charcoal/80">発行元</span>
              <input
                className="aw-input w-full"
                value={sourceForm.publisher}
                onChange={(e) => setSource("publisher", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-charcoal/80">公式確認日</span>
              <input
                type="date"
                className="aw-input w-full"
                value={sourceForm.officialCheckedAt}
                onChange={(e) => setSource("officialCheckedAt", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-charcoal/80">再確認間隔（日）</span>
              <input
                inputMode="numeric"
                className="aw-input w-full"
                value={sourceForm.reviewIntervalDays}
                onChange={(e) => setSource("reviewIntervalDays", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-charcoal/80">種別</span>
              <select
                className="aw-select w-full"
                value={sourceForm.sourceKind}
                onChange={(e) => setSource("sourceKind", e.target.value)}
              >
                {SOURCE_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-charcoal/80">品質状態</span>
              <select
                className="aw-select w-full"
                value={sourceForm.qualityState}
                onChange={(e) => setSource("qualityState", e.target.value)}
              >
                {SOURCE_QUALITY_STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-charcoal/80">検出issue code</span>
              <textarea
                className="aw-input w-full"
                rows={2}
                value={sourceForm.detectedIssueCodesText}
                onChange={(e) =>
                  setSource("detectedIssueCodesText", e.target.value)
                }
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-charcoal/80">メモ</span>
              <textarea
                className="aw-input w-full"
                rows={3}
                value={sourceForm.notes}
                onChange={(e) => setSource("notes", e.target.value)}
              />
            </label>
          </div>
          {selectedSource && (
            <div className="rounded-lg bg-soft-gray/30 p-3 text-xs text-charcoal/70">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <p>最終自動取得: {shortDateTime(selectedSource.lastFetchedAt)}</p>
                <p>
                  HTTP status: {selectedSource.lastFetchStatus ?? "未取得"}
                </p>
                <p>
                  変化検出: {shortDateTime(selectedSource.lastFetchChangedAt)}
                </p>
                <p>
                  content-type: {selectedSource.fetchedContentType ?? "未取得"}
                </p>
              </div>
              {selectedSource.lastFetchError && (
                <p className="mt-2 text-amber-700">
                  取得エラー: {selectedSource.lastFetchError}
                </p>
              )}
            </div>
          )}
          <button type="submit" disabled={sourceSaving} className="btn-primary">
            {sourceSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {sourceForm.id ? "出典を保存" : "出典を作成"}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
          <Inbox className="h-4 w-4" aria-hidden="true" />
          この制度のレビュー項目
        </h2>
        <div className="mt-3 divide-y divide-soft-gray rounded-xl border border-soft-gray">
          {reviewItems.map((it) => (
            <div key={it.id} className="flex items-start gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-navy">{it.reason}</span>
                <span className="mt-1 block text-xs text-charcoal/60">
                  優先度 {it.priority} ・ {it.severity}
                  {it.issueCode ? ` ・ ${it.issueCode}` : ""}
                  {it.sourceLastCheckedAt
                    ? ` ・ 出典確認 ${it.sourceLastCheckedAt}`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                disabled={reviewBusy === it.id}
                onClick={() => onResolveReview(it.id)}
                className="btn-secondary shrink-0"
              >
                {reviewBusy === it.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                解決
              </button>
            </div>
          ))}
          {reviewItems.length === 0 && (
            <p className="px-4 py-6 text-sm text-charcoal/60">
              未対応のレビュー項目はありません。
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
          <History className="h-4 w-4" aria-hidden="true" />
          変更履歴
        </h2>
        <div className="mt-3 divide-y divide-soft-gray rounded-xl border border-soft-gray">
          {revisions.map((rev) => {
            const fields = changedFieldNames(rev);
            return (
              <div key={rev.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-navy">{rev.changeType}</span>
                  <span className="shrink-0 text-xs text-charcoal/50">
                    {shortDateTime(rev.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-charcoal/60">
                  {rev.changeSummary ?? rev.externalKey ?? "自動記録"}
                </p>
                {fields.length > 0 && (
                  <p className="mt-1 text-xs text-charcoal/50">
                    {fields.join(" / ")}
                  </p>
                )}
              </div>
            );
          })}
          {revisions.length === 0 && (
            <p className="px-4 py-6 text-sm text-charcoal/60">
              変更履歴はまだありません。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
