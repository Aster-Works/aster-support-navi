export function SectionHeading({
  eyebrow,
  title,
  description,
  as: As = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="aw-eyebrow">{eyebrow}</p>}
      <As className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-[28px]">
        {title}
      </As>
      {description && (
        <p className="mt-3 text-[15px] leading-8 text-charcoal">{description}</p>
      )}
    </div>
  );
}
