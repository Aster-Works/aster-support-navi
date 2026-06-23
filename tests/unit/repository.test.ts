import { afterEach, describe, expect, it } from "vitest";
import {
  getRepository,
  resolveDataSource,
  type DataSource,
} from "@/app/lib/data/repository";
import { seedRepository } from "@/app/lib/data/seedRepository";
import {
  hybridRepository,
  supabaseRepository,
} from "@/app/lib/data/supabaseRepository";
import { getAllPublishedPrograms } from "@/app/lib/data";
import { isPublishable } from "@/app/lib/data/types";

const ORIGINAL = process.env.DATA_SOURCE;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.DATA_SOURCE;
  else process.env.DATA_SOURCE = ORIGINAL;
});

describe("resolveDataSource", () => {
  const cases: [string | undefined, DataSource][] = [
    [undefined, "supabase"],
    ["", "supabase"],
    ["seed", "seed"],
    ["supabase", "supabase"],
    ["hybrid", "hybrid"],
    ["SUPABASE", "supabase"],
    ["  Hybrid  ", "hybrid"],
    ["garbage", "supabase"],
  ];
  for (const [value, expected] of cases) {
    it(`${JSON.stringify(value)} → ${expected}`, () => {
      if (value === undefined) delete process.env.DATA_SOURCE;
      else process.env.DATA_SOURCE = value;
      expect(resolveDataSource()).toBe(expected);
    });
  }
});

describe("getRepository selection", () => {
  it("既定は supabaseRepository（DBが正式source of truth）", () => {
    delete process.env.DATA_SOURCE;
    expect(getRepository()).toBe(supabaseRepository);
  });
  it("seed / hybrid は明示した場合だけ選べる", () => {
    process.env.DATA_SOURCE = "seed";
    expect(getRepository()).toBe(seedRepository);
    process.env.DATA_SOURCE = "hybrid";
    expect(getRepository()).toBe(hybridRepository);
  });
});

describe("seedRepository の不変条件", () => {
  it("公開制度はすべて公開可能ゲート（§3）を満たす", async () => {
    const published = await seedRepository.getPublishedPrograms();
    expect(published.length).toBeGreaterThan(0);
    expect(published.every(isPublishable)).toBe(true);
    // §3: 公式URL・最終確認日が必ずある。
    expect(
      published.every((p) => p.officialUrl && p.lastOfficialCheckedAt),
    ).toBe(true);
  });

  it("slug は全制度で一意", async () => {
    const published = await seedRepository.getPublishedPrograms();
    const slugs = published.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("マスタ（都道府県・自治体・カテゴリ・生活イベント）が読める", async () => {
    expect((await seedRepository.getPrefectures()).length).toBeGreaterThan(0);
    expect((await seedRepository.getMunicipalities()).length).toBeGreaterThan(0);
    expect((await seedRepository.getCategories()).length).toBeGreaterThan(0);
    expect((await seedRepository.getLifeEvents()).length).toBeGreaterThan(0);
  });
});

describe("データ層の委譲（parity）", () => {
  it("DATA_SOURCE=seed 明示時は getAllPublishedPrograms() が seedRepository と一致する", async () => {
    process.env.DATA_SOURCE = "seed";
    const viaIndex = await getAllPublishedPrograms();
    const viaRepo = await seedRepository.getPublishedPrograms();
    expect(viaIndex.map((p) => p.slug)).toEqual(viaRepo.map((p) => p.slug));
  });
});
