import {
  Baby,
  ToyBrick,
  Truck,
  School,
  Backpack,
  HeartHandshake,
  LifeBuoy,
  HandHeart,
  Home,
  Accessibility,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

/** 生活イベント slug / icon 名 から lucide アイコンを引く。 */
const ICONS: Record<string, LucideIcon> = {
  Baby,
  ToyBrick,
  Truck,
  School,
  Backpack,
  HeartHandshake,
  LifeBuoy,
  HandHeart,
  Home,
  Accessibility,
};

export function LifeEventIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Cmp = (name && ICONS[name]) || HelpCircle;
  return <Cmp className={className} aria-hidden="true" />;
}

/** 生活イベント slug ごとの装飾アクセント（意味を持たない「気分」の色）。
 *  近い生活段階（保育園/就学、子育て/介護など）は同系色でまとめ、塗りすぎない。 */
const LIFE_EVENT_TINTS: Record<string, { soft: string; ink: string }> = {
  birth: { soft: "bg-rose-soft", ink: "text-rose" },
  childcare: { soft: "bg-peach-soft", ink: "text-peach" },
  moving: { soft: "bg-sky-soft", ink: "text-sky" },
  nursery: { soft: "bg-sage-soft", ink: "text-sage" },
  school: { soft: "bg-sage-soft", ink: "text-sage" },
  "single-parent": { soft: "bg-aster-soft", ink: "text-aster" },
  hardship: { soft: "bg-gold-soft", ink: "text-gold-ink" },
  caregiving: { soft: "bg-peach-soft", ink: "text-peach" },
  housing: { soft: "bg-sky-soft", ink: "text-sky" },
  disability: { soft: "bg-aster-soft", ink: "text-aster" },
};
const DEFAULT_TINT = { soft: "bg-aster-soft", ink: "text-aster" };

/** 生活イベントのアイコン／カードに使う塗り分けクラスを返す。
 *  ホーム・自治体ページ・生活イベント詳細で共通して使い、見た目を揃える。 */
export function lifeEventTint(slug?: string): { soft: string; ink: string } {
  return (slug && LIFE_EVENT_TINTS[slug]) || DEFAULT_TINT;
}
