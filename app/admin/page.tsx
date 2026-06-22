"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { fetchStats, type AdminStats } from "@/app/lib/admin/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats().then(setStats).catch((e) => setError(String(e.message ?? e)));
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
    </div>
  );
}
