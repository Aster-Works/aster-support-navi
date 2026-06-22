"use client";

import Link from "next/link";
import { Briefcase, LayoutDashboard } from "lucide-react";
import { ProGate } from "./ProGate";

export function ProShell({ children }: { children: React.ReactNode }) {
  return (
    <ProGate>
      <div className="aw-container py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-soft-gray pb-4">
          <span className="aw-eyebrow mr-1">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            Pro
          </span>
          <Link
            href="/pro/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-charcoal/80 hover:bg-aster-soft hover:text-aster"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            ダッシュボード
          </Link>
          <Link
            href="/pro"
            className="rounded-lg px-3 py-1.5 text-sm text-charcoal/80 hover:bg-aster-soft hover:text-aster"
          >
            Pro概要
          </Link>
        </div>
        {children}
      </div>
    </ProGate>
  );
}
