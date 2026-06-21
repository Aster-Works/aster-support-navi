import Link from "next/link";
import { Flower2 } from "lucide-react";
import { SITE } from "@/app/lib/site";
import { PrimaryNav } from "@/app/components/PrimaryNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-soft-gray/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 print:hidden">
      <div className="aw-container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg"
          aria-label={`${SITE.name} ホーム`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy">
            <Flower2 className="h-5 w-5 text-gold" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-tight text-navy">
              Aster Support Navi
            </span>
            <span className="mt-0.5 text-[11px] font-medium tracking-wide text-charcoal/70">
              くらしの支援制度ナビ
            </span>
          </span>
        </Link>

        <PrimaryNav />
      </div>
    </header>
  );
}
