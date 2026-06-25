import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  ListChecks,
  ShieldAlert,
  Inbox,
  Upload,
  Activity,
  Radar,
  Bot,
} from "lucide-react";
import { AdminGate } from "./AdminGate";

export const metadata: Metadata = {
  title: "管理画面 | Aster Support Navi",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/supports", label: "制度", icon: ListChecks },
  { href: "/admin/import", label: "取込", icon: Upload },
  { href: "/admin/quality", label: "品質", icon: ShieldAlert },
  { href: "/admin/review-queue", label: "レビュー", icon: Inbox },
  { href: "/admin/crawler", label: "クローラ", icon: Radar },
  { href: "/admin/crawler/review", label: "候補", icon: Bot },
  { href: "/admin/activity", label: "履歴", icon: Activity },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGate>
      <div className="aw-container py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-soft-gray pb-4">
          <span className="aw-eyebrow mr-2">運用</span>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-charcoal/80 hover:bg-aster-soft hover:text-aster"
            >
              <n.icon className="h-4 w-4" aria-hidden="true" />
              {n.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </AdminGate>
  );
}
