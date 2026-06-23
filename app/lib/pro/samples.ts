/**
 * サンプル相談パック（Pro の成果物の見本・営業コラテラル兼SEO資産）。
 *
 * 【YMYL】見本は実在の published 制度（検証済み公式URL・最終確認日つき）だけで構成する。
 * 断定しない。実際のパックは1つの自治体・状況に合わせて作る前提を明記する。
 */
import type { SupportProgram } from "@/app/lib/data/types";

export interface SamplePack {
  slug: string;
  /** 見本のテーマ名。 */
  title: string;
  /** 対象読者（カード・一覧の短い説明）。 */
  audience: string;
  /** metadata description（SEO）。 */
  description: string;
  /** 詳細ページの導入文。 */
  intro: string;
  /** 制度選択に使うカテゴリ（いずれかに一致する制度を集める）。 */
  categorySlugs: string[];
  /** 申請前に共通で確認すること（非断定・安全）。 */
  nextChecks: string[];
  /** 載せる制度数の上限。 */
  limit: number;
}

export const SAMPLE_PACKS: readonly SamplePack[] = [
  {
    slug: "single-parent",
    title: "ひとり親家庭の相談パック（見本）",
    audience: "ひとり親家庭の相談に関わる支援者・相談員向け",
    description:
      "ひとり親家庭が確認しておきたい手当・医療・相談窓口を1つに整理した、相談パックの見本です。印刷・PDF保存できます。受給可否の判定ではありません。",
    intro:
      "ひとり親家庭の相談で、最初に確認しておきたい制度を1つにまとめた見本です。対象条件・金額・必要書類は自治体ごとに異なるため、必ず公式ページや窓口で確認する前提で整理しています。",
    categorySlugs: ["single-parent"],
    nextChecks: [
      "児童扶養手当などの所得・対象の要件を公式ページで確認する",
      "申請に必要な書類（戸籍・住民票・収入のわかるもの等）を確認する",
      "ひとり親家庭への医療費助成・就学援助の有無を自治体に確認する",
      "相談先（自治体のひとり親支援窓口・母子父子自立支援員）を控える",
    ],
    limit: 6,
  },
  {
    slug: "livelihood-housing",
    title: "暮らしが苦しい・住まいの相談パック（見本）",
    audience: "生活困窮・家賃の相談に関わる支援者・団体向け",
    description:
      "家賃が払えない・収入が減ったときに確認したい支援（住居確保給付金・自立相談支援・貸付など）を整理した相談パックの見本です。印刷・PDF保存できます。",
    intro:
      "収入が減った、家賃が払えないといった相談で確認しておきたい制度をまとめた見本です。対象や期間、必要書類は自治体ごとに異なるため、公式ページや自立相談支援機関への確認を前提に整理しています。",
    categorySlugs: ["livelihood", "housing"],
    nextChecks: [
      "住居確保給付金など家賃の支援の対象・期間を公式ページで確認する",
      "自立相談支援機関（生活困窮者自立支援）の窓口を確認する",
      "社会福祉協議会の貸付（生活福祉資金）の相談先を確認する",
      "申請に必要な書類・収入や資産の要件を確認する",
    ],
    limit: 6,
  },
  {
    slug: "birth-childcare",
    title: "出産・子育ての相談パック（見本）",
    audience: "出産・子育ての相談に関わる支援者・団体向け",
    description:
      "妊娠・出産・子育てで確認したい手当や医療費助成、申請のタイミングを整理した相談パックの見本です。印刷・PDF保存できます。受給可否の判定ではありません。",
    intro:
      "妊娠・出産・子育ての相談で、確認しておきたい制度を1つにまとめた見本です。申請のタイミングを逃しやすい制度もあるため、公式ページや窓口での確認を前提に整理しています。",
    categorySlugs: ["birth", "childcare", "medical"],
    nextChecks: [
      "児童手当の申請タイミング（出生・転入から15日以内が目安か）を確認する",
      "子ども医療費助成の対象年齢・必要書類を確認する",
      "出産・子育てに関する給付の窓口を確認する",
      "保育・一時預かりの利用方法を自治体に確認する",
    ],
    limit: 6,
  },
] as const;

export function getSamplePack(slug: string): SamplePack | undefined {
  return SAMPLE_PACKS.find((s) => s.slug === slug);
}

/** 制度キー（slug の `{pref}-{muni}-` を除いた末尾）を取り出す。 */
function programTypeKey(p: Pick<SupportProgram, "slug" | "prefectureSlug" | "municipalitySlug">): string {
  return p.slug.slice(`${p.prefectureSlug}-${p.municipalitySlug}-`.length);
}

/**
 * 見本に載せる代表制度を選ぶ（純関数）。
 * カテゴリに一致し、かつ制度種別ごとに代表1件へ畳む（自治体をまたいだ重複を避ける）。
 */
export function selectSampleProgramsFrom(
  programs: SupportProgram[],
  categorySlugs: string[],
  limit: number,
): SupportProgram[] {
  const seen = new Set<string>();
  const out: SupportProgram[] = [];
  for (const p of programs) {
    if (!p.categorySlugs.some((c) => categorySlugs.includes(c))) continue;
    const key = programTypeKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}
