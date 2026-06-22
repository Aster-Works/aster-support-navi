import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/app/lib/site";
import { PrimaryNav } from "@/app/components/PrimaryNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-soft-gray/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 print:hidden">
      <div className="aw-container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex min-w-0 items-center rounded-lg"
          aria-label={`${SITE.name} ホーム`}
        >
          <Image
            src="/brand/aster-support-navi-raster-mark-512.png"
            alt=""
            width={512}
            height={512}
            priority
            className="h-10 w-10 object-contain sm:hidden"
          />
          <Image
            src="/brand/aster-support-navi-raster-horizontal.png"
            alt=""
            width={1607}
            height={363}
            priority
            className="hidden h-11 w-auto max-w-[260px] object-contain sm:block"
          />
        </Link>

        <PrimaryNav />
      </div>
    </header>
  );
}
