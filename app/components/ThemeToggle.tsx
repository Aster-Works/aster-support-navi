"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** ライト/ダークの手動切替。初期値は <head> のスクリプトが付けた .dark を読む。 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // set-state-in-effect を避けるためマイクロタスク内で初期状態を読む。
    Promise.resolve().then(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage 不可でも切替自体は機能する。
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      aria-pressed={dark}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-cream/70 hover:text-fg"
    >
      {dark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
