"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Search, Plus, X, Save } from "lucide-react";
import {
  getPacket,
  getProgramsBySlugs,
  searchPublished,
  updatePacket,
  type Packet,
  type ProProgram,
} from "@/app/lib/pro/client";
import { PrepPacket, type PrepProgram } from "@/app/components/PrepPacket";

export default function PacketPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [packet, setPacket] = useState<Packet | null>(null);
  const [selected, setSelected] = useState<ProProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProProgram[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getPacket(id)
      .then(async (p) => {
        setPacket(p);
        if (p) {
          setTitle(p.title);
          setNotes(p.notes ?? "");
          setSelected(await getProgramsBySlugs(p.selectedProgramSlugs));
        }
      })
      .catch((e) => setMsg({ ok: false, text: String((e as Error).message ?? e) }))
      .finally(() => setLoading(false));
  }, [id]);

  const persistSlugs = useCallback(
    async (next: ProProgram[]) => {
      setSelected(next);
      await updatePacket(id, { selected_program_slugs: next.map((p) => p.slug) });
    },
    [id],
  );

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    searchPublished(q, 30)
      .then(setResults)
      .catch((e) => setMsg({ ok: false, text: String((e as Error).message ?? e) }))
      .finally(() => setSearching(false));
  };

  const add = (p: ProProgram) => {
    if (selected.some((s) => s.slug === p.slug)) return;
    void persistSlugs([...selected, p]);
  };
  const remove = (slug: string) => {
    void persistSlugs(selected.filter((s) => s.slug !== slug));
  };

  const saveMeta = () => {
    updatePacket(id, { title: title.trim() || packet?.title || "相談パック", notes })
      .then(() => setMsg({ ok: true, text: "保存しました。" }))
      .catch((e) => setMsg({ ok: false, text: String((e as Error).message ?? e) }));
  };

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );
  if (!packet) return <p className="text-sm text-red-600">相談パックが見つかりません。</p>;

  const prepPrograms: PrepProgram[] = selected;

  return (
    <div className="max-w-3xl">
      <Link href="/pro" className="aw-link inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> ダッシュボードへ
      </Link>

      <input
        className="mt-2 w-full border-0 bg-transparent text-xl font-semibold text-navy focus:outline-none focus:ring-0"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveMeta}
        aria-label="相談パックのタイトル"
      />
      <p className="text-[12px] text-charcoal/60">
        {selected.length} 制度 ・ 相談者の機微情報（氏名・住所・収入・病名など）は入れないでください
      </p>

      {msg && (
        <p className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      {/* 選択中の制度 */}
      <section className="mt-5">
        <h2 className="text-sm font-semibold text-charcoal/70">この相談パックの制度</h2>
        {selected.length === 0 ? (
          <p className="mt-2 text-sm text-charcoal/60">
            下の検索から制度を追加してください。
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-soft-gray rounded-xl border border-soft-gray">
            {selected.map((p) => (
              <li key={p.slug} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-navy">
                    {p.title}
                  </span>
                  <span className="block truncate text-xs text-charcoal/60">
                    {p.municipalityName}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(p.slug)}
                  className="btn-secondary shrink-0 px-2 py-1 text-xs"
                  aria-label={`${p.title}を外す`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 印刷パケット */}
      <PrepPacket
        programs={prepPrograms}
        heading={title || packet.title}
        context="pro"
      />

      {/* メモ */}
      <section className="mt-6">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-charcoal/70">
            メモ（任意・非機微）
          </span>
          <textarea
            className="aw-input w-full"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveMeta}
            placeholder="相談者の機微情報は書かないでください"
          />
        </label>
        <button type="button" onClick={saveMeta} className="btn-secondary mt-2">
          <Save className="h-4 w-4" aria-hidden="true" />
          保存
        </button>
      </section>

      {/* 制度を検索して追加 */}
      <section className="mt-8 print:hidden">
        <h2 className="text-sm font-semibold text-charcoal/70">制度を検索して追加</h2>
        <form onSubmit={onSearch} className="mt-2 flex gap-2">
          <input
            className="aw-input flex-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="制度名で検索（例：児童手当）"
          />
          <button type="submit" disabled={searching} className="btn-primary shrink-0">
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            検索
          </button>
        </form>
        {results.length > 0 && (
          <ul className="mt-3 max-h-80 divide-y divide-soft-gray overflow-auto rounded-xl border border-soft-gray">
            {results.map((p) => {
              const added = selected.some((s) => s.slug === p.slug);
              return (
                <li key={p.slug} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-navy">
                      {p.title}
                    </span>
                    <span className="block truncate text-xs text-charcoal/60">
                      {p.municipalityName}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => add(p)}
                    className="btn-secondary shrink-0 px-2.5 py-1 text-xs disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {added ? "追加済み" : "追加"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
