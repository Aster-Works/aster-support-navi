import { describe, it, expect } from "vitest";
import {
  applyFilters,
  getActiveMunicipalities,
  getProgramsByMunicipality,
  getProgramsByLifeEvent,
  getRelatedPrograms,
  getAllPublishedPrograms,
  getProgram,
} from "@/app/lib/data";

describe("applyFilters", () => {
  it("自治体・カテゴリ・オンライン・キーワードで絞り込む", async () => {
    const all = await getAllPublishedPrograms();
    expect(applyFilters(all, { municipalitySlug: "setagaya" }).length).toBe(7);
    expect(
      applyFilters(all, { categorySlug: "single-parent" }).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      applyFilters(all, { onlineOnly: true }).every(
        (p) => p.onlineApplicationAvailable,
      ),
    ).toBe(true);
    const kw = applyFilters(all, { keyword: "児童手当" });
    expect(kw.length).toBeGreaterThan(0);
    expect(kw.every((p) => p.title.includes("児童手当"))).toBe(true);
  });
});

describe("data layer", () => {
  it("active 自治体は制度を持つ自治体（元の5区を必ず含む）", async () => {
    const active = await getActiveMunicipalities("tokyo");
    expect(active.length).toBeGreaterThanOrEqual(5);
    const slugs = active.map((m) => m.slug);
    for (const s of ["koto", "minato", "nerima", "setagaya", "shinjuku"]) {
      expect(slugs).toContain(s);
    }
  });

  it("自治体ごとに7制度", async () => {
    const p = await getProgramsByMunicipality("tokyo", "shinjuku");
    expect(p.length).toBe(7);
    expect(p.every((x) => x.municipalitySlug === "shinjuku")).toBe(true);
  });

  it("生活イベントでフィルタできる（子育て）", async () => {
    const p = await getProgramsByLifeEvent("tokyo", "setagaya", "childcare");
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((x) => x.lifeEventSlugs.includes("childcare"))).toBe(true);
  });

  it("関連制度は同一自治体・自分以外", async () => {
    const target = await getProgram("tokyo-setagaya-child-allowance");
    expect(target).toBeTruthy();
    const related = await getRelatedPrograms(target!, 3);
    expect(related.every((r) => r.municipalitySlug === "setagaya")).toBe(true);
    expect(related.every((r) => r.slug !== target!.slug)).toBe(true);
    expect(related.length).toBeLessThanOrEqual(3);
  });
});
