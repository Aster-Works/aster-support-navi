import { afterEach, describe, expect, it } from "vitest";
import {
  PLANS,
  formatPlanPrice,
  getPlan,
  paymentLinkFor,
} from "@/app/lib/pro/plans";
import {
  SAMPLE_PACKS,
  getSamplePack,
  selectSampleProgramsFrom,
} from "@/app/lib/pro/samples";
import { categories } from "@/app/data/categories";
import type { SupportProgram } from "@/app/lib/data/types";

describe("料金プラン", () => {
  it("4プラン・id 一意・Free が先頭で 0 円", () => {
    expect(PLANS).toHaveLength(4);
    const ids = PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(4);
    expect(PLANS[0].id).toBe("free");
    expect(PLANS[0].priceMonthly).toBe(0);
  });

  it("価格は単調増加（Free<Personal<Pro<Team）", () => {
    const prices = PLANS.map((p) => p.priceMonthly);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(new Set(prices).size).toBe(4);
  });

  it("有料プランは price>0・feature・対象読者・決済リンク env を持つ", () => {
    for (const p of PLANS.filter((p) => p.id !== "free")) {
      expect(p.priceMonthly).toBeGreaterThan(0);
      expect(p.features.length).toBeGreaterThan(0);
      expect(p.audience.length).toBeGreaterThan(0);
      expect(p.paymentLinkEnv).toMatch(/^NEXT_PUBLIC_STRIPE_LINK_/);
    }
  });

  it("おすすめは1つだけ", () => {
    expect(PLANS.filter((p) => p.highlighted)).toHaveLength(1);
  });

  it("formatPlanPrice", () => {
    expect(formatPlanPrice({ priceMonthly: 0 })).toBe("¥0");
    expect(formatPlanPrice({ priceMonthly: 2980 })).toBe("¥2,980 / 月");
    expect(formatPlanPrice({ priceMonthly: 29800 })).toBe("¥29,800 / 月");
  });

  it("getPlan", () => {
    expect(getPlan("pro")?.name).toBe("Pro");
    expect(getPlan("nope" as never)).toBeUndefined();
  });
});

describe("paymentLinkFor（Stripe Payment Link / env ゲート）", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_STRIPE_LINK_PRO;
  });

  it("Free は常に undefined", () => {
    expect(paymentLinkFor("free")).toBeUndefined();
  });

  it("env 未設定なら undefined", () => {
    expect(paymentLinkFor("pro")).toBeUndefined();
  });

  it("env 設定時は URL を返し、空白はトリム・空文字は undefined", () => {
    process.env.NEXT_PUBLIC_STRIPE_LINK_PRO = "  https://buy.stripe.com/test_x  ";
    expect(paymentLinkFor("pro")).toBe("https://buy.stripe.com/test_x");
    process.env.NEXT_PUBLIC_STRIPE_LINK_PRO = "   ";
    expect(paymentLinkFor("pro")).toBeUndefined();
  });
});

describe("サンプル相談パック", () => {
  it("3種・slug 一意・nextChecks あり・カテゴリは実在", () => {
    expect(SAMPLE_PACKS).toHaveLength(3);
    const slugs = SAMPLE_PACKS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(3);
    const catSlugs = new Set(categories.map((c) => c.slug));
    for (const s of SAMPLE_PACKS) {
      expect(s.nextChecks.length).toBeGreaterThan(0);
      expect(s.categorySlugs.length).toBeGreaterThan(0);
      for (const c of s.categorySlugs) expect(catSlugs.has(c)).toBe(true);
    }
  });

  it("getSamplePack", () => {
    expect(getSamplePack("single-parent")?.categorySlugs).toEqual([
      "single-parent",
    ]);
    expect(getSamplePack("missing")).toBeUndefined();
  });
});

describe("selectSampleProgramsFrom（純関数・代表制度の選定）", () => {
  const make = (
    pref: string,
    muni: string,
    key: string,
    cats: string[],
  ): SupportProgram =>
    ({
      slug: `${pref}-${muni}-${key}`,
      prefectureSlug: pref,
      municipalitySlug: muni,
      categorySlugs: cats,
    }) as unknown as SupportProgram;

  it("カテゴリ一致のみ・制度種別で重複を畳む・上限を守る", () => {
    const programs = [
      make("tokyo", "setagaya", "child-allowance", ["childcare"]),
      make("kanagawa", "yokohama", "child-allowance", ["childcare"]), // 同種→畳む
      make("tokyo", "setagaya", "single-parent-allowance", ["single-parent"]),
      make("tokyo", "setagaya", "housing-aid", ["housing"]), // カテゴリ外
    ];
    const out = selectSampleProgramsFrom(programs, ["childcare", "single-parent"], 10);
    expect(out.map((p) => p.slug)).toEqual([
      "tokyo-setagaya-child-allowance",
      "tokyo-setagaya-single-parent-allowance",
    ]);
  });

  it("limit を超えない", () => {
    const programs = Array.from({ length: 5 }, (_, i) =>
      make("tokyo", "setagaya", `k${i}`, ["livelihood"]),
    );
    expect(selectSampleProgramsFrom(programs, ["livelihood"], 3)).toHaveLength(3);
  });
});
