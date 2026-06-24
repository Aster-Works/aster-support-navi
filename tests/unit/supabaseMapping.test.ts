import { describe, expect, it } from "vitest";
import {
  mapProgram,
  unionBySlug,
  unionMunicipalities,
  type ProgramRow,
} from "@/app/lib/data/supabaseRepository";
import type { Municipality } from "@/app/lib/data/types";

function fullRow(overrides: Partial<ProgramRow> = {}): ProgramRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "tokyo-setagaya-child-allowance",
    title: "児童手当",
    summary: "概要",
    plain_language_summary: "やさしい概要",
    benefit_type: "cash",
    target_people: "対象となる可能性がある人",
    benefit_amount_text: "月額10,000円とされています（公式で確認）",
    application_deadline_text: "出生日の翌日から15日以内とされています",
    application_period_end: "2026-12-31",
    application_method_text: "窓口・郵送・電子申請",
    required_documents_text: "本人確認書類ほか",
    online_application_available: true,
    contact_name: "子ども家庭課",
    contact_phone: "03-0000-0000",
    contact_url: null,
    official_url: "https://www.city.setagaya.lg.jp/example",
    official_source_title: "世田谷区 公式サイト",
    last_official_checked_at: "2026-06-17",
    source_confidence: "high",
    uncertain_fields: ["benefitAmountText"],
    disclaimer_note: null,
    status: "published",
    updated_at: "2026-06-17T00:00:00+00:00",
    municipality: { slug: "setagaya", prefecture: { slug: "tokyo" } },
    categories: [{ category: { slug: "childcare" } }, { category: { slug: "birth" } }],
    life_events: [{ life_event: { slug: "childcare" } }],
    topics: [{ topic: { slug: "hearing-aid" } }],
    ...overrides,
  };
}

describe("mapProgram（DB行 → ドメイン型の往復）", () => {
  it("全フィールドを正しく camelCase へ写像する", () => {
    const p = mapProgram(fullRow());
    expect(p).not.toBeNull();
    expect(p!).toMatchObject({
      slug: "tokyo-setagaya-child-allowance",
      prefectureSlug: "tokyo",
      municipalitySlug: "setagaya",
      title: "児童手当",
      plainLanguageSummary: "やさしい概要",
      benefitType: "cash",
      applicationPeriodEnd: "2026-12-31",
      onlineApplicationAvailable: true,
      officialUrl: "https://www.city.setagaya.lg.jp/example",
      lastOfficialCheckedAt: "2026-06-17",
      sourceConfidence: "high",
      updatedAt: "2026-06-17T00:00:00+00:00",
    });
    expect(p!.categorySlugs).toEqual(["childcare", "birth"]);
    expect(p!.lifeEventSlugs).toEqual(["childcare"]);
    expect(p!.topicSlugs).toEqual(["hearing-aid"]);
    expect(p!.uncertainFields).toEqual(["benefitAmountText"]);
  });

  it("null 列は undefined（任意フィールド）になる", () => {
    const p = mapProgram(fullRow({ plain_language_summary: null, contact_url: null }));
    expect(p!.plainLanguageSummary).toBeUndefined();
    expect(p!.contactUrl).toBeUndefined();
  });

  it("親（自治体/都道府県）が欠ける行は null で捨てる", () => {
    expect(mapProgram(fullRow({ municipality: null }))).toBeNull();
    expect(
      mapProgram(fullRow({ municipality: { slug: "x", prefecture: null } })),
    ).toBeNull();
  });

  it("カテゴリ/生活イベント/テーマの空・欠落は空配列になる", () => {
    const p = mapProgram(fullRow({ categories: null, life_events: [], topics: null }));
    expect(p!.categorySlugs).toEqual([]);
    expect(p!.lifeEventSlugs).toEqual([]);
    expect(p!.topicSlugs).toEqual([]);
  });
});

describe("hybrid 合成（DB 優先 + seed 補完）", () => {
  it("unionBySlug は DB を優先し、未登録 slug だけ seed から足す", () => {
    const db = [{ slug: "a", v: "db" }];
    const seed = [
      { slug: "a", v: "seed" },
      { slug: "b", v: "seed" },
    ];
    const merged = unionBySlug(db, seed);
    expect(merged.map((x) => x.slug)).toEqual(["a", "b"]);
    expect(merged.find((x) => x.slug === "a")!.v).toBe("db"); // DB が勝つ
  });

  it("unionMunicipalities は prefectureSlug/slug 複合キーで重複排除する", () => {
    const db: Municipality[] = [
      { slug: "city", prefectureSlug: "tokyo", name: "DB市" },
    ];
    const seed: Municipality[] = [
      { slug: "city", prefectureSlug: "tokyo", name: "seed市" }, // 同一キー → DB 優先
      { slug: "city", prefectureSlug: "osaka", name: "別府県の同名" }, // 別キー → 残す
    ];
    const merged = unionMunicipalities(db, seed);
    expect(merged).toHaveLength(2);
    expect(
      merged.find((m) => m.prefectureSlug === "tokyo")!.name,
    ).toBe("DB市");
    expect(
      merged.some((m) => m.prefectureSlug === "osaka" && m.slug === "city"),
    ).toBe(true);
  });
});
