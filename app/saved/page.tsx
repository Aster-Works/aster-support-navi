import type { Metadata } from "next";
import { Bookmark } from "lucide-react";
import { buildMetadata } from "@/app/lib/seo";
import { SectionHeading } from "@/app/components/SectionHeading";
import { SavedList } from "@/app/components/SavedList";
import { SavedCloudPanel } from "@/app/components/SavedCloudPanel";
import { Disclaimer } from "@/app/components/Disclaimer";

export const metadata: Metadata = buildMetadata({
  title: "保存した制度",
  description: "保存した支援制度の一覧です。",
  path: "/saved",
  noindex: true,
});

export default function SavedPage() {
  return (
    <div className="aw-container py-10">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-aster-soft text-aster">
          <Bookmark className="h-6 w-6" aria-hidden="true" />
        </span>
        <SectionHeading
          as="h1"
          eyebrow="保存リスト"
          title="保存した制度"
          description="あとで確認したい制度を保存しておけます。ログイン不要でこの端末に保存され、ログインすれば複数の端末で同期できます。"
        />
      </div>

      <SavedCloudPanel />

      <SavedList />

      <div className="mt-10">
        <Disclaimer variant="short" />
      </div>
    </div>
  );
}
