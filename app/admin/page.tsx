"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import {
  fetchAdminPrincipal,
  fetchStats,
  type AdminPrincipal,
  type AdminStats,
} from "@/app/lib/admin/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [principal, setPrincipal] = useState<AdminPrincipal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchStats(), fetchAdminPrincipal()])
      .then(([s, p]) => {
        setStats(s);
        setPrincipal(p);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats)
    return (
      <p className="flex items-center gap-2 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        読み込み中…
      </p>
    );

  const cards = [
    { label: "公開中", value: stats.byStatus.published, href: "/admin/supports?status=published", tone: "ok" },
    { label: "レビュー待ち", value: stats.byStatus.review, href: "/admin/supports?status=review", tone: "info" },
    { label: "下書き", value: stats.byStatus.draft, href: "/admin/supports?status=draft", tone: "neutral" },
    { label: "アーカイブ", value: stats.byStatus.archived, href: "/admin/supports?status=archived", tone: "neutral" },
    { label: "制度 合計", value: stats.total, href: "/admin/supports?status=all", tone: "neutral" },
    { label: "レビューキュー(open)", value: stats.reviewQueueOpen, href: "/admin/review-queue", tone: "info" },
    { label: "出典 要確認", value: stats.sourcesNeedReview, href: "/admin/review-queue", tone: "info" },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-navy">ダッシュボード</h1>
      <p className="mt-1 text-sm text-charcoal/70">
        制度データの状態を把握し、下書き→レビュー→公開の運用を進めます。
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="aw-card aw-card-hover p-4"
          >
            <div className="text-2xl font-semibold text-navy">{c.value}</div>
            <div className="mt-1 text-sm text-charcoal/70">{c.label}</div>
          </Link>
        ))}
      </div>

      <section className="mt-8 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-soft-gray bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            ログイン中の権限
          </h2>
          <p className="mt-2 text-sm text-charcoal/70">
            {principal?.email ?? "メール未取得"}
          </p>
          <p className="mt-1 text-xs text-charcoal/55">
            {principal?.isAdmin
              ? `admin 確認済み${principal.adminSince ? ` ・ 付与 ${principal.adminSince.slice(0, 10)}` : ""}`
              : "admin 権限なし"}
          </p>
          {principal?.userId && (
            <p className="mt-1 break-all text-xs text-charcoal/45">
              user_id: {principal.userId}
            </p>
          )}
        </div>

        <Link
          href="/admin/activity"
          className="rounded-xl border border-soft-gray bg-white p-4 transition-colors hover:bg-aster-soft/40"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Activity className="h-4 w-4" aria-hidden="true" />
            最近の変更履歴
          </h2>
          <p className="mt-2 text-sm text-charcoal/70">
            制度ごとの revision を横断して、誰が・いつ・何を変えたか確認します。
          </p>
        </Link>
      </section>
    </div>
  );
}
