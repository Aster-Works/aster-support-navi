import type { Category } from "@/app/lib/data/types";

/** MVP は「出産・子育て」周辺に絞る。Phase 4 で介護・住まい・低所得などへ拡張。 */
export const categories: Category[] = [
  {
    slug: "birth",
    name: "出産",
    description: "妊娠・出産にともなう給付や助成。",
    sortOrder: 1,
  },
  {
    slug: "childcare",
    name: "子育て",
    description: "子どもを育てる世帯の手当・支援。",
    sortOrder: 2,
  },
  {
    slug: "medical",
    name: "医療費助成",
    description: "子どもなどの医療費の負担を軽くする助成。",
    sortOrder: 3,
  },
  {
    slug: "single-parent",
    name: "ひとり親",
    description: "ひとり親家庭への手当・相談・支援。",
    sortOrder: 4,
  },
  {
    slug: "education",
    name: "就学・教育",
    description: "保育・就学・教育にかかる費用の支援。",
    sortOrder: 5,
  },
  {
    slug: "moving",
    name: "引っ越し・転入",
    description: "引っ越しや転入のときに確認したい手続き。",
    sortOrder: 6,
  },
  {
    slug: "livelihood",
    name: "生活困窮・低所得",
    description:
      "収入の減少・失業・低所得など、暮らしが苦しいときの相談・給付・貸付・減免。",
    sortOrder: 7,
  },
  {
    slug: "nursing-care",
    name: "介護・高齢",
    description:
      "介護保険サービス・高齢者の在宅生活支援・家族介護者への支援など。",
    sortOrder: 8,
  },
];
