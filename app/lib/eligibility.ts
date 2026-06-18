import type { SupportProgram } from "@/app/lib/data/types";

/** 診断の回答（機微情報を持たない。収入は粗いバンドのみ・任意）。 */
export type ChildAgeBand = "0-2" | "3-5" | "6-12" | "13-18";

export interface DiagnosisAnswers {
  municipality?: string; // 自治体 slug
  pregnant?: boolean;
  childAgeBands?: ChildAgeBand[];
  singleParent?: boolean;
  moving?: boolean;
  interests?: string[]; // category slug
}

export interface Candidate {
  program: SupportProgram;
  reasons: string[];
  score: number;
}

/**
 * 回答から「確認するとよい制度の候補」を機械的に並べる（純関数・Vitest 対象）。
 * 受給可否は判定しない。理由は断定せず「〜のため」と状況に基づく説明にとどめる。
 */
export function matchPrograms(
  answers: DiagnosisAnswers,
  programs: SupportProgram[],
): Candidate[] {
  const pool = answers.municipality
    ? programs.filter((p) => p.municipalitySlug === answers.municipality)
    : programs;

  const hasSmall = !!answers.childAgeBands?.some(
    (b) => b === "0-2" || b === "3-5",
  );
  const hasSchool = !!answers.childAgeBands?.some(
    (b) => b === "6-12" || b === "13-18",
  );
  const interests = new Set(answers.interests ?? []);

  const out: Candidate[] = [];
  for (const p of pool) {
    const cats = new Set(p.categorySlugs);
    const events = new Set(p.lifeEventSlugs);
    const reasons: string[] = [];

    if (answers.pregnant && (events.has("birth") || cats.has("birth"))) {
      reasons.push("妊娠中・出産を予定しているため");
    }
    if (
      hasSmall &&
      (cats.has("childcare") ||
        cats.has("medical") ||
        events.has("childcare") ||
        events.has("nursery"))
    ) {
      reasons.push("小さなお子さんがいるため");
    }
    if (
      hasSchool &&
      (cats.has("education") || cats.has("medical") || events.has("school"))
    ) {
      reasons.push("就学年代のお子さんがいるため");
    }
    if (
      answers.singleParent &&
      (cats.has("single-parent") || events.has("single-parent"))
    ) {
      reasons.push("ひとり親家庭のため");
    }
    if (answers.moving && events.has("moving")) {
      reasons.push("引っ越し・転入の予定があるため");
    }
    if ([...interests].some((i) => cats.has(i))) {
      reasons.push("関心のあるカテゴリに当てはまるため");
    }

    if (reasons.length > 0) {
      out.push({ program: p, reasons, score: reasons.length });
    }
  }

  out.sort(
    (a, b) =>
      b.score - a.score || a.program.title.localeCompare(b.program.title, "ja"),
  );
  return out;
}

/** 回答が「何かしら入力された」と言えるか（結果ページのガード）。 */
export function hasAnyAnswer(a: DiagnosisAnswers): boolean {
  return (
    !!a.municipality ||
    !!a.pregnant ||
    (a.childAgeBands?.length ?? 0) > 0 ||
    !!a.singleParent ||
    !!a.moving ||
    (a.interests?.length ?? 0) > 0
  );
}

// ---- URL エンコード／デコード（/check → /check/result の受け渡し） ----------
const AGE_VALUES: ChildAgeBand[] = ["0-2", "3-5", "6-12", "13-18"];

export function encodeAnswers(a: DiagnosisAnswers): string {
  const sp = new URLSearchParams();
  if (a.municipality) sp.set("m", a.municipality);
  if (a.pregnant) sp.set("preg", "1");
  if (a.childAgeBands?.length) sp.set("ages", a.childAgeBands.join(","));
  if (a.singleParent) sp.set("single", "1");
  if (a.moving) sp.set("move", "1");
  if (a.interests?.length) sp.set("i", a.interests.join(","));
  return sp.toString();
}

export function decodeAnswers(
  sp: Record<string, string | string[] | undefined>,
): DiagnosisAnswers {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const ages = (get("ages") ?? "")
    .split(",")
    .filter((x): x is ChildAgeBand => (AGE_VALUES as string[]).includes(x));
  const interests = (get("i") ?? "").split(",").filter(Boolean);
  return {
    municipality: get("m") || undefined,
    pregnant: get("preg") === "1",
    childAgeBands: ages.length ? ages : undefined,
    singleParent: get("single") === "1",
    moving: get("move") === "1",
    interests: interests.length ? interests : undefined,
  };
}
