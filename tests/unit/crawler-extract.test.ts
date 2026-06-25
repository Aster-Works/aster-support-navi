import { describe, it, expect } from "vitest";
import { postProcess, buildUserPrompt } from "@/app/lib/crawler/extract";
import { ExtractionResultSchema } from "@/app/lib/crawler/types";
import type { ExtractedProgram } from "@/app/lib/crawler/types";

const ctx = {
  municipalityName: "テスト区",
  prefecture: "東京都",
  pageUrl: "https://www.city.test.lg.jp/fukushi/omutsu.html",
  pageTitle: "紙おむつ支給",
  categoryHints: ["elderly"],
};

function prog(p: Partial<ExtractedProgram>): ExtractedProgram {
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
    official_url: "https://www.city.test.lg.jp/fukushi/omutsu.html",
    source_quote: "要介護認定を受けた在宅高齢者に紙おむつを支給します",
    confidence: 0.9,
    risk_flags: [],
    ...p,
  };
}

describe("postProcess guardrails", () => {
  it("flags assertive language and lowers confidence", () => {
    const [out] = postProcess([prog({ summary: "あなたは必ずもらえる給付です" })], ctx);
    expect(out.risk_flags).toContain("assertive_language");
    expect(out.confidence).toBeLessThanOrEqual(0.4);
  });

  it("flags weak evidence when source_quote is too short", () => {
    const [out] = postProcess([prog({ source_quote: "短い" })], ctx);
    expect(out.risk_flags).toContain("weak_evidence");
    expect(out.confidence).toBeLessThanOrEqual(0.5);
  });

  it("fills missing official_url with the page url", () => {
    const [out] = postProcess([prog({ official_url: "" })], ctx);
    expect(out.official_url).toBe(ctx.pageUrl);
  });

  it("clamps confidence to 0..1", () => {
    const [a] = postProcess([prog({ confidence: 5 })], ctx);
    expect(a.confidence).toBe(1);
    const [b] = postProcess([prog({ confidence: Number.NaN })], ctx);
    expect(b.confidence).toBeGreaterThanOrEqual(0);
    expect(b.confidence).toBeLessThanOrEqual(1);
  });
});

describe("extraction schema + prompt", () => {
  it("validates a well-formed tool output", () => {
    const parsed = ExtractionResultSchema.safeParse({ programs: [prog({})] });
    expect(parsed.success).toBe(true);
  });
  it("rejects malformed output (missing title)", () => {
    const bad = { programs: [{ ...prog({}), title: undefined }] };
    expect(ExtractionResultSchema.safeParse(bad).success).toBe(false);
  });
  it("buildUserPrompt embeds the page url and clips long text", () => {
    const p = buildUserPrompt("x".repeat(50_000), ctx);
    expect(p).toContain(ctx.pageUrl);
    expect(p.length).toBeLessThan(20_000);
  });
});
