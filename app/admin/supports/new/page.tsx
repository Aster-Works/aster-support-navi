"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import {
  createSupport,
  fetchCategoryOptions,
  fetchLifeEventOptions,
  fetchMunicipalityOptions,
  type MasterOption,
  type MunicipalityOption,
} from "@/app/lib/admin/client";
import type { BenefitType, SourceConfidence } from "@/app/lib/data/types";
import { TagPicker } from "@/app/admin/TagPicker";

const BENEFIT_TYPES: BenefitType[] = ["cash", "subsidy", "reduction", "service", "consultation", "other"];
const CONFIDENCES: SourceConfidence[] = ["high", "medium", "low"];

export default function AdminSupportNewPage() {
  const router = useRouter();
  const [munis, setMunis] = useState<MunicipalityOption[]>([]);
  const [catOptions, setCatOptions] = useState<MasterOption[]>([]);
  const [eventOptions, setEventOptions] = useState<MasterOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [municipalityId, setMunicipalityId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [targetPeople, setTargetPeople] = useState("");
  const [applicationMethodText, setApplicationMethodText] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [lastOfficialCheckedAt, setLastOfficialCheckedAt] = useState("");
  const [benefitType, setBenefitType] = useState<BenefitType>("other");
  const [sourceConfidence, setSourceConfidence] = useState<SourceConfidence>("medium");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetchMunicipalityOptions(),
      fetchCategoryOptions(),
      fetchLifeEventOptions(),
    ])
      .then(([m, c, e]) => {
        setMunis(m);
        setCatOptions(c);
        setEventOptions(e);
      })
      .catch((err) => setError(String(err.message ?? err)));
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    createSupport({
      municipalityId,
      slug,
      title,
      summary,
      targetPeople,
      applicationMethodText,
      officialUrl,
      lastOfficialCheckedAt,
      benefitType,
      sourceConfidence,
      categorySlugs: selectedCats,
      lifeEventSlugs: selectedEvents,
    })
      .then((id) => router.push(`/admin/supports/${id}`))
      .catch((err) => {
        setError(String(err.message ?? err));
        setSaving(false);
      });
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/supports" className="aw-link inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> 制度一覧へ
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-navy">制度を新規作成</h1>
      <p className="mt-1 text-sm text-charcoal/70">
        下書き（draft）として作成します。公開は編集画面で品質ゲートを満たしてから行います。
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">自治体 *</span>
          <select
            required
            className="aw-select w-full"
            value={municipalityId}
            onChange={(e) => setMunicipalityId(e.target.value)}
          >
            <option value="">選択してください</option>
            {munis.map((m) => (
              <option key={m.id} value={m.id}>
                {m.prefectureName} {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">
            slug *（全体で一意。例: tokyo-setagaya-child-allowance）
          </span>
          <input required className="aw-input w-full" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">制度名 *</span>
          <input required className="aw-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">概要 *</span>
          <textarea required rows={2} className="aw-input w-full" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">対象となる可能性がある人 *</span>
          <textarea required rows={2} className="aw-input w-full" value={targetPeople} onChange={(e) => setTargetPeople(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">申請方法 *</span>
          <textarea required rows={2} className="aw-input w-full" value={applicationMethodText} onChange={(e) => setApplicationMethodText(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">公式URL *</span>
          <input required type="url" className="aw-input w-full" value={officialUrl} onChange={(e) => setOfficialUrl(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">最終確認日 * (YYYY-MM-DD)</span>
          <input required className="aw-input w-full" placeholder="2026-06-20" value={lastOfficialCheckedAt} onChange={(e) => setLastOfficialCheckedAt(e.target.value)} />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-charcoal/80">給付種別</span>
            <select className="aw-select w-full" value={benefitType} onChange={(e) => setBenefitType(e.target.value as BenefitType)}>
              {BENEFIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-charcoal/80">信頼度</span>
            <select className="aw-select w-full" value={sourceConfidence} onChange={(e) => setSourceConfidence(e.target.value as SourceConfidence)}>
              {CONFIDENCES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-lg bg-soft-gray/30 p-3">
          <TagPicker label="カテゴリ" options={catOptions} selected={selectedCats} onChange={setSelectedCats} />
          <TagPicker label="生活イベント" options={eventOptions} selected={selectedEvents} onChange={setSelectedEvents} />
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          作成して編集へ
        </button>
      </form>
    </div>
  );
}
