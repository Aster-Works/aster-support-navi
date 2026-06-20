import { describe, it, expect } from "vitest";
import {
  toSavedItem,
  isInSaved,
  toggleSavedList,
  removeFromSaved,
  setSavedStatus,
  savedStatusCounts,
  isStale,
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

describe("保存ステータス（進捗）", () => {
  it("setSavedStatus は対象 slug のみ更新する", () => {
    const list = [item("a"), item("b")];
    const next = setSavedStatus(list, "a", "applied");
    expect(next.find((i) => i.slug === "a")?.status).toBe("applied");
    expect(next.find((i) => i.slug === "b")?.status).toBeUndefined();
  });
  it("savedStatusCounts は未設定を saved として数える", () => {
    const list = [
      item("a"),
      { ...item("b"), status: "applied" as const },
      { ...item("c"), status: "applied" as const },
    ];
    const counts = savedStatusCounts(list);
    expect(counts.saved).toBe(1);
    expect(counts.applied).toBe(2);
    expect(counts.done).toBe(0);
  });
});

describe("isStale", () => {
  it("91日以上前は古い、90日以内は新しい", () => {
    expect(isStale("2026-01-01", "2026-06-20")).toBe(true); // ~170日
    expect(isStale("2026-06-01", "2026-06-20")).toBe(false); // 19日
    expect(isStale("bad-date", "2026-06-20")).toBe(false);
  });
});
