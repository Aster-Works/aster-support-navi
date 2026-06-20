import Link from "next/link";
import { Flower2, ClipboardCheck, Bookmark } from "lucide-react";
import { SITE } from "@/app/lib/site";

const NAV = [
  { href: "/search", label: "制度を探す" },
  { href: "/tokyo", label: "自治体から探す" },
  { href: "/about", label: "このサイトについて" },
];

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

        <nav
          aria-label="グローバルナビゲーション"
          className="flex items-center gap-1 sm:gap-2"
        >
          <ul className="hidden items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-cream/70 hover:text-navy"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/saved"
            aria-label="保存した制度"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-cream/70 hover:text-navy"
          >
            <Bookmark className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link
            href="/check"
            className="btn-primary min-h-11 px-4 py-2.5 text-[13px]"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            かんたん診断
          </Link>
        </nav>
      </div>
    </header>
  );
}
