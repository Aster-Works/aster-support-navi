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
