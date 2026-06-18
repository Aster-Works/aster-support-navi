import { describe, it, expect } from "vitest";
import { buildMetadata, websiteJsonLd, breadcrumbJsonLd } from "@/app/lib/seo";

describe("buildMetadata", () => {
  const meta = buildMetadata({
    title: "世田谷区の出産・子育て支援制度一覧",
    description: "説明",
    path: "/tokyo/setagaya",
  });

  it("title は absolute で、ブランドをちょうど1回だけ含む（二重サフィックス防止）", () => {
    // ルートレイアウトの title.template が再適用されないよう absolute で返す。
    expect(typeof meta.title).toBe("object");
    const t = meta.title as { absolute: string };
    expect(t.absolute).toBe("世田谷区の出産・子育て支援制度一覧 | Aster Support Navi");
    const count = t.absolute.split("Aster Support Navi").length - 1;
    expect(count).toBe(1);
  });

  it("canonical はパス相対（metadataBase で絶対化）", () => {
    expect(meta.alternates?.canonical).toBe("/tokyo/setagaya");
  });

  it("noindex 指定で robots.index=false", () => {
    const m = buildMetadata({
      title: "検索",
      description: "x",
      path: "/search",
      noindex: true,
    });
    expect(m.robots).toMatchObject({ index: false, follow: false });
  });
});

describe("JSON-LD", () => {
  it("websiteJsonLd は noindex な /search を指す SearchAction を持たない", () => {
    const ld = websiteJsonLd() as Record<string, unknown>;
    expect(ld.potentialAction).toBeUndefined();
    expect(ld["@type"]).toBe("WebSite");
  });

  it("breadcrumbJsonLd は順序付き ListItem を生成する", () => {
    const ld = breadcrumbJsonLd([
      { name: "ホーム", path: "/" },
      { name: "東京都", path: "/tokyo" },
    ]) as { itemListElement: { position: number }[] };
    expect(ld.itemListElement.map((x) => x.position)).toEqual([1, 2]);
  });
});
