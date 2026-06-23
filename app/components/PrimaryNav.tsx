"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, ClipboardCheck, Menu, X } from "lucide-react";
import { TrackedLink } from "@/app/components/TrackedLink";

const NAV = [
  { href: "/search", label: "制度を探す" },
  { href: "/area", label: "エリアから探す" },
  { href: "/about", label: "このサイトについて" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * ヘッダーの操作部（クライアント）。
 * - デスクトップ: 主要ナビ＋保存＋診断CTA。現在地は色＋ aria-current で二重表現。
 * - モバイル: 診断CTA＋ハンバーガー。主要ナビと保存は開閉メニューに集約し、
 *   sm 未満でナビが消えてしまう問題を解消する。
 */
export function PrimaryNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const close = () => setOpen(false);

  // 開いている間は Escape で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const savedActive = isActive(pathname, "/saved");

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* デスクトップ: 主要ナビ（タブレット幅での詰まりを避け lg 以上で表示） */}
      <nav aria-label="グローバルナビゲーション" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={isActive(pathname, n.href) ? "page" : undefined}
                className="aw-navlink"
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 保存（デスクトップはアイコン、モバイルはメニュー内） */}
      <Link
        href="/saved"
        aria-label="保存した制度"
        aria-current={savedActive ? "page" : undefined}
        className={`hidden h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-cream/70 hover:text-navy lg:inline-flex ${
          savedActive ? "bg-cream text-navy" : "text-charcoal"
        }`}
      >
        <Bookmark className="h-5 w-5" aria-hidden="true" />
      </Link>

      {/* 診断CTA（常時表示・主要導線）。狭い画面ではラベルを短縮し折り返しを防ぐ。 */}
      {/* diagnosis_start: ヘッダーの診断CTAをクリックした時に発火。 */}
      <TrackedLink
        href="/check"
        className="btn-primary min-h-11 whitespace-nowrap px-4 py-2.5 text-[13px]"
        eventName="diagnosis_start"
        eventParams={{ source: "header" }}
      >
        <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="lg:hidden">診断</span>
        <span className="hidden lg:inline">かんたん診断</span>
      </TrackedLink>

      {/* モバイル: ハンバーガー */}
      <button
        type="button"
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-navy transition-colors hover:bg-cream/70 lg:hidden"
      >
        {open ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {/* モバイルメニュー（ヘッダー直下のドロップダウン） */}
      {open && (
        <div
          id={menuId}
          className="fixed inset-x-0 top-16 z-40 border-b border-soft-gray bg-background shadow-[0_18px_40px_-24px_rgba(13,27,42,0.35)] lg:hidden"
        >
          <nav aria-label="モバイルナビゲーション" className="aw-container py-3">
            <ul className="flex flex-col gap-0.5">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={isActive(pathname, n.href) ? "page" : undefined}
                    onClick={close}
                    className="aw-navlink aw-navlink--row"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/saved"
                  aria-current={savedActive ? "page" : undefined}
                  onClick={close}
                  className="aw-navlink aw-navlink--row"
                >
                  <Bookmark className="h-4 w-4" aria-hidden="true" />
                  保存した制度
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
