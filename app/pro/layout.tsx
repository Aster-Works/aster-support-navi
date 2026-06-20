import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { ProGate } from "./ProGate";

export const metadata: Metadata = {
  title: "Pro（相談支援現場向け） | Aster Support Navi",
  robots: { index: false, follow: false },
};

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProGate>
      <div className="aw-container py-8">
        <div className="mb-6 flex items-center gap-2 border-b border-soft-gray pb-4">
          <span className="aw-eyebrow mr-1">
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            Pro
          </span>
          <Link
            href="/pro"
            className="rounded-lg px-3 py-1.5 text-sm text-charcoal/80 hover:bg-aster-soft hover:text-aster"
          >
            ダッシュボード
          </Link>
        </div>
        {children}
      </div>
    </ProGate>
  );
}
