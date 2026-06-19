"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { SupportProgram } from "@/app/lib/data/types";
import {
  loadSaved,
  persistSaved,
  toggleSavedList,
  isInSaved,
  toSavedItem,
} from "@/app/lib/saved";

export interface SaveButtonProgram {
  slug: string;
  title: string;
  municipalitySlug: string;
  summary: string;
  online: boolean;
  deadlineText?: string;
  deadlineEnd?: string;
  checkedAt: string;
}

/** 制度の保存トグル（localStorage・ログイン不要）。 */
export function SaveButton({
  program,
  municipalityName,
  categoryName,
  className = "btn-secondary",
}: {
  program: SaveButtonProgram;
  municipalityName: string;
  categoryName?: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(isInSaved(loadSaved(), program.slug));
  }, [program.slug]);

  function toggle() {
    const source: Pick<
      SupportProgram,
      | "slug"
      | "title"
      | "municipalitySlug"
      | "summary"
      | "onlineApplicationAvailable"
      | "applicationDeadlineText"
      | "applicationPeriodEnd"
      | "lastOfficialCheckedAt"
    > = {
      slug: program.slug,
      title: program.title,
      municipalitySlug: program.municipalitySlug,
      summary: program.summary,
      onlineApplicationAvailable: program.online,
      applicationDeadlineText: program.deadlineText,
      applicationPeriodEnd: program.deadlineEnd,
      lastOfficialCheckedAt: program.checkedAt,
    };
    const item = toSavedItem(source, {
      municipalityName,
      categoryName,
      savedAt: new Date().toISOString(),
    });
    const next = toggleSavedList(loadSaved(), item);
    persistSaved(next);
    setSaved(isInSaved(next, program.slug));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={className}
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4 text-gold-ink" aria-hidden="true" />
          保存済み
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" aria-hidden="true" />
          保存する
        </>
      )}
    </button>
  );
}
