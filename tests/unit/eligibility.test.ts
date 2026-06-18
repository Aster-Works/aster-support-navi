import { describe, it, expect } from "vitest";
import {
  matchPrograms,
  encodeAnswers,
  decodeAnswers,
  hasAnyAnswer,
  type DiagnosisAnswers,
} from "@/app/lib/eligibility";
import type { SupportProgram } from "@/app/lib/data/types";

function prog(p: Partial<SupportProgram>): SupportProgram {
  return {
    id: p.slug ?? "x",
    slug: p.slug ?? "x",
    prefectureSlug: "tokyo",
    municipalitySlug: p.municipalitySlug ?? "setagaya",
    title: p.title ?? "テスト制度",
    summary: "概要",
    categorySlugs: p.categorySlugs ?? [],
    lifeEventSlugs: p.lifeEventSlugs ?? [],
    benefitType: "cash",
    targetPeople: "対象となる可能性があります",
    applicationMethodText: "窓口",
    officialUrl: "https://example.lg.jp/",
    lastOfficialCheckedAt: "2026-06-17",
    sourceConfidence: "high",
    status: "published",
    ...p,
  };
}

const POOL = [
  prog({ slug: "allowance", categorySlugs: ["childcare"], lifeEventSlugs: ["birth", "childcare", "moving"] }),
  prog({ slug: "medical", categorySlugs: ["medical"], lifeEventSlugs: ["childcare", "school"] }),
  prog({ slug: "single", categorySlugs: ["single-parent"], lifeEventSlugs: ["single-parent"] }),
  prog({ slug: "other-ward", municipalitySlug: "nerima", categorySlugs: ["childcare"], lifeEventSlugs: ["childcare"] }),
];

describe("matchPrograms", () => {
  it("自治体で絞り込む", () => {
    const r = matchPrograms(
      { municipality: "setagaya", childAgeBands: ["0-2"] },
      POOL,
    );
    expect(r.every((c) => c.program.municipalitySlug === "setagaya")).toBe(true);
  });

  it("妊娠中は birth カテゴリ/イベントを候補に出し理由を付ける", () => {
    const r = matchPrograms({ municipality: "setagaya", pregnant: true }, POOL);
    const allowance = r.find((c) => c.program.slug === "allowance");
    expect(allowance).toBeTruthy();
    expect(allowance!.reasons).toContain("妊娠中・出産を予定しているため");
  });

  it("ひとり親は single-parent を候補に出す", () => {
    const r = matchPrograms(
      { municipality: "setagaya", singleParent: true },
      POOL,
    );
    expect(r.some((c) => c.program.slug === "single")).toBe(true);
  });

  it("該当しない回答では候補が出ない", () => {
    const r = matchPrograms({ municipality: "setagaya" }, POOL);
    expect(r.length).toBe(0);
  });

  it("score 降順で並ぶ（決定的）", () => {
    const r = matchPrograms(
      {
        municipality: "setagaya",
        pregnant: true,
        childAgeBands: ["0-2", "6-12"],
        interests: ["childcare"],
      },
      POOL,
    );
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    }
  });
});

describe("encode/decode answers", () => {
  it("往復で一致する", () => {
    const a: DiagnosisAnswers = {
      municipality: "setagaya",
      pregnant: true,
      childAgeBands: ["0-2", "6-12"],
      singleParent: true,
      moving: true,
      interests: ["childcare", "medical"],
    };
    const sp = Object.fromEntries(new URLSearchParams(encodeAnswers(a)));
    expect(decodeAnswers(sp)).toEqual(a);
  });

  it("空回答は undefined に正規化", () => {
    const decoded = decodeAnswers({});
    expect(decoded.municipality).toBeUndefined();
    expect(decoded.childAgeBands).toBeUndefined();
    expect(hasAnyAnswer(decoded)).toBe(false);
  });

  it("不正な ages 値を捨てる", () => {
    const decoded = decodeAnswers({ ages: "0-2,bogus,99" });
    expect(decoded.childAgeBands).toEqual(["0-2"]);
  });
});
