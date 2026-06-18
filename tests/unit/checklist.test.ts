import { describe, it, expect } from "vitest";
import { buildChecklist, buildInquiryText } from "@/app/lib/checklist";
import type { SupportProgram } from "@/app/lib/data/types";

const base: SupportProgram = {
  id: "p",
  slug: "p",
  prefectureSlug: "tokyo",
  municipalitySlug: "setagaya",
  title: "児童手当",
  summary: "概要",
  categorySlugs: ["childcare"],
  lifeEventSlugs: ["childcare"],
  benefitType: "cash",
  targetPeople: "対象となる可能性があります",
  applicationMethodText: "窓口・郵送・オンライン",
  officialUrl: "https://example.lg.jp/",
  lastOfficialCheckedAt: "2026-06-17",
  sourceConfidence: "high",
  status: "published",
};

describe("buildChecklist", () => {
  it("常に対象確認・申請方法・控え保存を含む", () => {
    const items = buildChecklist(base);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("eligibility");
    expect(ids).toContain("method");
    expect(ids).toContain("record");
  });

  it("オンライン申請可なら online 項目が増える", () => {
    const withOnline = buildChecklist({
      ...base,
      onlineApplicationAvailable: true,
    });
    expect(withOnline.some((i) => i.id === "online")).toBe(true);
    const without = buildChecklist(base);
    expect(without.some((i) => i.id === "online")).toBe(false);
  });

  it("必要書類・問い合わせがあれば項目に出る", () => {
    const items = buildChecklist({
      ...base,
      requiredDocumentsText: "本人確認書類",
      contactPhone: "03-0000-0000",
    });
    expect(items.some((i) => i.id === "documents")).toBe(true);
    expect(items.some((i) => i.id === "contact")).toBe(true);
  });
});

describe("buildInquiryText", () => {
  it("自治体名と制度名を含み、断定しない問い合わせ文になる", () => {
    const text = buildInquiryText(base, "世田谷区");
    expect(text).toContain("世田谷区");
    expect(text).toContain("児童手当");
    expect(text).toContain("対象となる可能性があるか");
    // 代行・断定の語を含まない
    expect(text).not.toContain("代行");
    expect(text).not.toContain("必ず");
  });
});
