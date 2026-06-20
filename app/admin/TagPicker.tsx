"use client";

import type { MasterOption } from "@/app/lib/admin/client";

/** カテゴリ/生活イベントなどの複数選択（チェックボックス群）。 */
export function TagPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: MasterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (slug: string) => {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug],
    );
  };
  return (
    <fieldset className="block text-sm">
      <legend className="mb-1 text-charcoal/80">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.slug}
            type="button"
            className="aw-chip"
            data-active={selected.includes(o.slug)}
            aria-pressed={selected.includes(o.slug)}
            onClick={() => toggle(o.slug)}
          >
            {o.name}
          </button>
        ))}
        {options.length === 0 && (
          <span className="text-xs text-charcoal/50">選択肢を読み込み中…</span>
        )}
      </div>
    </fieldset>
  );
}
