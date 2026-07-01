"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Search, MapPin } from "lucide-react";

export interface MuniOption {
  name: string;
  nameKana?: string;
  slug: string;
  prefectureSlug: string;
  active: boolean;
}

/** 自治体名から探すための入力（datalist 補完）。
 *  該当する active 自治体があればその自治体ページへ、なければ検索ページへ。
 *  onDark: 濃紺ヒーロー等の暗背景に置くとき、送信ボタンに縁取りを足して輪郭を出す。 */
export function HomeSearch({
  municipalities,
  onDark = false,
}: {
  municipalities: MuniOption[];
  onDark?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const [value, setValue] = useState("");

  function go() {
    const q = value.trim();
    if (!q) {
      router.push("/search");
      return;
    }
    const match = municipalities.find(
      (m) => m.name === q || m.nameKana === q || m.name.replace("区", "") === q,
    );
    if (match) {
      // active でも準備中でも自治体ページへ（準備中ページが丁寧に案内する）。
      router.push(`/${match.prefectureSlug}/${match.slug}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="flex flex-col gap-2.5 sm:flex-row"
    >
      <label htmlFor={inputId} className="sr-only">
        自治体名で探す
      </label>
      <div className="relative min-w-0 flex-1">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-charcoal/40"
          aria-hidden="true"
        />
        <input
          id={inputId}
          list={listId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="自治体名を入力（例：世田谷区・大阪市）"
          className="aw-input pl-11"
          autoComplete="off"
          enterKeyHint="search"
        />
        <datalist id={listId}>
          {municipalities.map((m) => (
            <option key={`${m.prefectureSlug}-${m.slug}`} value={m.name}>
              {m.active ? "制度あり" : "準備中"}
            </option>
          ))}
        </datalist>
      </div>
      <button
        type="submit"
        className={`btn-primary shrink-0${onDark ? " ring-1 ring-white/20" : ""}`}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        探す
      </button>
    </form>
  );
}
