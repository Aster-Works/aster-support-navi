import { describe, it, expect } from "vitest";
import {
  toSavedItem,
  isInSaved,
  toggleSavedList,
  removeFromSaved,
  type SavedItem,
} from "@/app/lib/saved";
import type { SupportProgram } from "@/app/lib/data/types";

const program: SupportProgram = {
  id: "tokyo-setagaya-child-allowance",
  slug: "tokyo-setagaya-child-allowance",
  prefectureSlug: "tokyo",
  municipalitySlug: "setagaya",
  title: "児童手当",
  summary: "概要",
  categorySlugs: ["childcare"],
  lifeEventSlugs: ["childcare"],
  benefitType: "cash",
  targetPeople: "対象となる可能性があります",
  applicationDeadlineText: "出生から15日以内",
  applicationMethodText: "窓口",
  onlineApplicationAvailable: true,
  officialUrl: "https://www.city.setagaya.lg.jp/",
  lastOfficialCheckedAt: "2026-06-17",
  sourceConfidence: "high",
  status: "published",
};

const item = (slug: string): SavedItem => ({
  slug,
  title: slug,
  municipalitySlug: "setagaya",
  municipalityName: "世田谷区",
  summary: "x",
  online: false,
  hasDeadline: false,
  lastOfficialCheckedAt: "2026-06-17",
  savedAt: "2026-06-18T00:00:00.000Z",
});

describe("toSavedItem", () => {
  it("制度からスナップショットを作る（期限バッジ・オンラインを反映）", () => {
    const s = toSavedItem(program, {
      municipalityName: "世田谷区",
      categoryName: "子育て",
      savedAt: "2026-06-18T00:00:00.000Z",
    });
    expect(s).toMatchObject({
      slug: "tokyo-setagaya-child-allowance",
      title: "児童手当",
      municipalityName: "世田谷区",
      categoryName: "子育て",
      online: true,
      hasDeadline: true,
    });
  });
});

describe("toggle / remove / isIn", () => {
  it("未保存ならトグルで先頭に追加", () => {
    const next = toggleSavedList([item("a")], item("b"));
    expect(next.map((i) => i.slug)).toEqual(["b", "a"]);
  });
  it("保存済みならトグルで削除", () => {
    const next = toggleSavedList([item("a"), item("b")], item("a"));
    expect(next.map((i) => i.slug)).toEqual(["b"]);
  });
  it("isInSaved / removeFromSaved", () => {
    const list = [item("a"), item("b")];
    expect(isInSaved(list, "a")).toBe(true);
    expect(isInSaved(list, "z")).toBe(false);
    expect(removeFromSaved(list, "a").map((i) => i.slug)).toEqual(["b"]);
  });
});
