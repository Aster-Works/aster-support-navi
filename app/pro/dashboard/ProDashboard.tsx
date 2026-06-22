"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Users, FileText, Building2 } from "lucide-react";
import {
  getMyOrganizations,
  createOrganization,
  listPackets,
  createPacket,
  type Organization,
  type Packet,
} from "@/app/lib/pro/client";
import { track } from "@/app/lib/track";

const ORG_TYPES: { value: string; label: string }[] = [
  { value: "support_group", label: "支援団体・相談" },
  { value: "npo", label: "NPO" },
  { value: "church", label: "教会" },
  { value: "school", label: "学校・フリースクール" },
  { value: "professional", label: "士業（行政書士・社労士等）" },
  { value: "company", label: "企業・その他" },
];

export default function ProDashboard() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("support_group");

  const load = useCallback(() => {
    getMyOrganizations()
      .then(setOrgs)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    createOrganization(newName, newType)
      .then(() => {
        setNewName("");
        load();
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setBusy(false));
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!orgs)
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-navy">Pro ダッシュボード</h1>
      <p className="mt-1 text-sm text-charcoal/70">
        相談者に渡す「相談パック」を作成・印刷できます。支援する人の業務時間を短くするためのツールです。
      </p>

      {orgs.length === 0 ? (
        <form onSubmit={onCreateOrg} className="aw-card mt-6 max-w-md space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-navy">
            <Building2 className="h-5 w-5 text-aster" aria-hidden="true" />
            まず組織を作成
          </h2>
          <p className="text-[13px] text-charcoal/70">
            あなたの団体・事務所を登録します（作成者がオーナーになります）。
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-charcoal/80">組織名 *</span>
            <input
              required
              className="aw-input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例：NPO法人 ◯◯支援センター"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-charcoal/80">種別</span>
            <select
              className="aw-select w-full"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            組織を作成
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-6">
          {orgs.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              onOpenPacket={(id) => router.push(`/pro/consultations/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgCard({
  org,
  busy,
  setBusy,
  setError,
  onOpenPacket,
}: {
  org: Organization;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  onOpenPacket: (id: string) => void;
}) {
  const [packets, setPackets] = useState<Packet[] | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    listPackets(org.id)
      .then(setPackets)
      .catch((e) => setError(String(e.message ?? e)));
  }, [org.id, setError]);

  const onCreatePacket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    createPacket(org.id, title.trim())
      .then((id) => {
        track("pro_packet_created");
        onOpenPacket(id);
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setBusy(false));
  };

  return (
    <section className="aw-card p-5">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-aster" aria-hidden="true" />
        <h2 className="text-base font-semibold text-navy">{org.name}</h2>
        <span className="aw-badge aw-badge--neutral">{org.role}</span>
        <span className="aw-badge aw-badge--neutral">{org.plan}</span>
      </div>

      <form onSubmit={onCreatePacket} className="mt-4 flex flex-wrap gap-2">
        <input
          className="aw-input flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="相談パックのタイトル（例：◯◯さん／出産・子育て）"
        />
        <button type="submit" disabled={busy} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          相談パックを作る
        </button>
      </form>
      <p className="mt-1.5 text-[12px] text-charcoal/60">
        ※ 相談者の氏名・詳細住所・収入・病名などの機微情報は入れないでください。
      </p>

      <div className="mt-4">
        {!packets ? (
          <p className="text-sm text-charcoal/60">読み込み中…</p>
        ) : packets.length === 0 ? (
          <p className="text-sm text-charcoal/60">相談パックはまだありません。</p>
        ) : (
          <ul className="divide-y divide-soft-gray rounded-xl border border-soft-gray">
            {packets.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pro/consultations/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-aster-soft/40"
                >
                  <FileText className="h-4 w-4 text-charcoal/50" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-medium text-navy">
                    {p.title}
                  </span>
                  <span className="shrink-0 text-xs text-charcoal/60">
                    {p.selectedProgramSlugs.length} 制度
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
