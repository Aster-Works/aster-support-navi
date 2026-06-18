import Link from "next/link";
import { Home, Search, ClipboardCheck } from "lucide-react";

export default function NotFound() {
  return (
    <div className="aw-prose-container py-24 text-center">
      <p className="aw-eyebrow justify-center">404</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        ページが見つかりませんでした
      </h1>
      <p className="mt-3 text-[15px] leading-8 text-charcoal">
        お探しのページは移動または削除された可能性があります。
        <br className="hidden sm:block" />
        次のいずれかからお進みください。
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          <Home className="h-4 w-4" aria-hidden="true" />
          ホームへ
        </Link>
        <Link href="/search" className="btn-secondary">
          <Search className="h-4 w-4" aria-hidden="true" />
          制度をさがす
        </Link>
        <Link href="/check" className="btn-secondary">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          かんたん診断
        </Link>
      </div>
    </div>
  );
}
