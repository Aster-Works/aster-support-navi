import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/app/lib/site";
import { DISCLAIMER_SHORT } from "@/app/lib/copy";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] =
  [
    {
      heading: "探す",
      links: [
        { href: "/search", label: "制度を検索する" },
        { href: "/check", label: "かんたん診断" },
        { href: "/compare", label: "自治体で制度を比べる" },
        { href: "/guides", label: "ガイド（制度のしくみ）" },
        { href: "/saved", label: "保存した制度" },
        { href: "/area", label: "エリアから探す" },
        { href: "/help", label: "相談窓口（ひとりで抱え込まないために）" },
      ],
    },
    {
      heading: "このサイトについて",
      links: [
        { href: "/about", label: "Aster Support Navi とは" },
        { href: "/pro", label: "支援団体・相談員の方へ（Pro）" },
        { href: "/disclaimer", label: "免責事項" },
        { href: "/privacy", label: "プライバシーポリシー" },
        { href: "/terms", label: "利用規約" },
      ],
    },
  ];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-soft-gray bg-white print:hidden">
      <div className="aw-container py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image
              src="/brand/aster-support-navi-raster-horizontal.png"
              alt="Aster Support Navi"
              width={1607}
              height={363}
              className="h-auto w-[250px] max-w-full object-contain"
            />
            <p className="mt-4 max-w-sm text-[13px] leading-7 text-charcoal">
              {SITE.tagline}
              <br />
              住所と生活状況から、確認すべき支援制度と次にやることを整理します。
            </p>
            <p className="mt-4 text-[12px] text-charcoal/70">
              {SITE.brand} が運営しています。
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-charcoal/70">
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-charcoal transition-colors hover:text-navy"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 border-t border-soft-gray pt-6 text-[12px] leading-6 text-charcoal/70">
          {DISCLAIMER_SHORT}
        </p>
        <p className="mt-4 text-[12px] text-charcoal/70">
          © {year} {SITE.brand}. Aster Support Navi.
        </p>
      </div>
    </footer>
  );
}
