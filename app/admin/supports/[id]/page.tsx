"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink, ArrowLeft, Save, AlertTriangle } from "lucide-react";
import {
  fetchSupport,
  updateSupport,
  setStatus,
  setProgramTags,
  fetchCategoryOptions,
  fetchLifeEventOptions,
  qualityIssues,
  type AdminProgram,
  type SupportPatch,
  type MasterOption,
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

export default function AdminSupportEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [program, setProgram] = useState<AdminProgram | null>(null);
  const [form, setForm] = useState<SupportPatch>({});
  const [catOptions, setCatOptions] = useState<MasterOption[]>([]);
  const [eventOptions, setEventOptions] = useState<MasterOption[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    return fetchSupport(id)
      .then((p) => {
        setProgram(p);
        if (p) {
          setForm(toForm(p));
          setSelectedCats(p.categorySlugs);
          setSelectedEvents(p.lifeEventSlugs);
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
        await load();
        setMsg({ ok: true, text: "保存しました。" });
      } catch (err) {
        setMsg({ ok: false, text: String((err as Error).message ?? err) });
      } finally {
        setSaving(false);
      }
    },
    [id, form, load, selectedCats, selectedEvents],
  );

  const onStatus = useCallback(
    async (to: PublishStatus) => {
      if (!program) return;
      setSaving(true);
      setMsg(null);
      try {
        await setStatus(program, to);
        await load();
        setMsg({ ok: true, text: `ステータスを「${to}」にしました。` });
      } catch (err) {
        setMsg({ ok: false, text: String((err as Error).message ?? err) });
      } finally {
        setSaving(false);
      }
    },
    [program, load],
  );

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );
  if (!program) return <p className="text-sm text-red-600">制度が見つかりません。</p>;

  const issues = qualityIssues(program);
  const set = (k: keyof SupportPatch, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

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
            <p className="font-medium">公開品質ゲート未達（{issues.length}）</p>
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
            disabled={saving || (a.to === "published" && issues.length > 0)}
            onClick={() => onStatus(a.to)}
            className={a.to === "published" ? "btn-primary" : "btn-secondary"}
            title={
              a.to === "published" && issues.length > 0
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
    </div>
  );
}
