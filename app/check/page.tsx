import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import {
  getActiveMunicipalities,
  getCategories,
  getPrefectures,
} from "@/app/lib/data";
import { buildMetadata } from "@/app/lib/seo";
import { COPY } from "@/app/lib/copy";
import { DiagnosisFlow } from "@/app/components/DiagnosisFlow";
import { Disclaimer } from "@/app/components/Disclaimer";

export const metadata: Metadata = buildMetadata({
  title: "かんたん診断",
  description:
    "5つほどの質問に答えると、確認するとよい支援制度の候補を整理します。ログイン不要・入力は保存しません。",
  path: "/check",
  noindex: true,
});

export default async function CheckPage() {
  const [munis, categories, prefectures] = await Promise.all([
    getActiveMunicipalities(),
    getCategories(),
    getPrefectures(),
  ]);
  const prefectureName = new Map(prefectures.map((p) => [p.slug, p.name]));

  return (
    <div className="aw-prose-container py-12">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-aster-soft text-aster">
          <ClipboardCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          かんたん診断
        </h1>
        <p className="mt-3 text-[15px] leading-8 text-charcoal">
          いくつかの質問に答えると、確認するとよい制度の候補を整理します。
          <br className="hidden sm:block" />
          {COPY.candidateNote}。
        </p>
      </div>

      <div className="mt-8">
        <DiagnosisFlow
          municipalities={munis.map((m) => ({
            slug: m.slug,
            name: m.name,
            nameKana: m.nameKana,
            prefectureSlug: m.prefectureSlug,
            prefectureName: prefectureName.get(m.prefectureSlug) ?? "",
          }))}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </div>

      <div className="mt-8">
        <Disclaimer variant="diagnosis" />
      </div>
    </div>
  );
}
