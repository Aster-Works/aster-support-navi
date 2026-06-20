import { describe, expect, it } from "vitest";
import {
  parseCsv,
  validateImport,
  type ImportContext,
} from "@/app/lib/admin/csv";

const ctx: ImportContext = {
  categorySlugs: new Set(["childcare", "birth"]),
  lifeEventSlugs: new Set(["childcare", "birth"]),
  municipalityKeys: new Set(["tokyo/setagaya"]),
};

const HEADER =
  "prefecture_slug,municipality_slug,title,slug,summary,category_slugs,life_event_slugs,benefit_type,target_people,application_method_text,official_url,last_official_checked_at,source_confidence,status";

function row(over: Partial<Record<string, string>> = {}): string {
  const base: Record<string, string> = {
    prefecture_slug: "tokyo",
    municipality_slug: "setagaya",
    title: "児童手当",
    slug: "tokyo-setagaya-child-allowance",
    summary: "概要",
    category_slugs: "childcare|birth",
    life_event_slugs: "childcare",
    benefit_type: "cash",
    target_people: "対象者",
    application_method_text: "窓口",
    official_url: "https://www.city.setagaya.lg.jp/x",
    last_official_checked_at: "2026-06-20",
    source_confidence: "high",
    status: "published",
    ...over,
  };
  const cols = HEADER.split(",");
  return cols.map((c) => base[c] ?? "").join(",");
}

describe("parseCsv", () => {
  it("引用フィールド内のカンマと改行、\"\" エスケープを扱う", () => {
    const csv = 'a,b,c\n"x,1","y\n2","he said ""hi"""';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["x,1", "y\n2", 'he said "hi"'],
    ]);
  });

  it("末尾改行・空行を無視する", () => {
    expect(parseCsv("a,b\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("validateImport", () => {
  it("必須列が欠けるとヘッダエラー", () => {
    const res = validateImport(parseCsv("slug,title\nx,y"), ctx);
    expect(res.headerError).toMatch(/必須列が不足/);
    expect(res.valid).toHaveLength(0);
  });

  it("正しい行は valid に入る", () => {
    const res = validateImport(parseCsv(`${HEADER}\n${row()}`), ctx);
    expect(res.errors).toHaveLength(0);
    expect(res.valid).toHaveLength(1);
    expect(res.valid[0].categorySlugs).toEqual(["childcare", "birth"]);
    expect(res.valid[0].slug).toBe("tokyo-setagaya-child-allowance");
  });

  it("不正な値を行エラーにする（status/日付/未定義カテゴリ/自治体/重複slug）", () => {
    const bad1 = row({
      status: "live",
      last_official_checked_at: "2026/06/20",
      category_slugs: "unknown",
      municipality_slug: "nowhere",
    });
    const dup = row();
    const dup2 = row(); // same slug → 重複
    const res = validateImport(
      parseCsv(`${HEADER}\n${bad1}\n${dup}\n${dup2}`),
      ctx,
    );
    const msgs = res.errors.flatMap((e) => e.messages).join(" ");
    expect(msgs).toMatch(/status が不正/);
    expect(msgs).toMatch(/YYYY-MM-DD/);
    expect(msgs).toMatch(/未定義のカテゴリ/);
    expect(msgs).toMatch(/自治体マスタに存在しません/);
    expect(msgs).toMatch(/slug が重複/);
  });

  it("published はカテゴリ・生活イベントが必須（draft は不要）", () => {
    const pubNoTags = row({ category_slugs: "", life_event_slugs: "" });
    const draftNoTags = row({
      slug: "tokyo-setagaya-draft",
      category_slugs: "",
      life_event_slugs: "",
      status: "draft",
    });
    const res = validateImport(
      parseCsv(`${HEADER}\n${pubNoTags}\n${draftNoTags}`),
      ctx,
    );
    expect(res.valid.map((v) => v.slug)).toEqual(["tokyo-setagaya-draft"]);
    expect(res.errors[0].messages.join(" ")).toMatch(
      /published にはカテゴリが必要/,
    );
  });
});
