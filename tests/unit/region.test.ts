import { describe, it, expect } from "vitest";
import { buildAreaGroups, buildRegionGroups } from "@/app/lib/region";
import type { Municipality, Prefecture } from "@/app/lib/data/types";

const prefectures: Prefecture[] = [
  { slug: "tokyo", name: "東京都", region: "関東" },
  { slug: "kanagawa", name: "神奈川県", region: "関東" },
  { slug: "osaka", name: "大阪府", region: "近畿" },
];

const muni = (
  pref: string,
  slug: string,
  name: string,
  kana: string,
): Municipality => ({ slug, prefectureSlug: pref, name, nameKana: kana });

const active: Municipality[] = [
  muni("osaka", "sakai", "堺市", "さかいし"),
  muni("kanagawa", "yokohama", "横浜市", "よこはまし"),
  muni("tokyo", "setagaya", "世田谷区", "せたがやく"),
  muni("kanagawa", "kawasaki", "川崎市", "かわさきし"),
  muni("osaka", "osaka", "大阪市", "おおさかし"),
];

describe("buildRegionGroups", () => {
  it("東京都を先頭に置き、全都道府県を含む", () => {
    const g = buildRegionGroups(active, prefectures);
    expect(g[0].slug).toBe("tokyo");
    expect(new Set(g.map((x) => x.slug))).toEqual(
      new Set(["tokyo", "kanagawa", "osaka"]),
    );
  });

  it("各都道府県内の自治体はかな順", () => {
    const g = buildRegionGroups(active, prefectures);
    const kanagawa = g.find((x) => x.slug === "kanagawa")!;
    // かわさき < よこはま
    expect(kanagawa.munis.map((m) => m.slug)).toEqual(["kawasaki", "yokohama"]);
  });

  it("exclude で指定都道府県を除外する", () => {
    const g = buildRegionGroups(active, prefectures, { exclude: "tokyo" });
    expect(g.map((x) => x.slug)).not.toContain("tokyo");
    expect(new Set(g.map((x) => x.slug))).toEqual(
      new Set(["kanagawa", "osaka"]),
    );
  });
});

describe("buildAreaGroups", () => {
  it("地方ごとに都道府県をまとめ、標準的な地域順で返す", () => {
    const g = buildAreaGroups(active, prefectures);

    expect(g.map((x) => x.name)).toEqual(["関東", "近畿"]);
    expect(g[0].prefectures.map((p) => p.slug)).toEqual([
      "tokyo",
      "kanagawa",
    ]);
    expect(g[0].municipalityCount).toBe(3);
  });
});
