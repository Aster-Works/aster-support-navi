import { describe, expect, it } from "vitest";
import { applyFilters, shouldIndexTopic } from "@/app/lib/data";
import { topics } from "@/app/data/topics";
import { categories } from "@/app/data/categories";
import type { SupportProgram, SupportTopic } from "@/app/lib/data/types";

function prog(over: Partial<SupportProgram> = {}): SupportProgram {
  return {
    id: over.slug ?? "x",
    slug: "tokyo-setagaya-hearing-aid",
    prefectureSlug: "tokyo",
    municipalitySlug: "setagaya",
    title: "補聴器",
    summary: "概要",
    categorySlugs: ["nursing-care"],
    lifeEventSlugs: ["caregiving"],
    topicSlugs: ["hearing-aid"],
    benefitType: "subsidy",
    targetPeople: "対象となる可能性があります",
    applicationMethodText: "窓口",
    officialUrl: "https://www.city.setagaya.lg.jp/x",
    lastOfficialCheckedAt: "2026-06-24",
    sourceConfidence: "high",
    status: "published",
    ...over,
  };
}

describe("topic seed の整合", () => {
  it("15 テーマ・slug は一意", () => {
    expect(topics.length).toBe(15);
    expect(new Set(topics.map((t) => t.slug)).size).toBe(15);
  });
  it("parentCategorySlug は実在カテゴリを指す", () => {
    const cats = new Set(categories.map((c) => c.slug));
    for (const t of topics) {
      if (t.parentCategorySlug) expect(cats.has(t.parentCategorySlug)).toBe(true);
    }
  });
  it("hearing-aid が含まれ、説明文を持つ", () => {
    const h = topics.find((t) => t.slug === "hearing-aid");
    expect(h).toBeTruthy();
    expect(h!.description).toBeTruthy();
  });
});

describe("applyFilters: topicSlug", () => {
  it("topicSlug で絞り込める", () => {
    const list = [
      prog({ slug: "a", topicSlugs: ["hearing-aid"] }),
      prog({ slug: "b", topicSlugs: ["elderly-diapers"] }),
      prog({ slug: "c", topicSlugs: undefined }),
    ];
    expect(applyFilters(list, { topicSlug: "hearing-aid" }).map((p) => p.slug)).toEqual(["a"]);
  });
});

describe("shouldIndexTopic: 薄いページを index させない", () => {
  const topic: SupportTopic = {
    slug: "hearing-aid",
    name: "補聴器購入費助成",
    description: "説明",
    priority: 100,
    sortOrder: 1,
    indexable: true,
  };
  it("3件以上・2自治体以上・説明ありで index 可", () => {
    const list = [
      prog({ slug: "a", municipalitySlug: "setagaya" }),
      prog({ slug: "b", municipalitySlug: "minato" }),
      prog({ slug: "c", municipalitySlug: "kita" }),
    ];
    expect(shouldIndexTopic(topic, list)).toBe(true);
  });
  it("件数不足は index 不可", () => {
    expect(shouldIndexTopic(topic, [prog({ slug: "a" })])).toBe(false);
  });
  it("単一自治体は index 不可", () => {
    const list = [
      prog({ slug: "a", municipalitySlug: "setagaya" }),
      prog({ slug: "b", municipalitySlug: "setagaya" }),
      prog({ slug: "c", municipalitySlug: "setagaya" }),
    ];
    expect(shouldIndexTopic(topic, list)).toBe(false);
  });
  it("indexable=false / 説明なしは index 不可", () => {
    const list = [
      prog({ slug: "a", municipalitySlug: "setagaya" }),
      prog({ slug: "b", municipalitySlug: "minato" }),
      prog({ slug: "c", municipalitySlug: "kita" }),
    ];
    expect(shouldIndexTopic({ ...topic, indexable: false }, list)).toBe(false);
    expect(shouldIndexTopic({ ...topic, description: undefined }, list)).toBe(false);
  });
});
