import type { SupportTopic } from "@/app/lib/data/types";

/**
 * 細分類「支援テーマ」master（seed）。
 * 正式な source of truth は Supabase の support_topics（migration 20260624130000）。
 * これは緊急退避・ローカル初期データ・テスト用で、migration と内容を一致させる。
 * 大分類 categories は維持し、テーマはその下の細分類として制度に関連付ける。
 */
export const topics: SupportTopic[] = [
  { slug: "hearing-aid", name: "補聴器購入費助成", description: "高齢の方や障害のある方の補聴器購入費を補助する、自治体独自の助成。", parentCategorySlug: "nursing-care", priority: 100, sortOrder: 1, indexable: true },
  { slug: "elderly-diapers", name: "紙おむつ支給・助成", description: "在宅で介護を受ける高齢者などへの紙おむつの支給・購入費助成。", parentCategorySlug: "nursing-care", priority: 90, sortOrder: 2, indexable: true },
  { slug: "postpartum-care", name: "産後ケア", description: "出産後の母子の心身のケア（宿泊・通所・訪問など）を支える事業。", parentCategorySlug: "birth", priority: 95, sortOrder: 3, indexable: true },
  { slug: "prenatal-postpartum-helper", name: "産前産後ヘルパー", description: "妊娠中・出産後の家事や育児を支援するヘルパーの派遣。", parentCategorySlug: "birth", priority: 80, sortOrder: 4, indexable: true },
  { slug: "welfare-taxi", name: "福祉タクシー・移動支援", description: "障害のある方などの外出・通院を支える福祉タクシー券や自動車燃料費の助成。", parentCategorySlug: "disability", priority: 80, sortOrder: 5, indexable: true },
  { slug: "pregnancy-taxi", name: "妊産婦タクシー", description: "妊婦健診や出産時の移動を支えるタクシー利用の助成。", parentCategorySlug: "birth", priority: 70, sortOrder: 6, indexable: true },
  { slug: "school-commuting", name: "通学費・就学支援", description: "通学費・入学祝金・学用品など、就学にかかる自治体独自の支援。", parentCategorySlug: "education", priority: 70, sortOrder: 7, indexable: true },
  { slug: "monitoring-meals", name: "見守り・配食", description: "高齢者などの見守り・配食サービスなど、在宅生活を支える支援。", parentCategorySlug: "nursing-care", priority: 75, sortOrder: 8, indexable: true },
  { slug: "emergency-alert", name: "緊急通報・見守り機器", description: "高齢者などの緊急通報システムや見守り機器の設置を支える支援。", parentCategorySlug: "nursing-care", priority: 65, sortOrder: 9, indexable: true },
  { slug: "air-conditioner-energy", name: "エアコン・省エネ家電助成", description: "熱中症予防や省エネのためのエアコン・家電の購入費助成。", parentCategorySlug: "livelihood", priority: 60, sortOrder: 10, indexable: true },
  { slug: "heating-cost", name: "暖房費・灯油助成", description: "冬季の暖房費・灯油の購入費を補助する自治体独自の助成。", parentCategorySlug: "livelihood", priority: 55, sortOrder: 11, indexable: true },
  { slug: "snow-removal", name: "除雪・雪下ろし支援", description: "高齢者世帯などの除雪・雪下ろしを支える支援。", parentCategorySlug: "housing", priority: 50, sortOrder: 12, indexable: true },
  { slug: "furniture-safety", name: "家具転倒防止・防災", description: "家具転倒防止器具の取付や感震ブレーカー設置など、住まいの防災の支援。", parentCategorySlug: "housing", priority: 50, sortOrder: 13, indexable: true },
  { slug: "bicycle-helmet", name: "自転車ヘルメット補助", description: "自転車用ヘルメットの購入費補助。", parentCategorySlug: "childcare", priority: 45, sortOrder: 14, indexable: true },
  { slug: "child-seat", name: "チャイルドシート補助", description: "チャイルドシートの購入・貸与の支援。", parentCategorySlug: "childcare", priority: 45, sortOrder: 15, indexable: true },
];
