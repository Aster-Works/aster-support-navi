import { describe, expect, it } from "vitest";
import {
  parseCsv,
  validateImport,
  isRealDate,
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

describe("isRealDate", () => {
  it("実在する日付のみ true", () => {
    expect(isRealDate("2026-06-20")).toBe(true);
    expect(isRealDate("2026-02-30")).toBe(false); // 2月30日は存在しない
    expect(isRealDate("2026-13-01")).toBe(false); // 13月
    expect(isRealDate("2026-6-1")).toBe(false); // 桁不足
    expect(isRealDate("2026/06/20")).toBe(false);
  });
});

describe("parseCsv hardening", () => {
  it("先頭の BOM を除去する", () => {
    const rows = parseCsv("﻿a,b\n1,2");
    expect(rows[0]).toEqual(["a", "b"]); // '﻿a' ではない
  });
});

describe("validateImport", () => {
  it("列数がヘッダと合わない行・実在しない日付を弾く", () => {
    const badCols = row().split(",").slice(0, 10).join(","); // 列不足
    const badDate = row({ last_official_checked_at: "2026-02-30" });
    const res = validateImport(
      parseCsv(`${HEADER}\n${badCols}\n${badDate}`),
      ctx,
    );
    const msgs = res.errors.flatMap((e) => e.messages).join(" ");
    expect(msgs).toMatch(/列数が不正/);
    expect(msgs).toMatch(/実在する YYYY-MM-DD/);
  });

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

  it("既存 slug は isUpdate、公開中なら overwritesPublished を立てる", () => {
    const ctx2: ImportContext = {
      ...ctx,
      existingSlugs: new Set(["tokyo-setagaya-child-allowance"]),
      publishedSlugs: new Set(["tokyo-setagaya-child-allowance"]),
    };
    const newRow = row({ slug: "tokyo-setagaya-new-one" });
    const res = validateImport(parseCsv(`${HEADER}\n${row()}\n${newRow}`), ctx2);
    const existing = res.valid.find(
      (v) => v.slug === "tokyo-setagaya-child-allowance",
    )!;
    const fresh = res.valid.find((v) => v.slug === "tokyo-setagaya-new-one")!;
    expect(existing.isUpdate).toBe(true);
    expect(existing.overwritesPublished).toBe(true);
    expect(fresh.isUpdate).toBe(false);
    expect(fresh.overwritesPublished).toBe(false);
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
