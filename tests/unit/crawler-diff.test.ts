import { describe, it, expect } from "vitest";
import { classifyChange, titleSimilar, normalizeForCompare } from "@/app/lib/crawler/diff";
import type { ExtractedProgram, ExistingProgram } from "@/app/lib/crawler/types";

function ex(partial: Partial<ExtractedProgram>): ExtractedProgram {
  return {
    title: "紙おむつ支給",
    category: "elderly",
    summary: null,
    target_people: null,
    eligibility_conditions: null,
    benefit_detail: null,
    amount: null,
    application_method: null,
    required_documents: null,
    deadline: null,
    contact_department: null,
    contact_phone: null,
    contact_url: null,
    official_url: "https://x.lg.jp/omutsu",
    source_quote: "本文の引用",
    confidence: 0.8,
    risk_flags: [],
    ...partial,
  };
}

function cur(partial: Partial<ExistingProgram>): ExistingProgram {
  return {
    id: "p1",
    title: "紙おむつ支給",
    official_url: "https://x.lg.jp/omutsu",
    category: null,
    target_people: "要介護高齢者",
    benefit_amount_text: "月6000円分",
    application_deadline_text: null,
    application_method_text: "窓口申請",
    required_documents_text: null,
    contact_phone: "03-0000-0000",
    ...partial,
  };
}

describe("classifyChange", () => {
  it("returns new when no existing match", () => {
    const r = classifyChange(ex({}), []);
    expect(r.changeType).toBe("new");
    expect(r.oldProgramId).toBeNull();
  });

  it("returns unchanged when matched and no important field differs", () => {
    const r = classifyChange(ex({ amount: "月6000円分", target_people: "要介護高齢者" }), [cur({})]);
    expect(r.changeType).toBe("unchanged");
    expect(r.oldProgramId).toBe("p1");
    expect(r.importantChange).toBe(false);
  });

  it("returns updated with importantChange when amount differs", () => {
    const r = classifyChange(ex({ amount: "月8000円分" }), [cur({})]);
    expect(r.changeType).toBe("updated");
    expect(r.importantChange).toBe(true);
    expect(r.changedFields).toContain("金額");
  });

  it("ignores null extracted fields (info gaps are not changes)", () => {
    const r = classifyChange(ex({ amount: null }), [cur({})]);
    expect(r.changeType).toBe("unchanged");
  });

  it("matches by URL even when title differs", () => {
    const r = classifyChange(
      ex({ title: "おむつ給付事業", amount: "月8000円分" }),
      [cur({ title: "全く別の名前" })],
    );
    expect(r.changeType).toBe("updated");
    expect(r.oldProgramId).toBe("p1");
  });
});

describe("titleSimilar / normalizeForCompare", () => {
  it("treats spacing/punctuation-insensitive titles as equal", () => {
    expect(titleSimilar("紙おむつ 支給", "紙おむつ・支給")).toBe(true);
  });
  it("does not over-match unrelated titles", () => {
    expect(titleSimilar("紙おむつ支給", "就学援助")).toBe(false);
  });
  it("normalizes width and case", () => {
    expect(normalizeForCompare("ＡＢＣ 1")).toBe("abc1");
  });
});
