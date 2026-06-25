import { describe, it, expect } from "vitest";
import { parseHtml, parseSitemapLocs } from "@/app/lib/crawler/normalize";

const HTML = `<!doctype html><html><head><title>紙おむつ支給 | テスト区</title></head>
<body>
  <header id="header"><a href="/">トップ</a></header>
  <nav class="gnav"><a href="/fukushi/">福祉</a></nav>
  <main>
    <h1>高齢者紙おむつ支給</h1>
    <p>本制度は、要介護認定を受けた在宅の高齢者に対し、紙おむつを現物支給するものです。
    対象や申請方法はお住まいの地区の窓口で確認できます。詳しくは下記の問い合わせ先までご連絡ください。
    支給は月に一定数量を上限とし、申請には介護保険被保険者証が必要です。</p>
    <a href="https://www.city.test.lg.jp/fukushi/omutsu.html">詳細ページ</a>
  </main>
  <footer class="footer">フッターの著作権表示やプライバシーポリシーはここ</footer>
  <script>console.log("noise")</script>
</body></html>`;

describe("parseHtml", () => {
  const parsed = parseHtml(HTML, "https://www.city.test.lg.jp/fukushi/");
  it("extracts the title", () => {
    expect(parsed.title).toBe("紙おむつ支給 | テスト区");
  });
  it("keeps main body text", () => {
    expect(parsed.text).toContain("要介護認定");
    expect(parsed.text).toContain("紙おむつ");
  });
  it("strips footer/script/nav chrome from text", () => {
    expect(parsed.text).not.toContain("フッターの著作権");
    expect(parsed.text).not.toContain("console.log");
  });
  it("collects absolute links (including resolved relative ones)", () => {
    expect(parsed.links).toContain("https://www.city.test.lg.jp/fukushi/omutsu.html");
    expect(parsed.links).toContain("https://www.city.test.lg.jp/fukushi/");
  });
});

describe("parseSitemapLocs", () => {
  it("extracts <loc> URLs", () => {
    const xml = `<urlset><url><loc>https://x.lg.jp/a</loc></url><url><loc>https://x.lg.jp/b </loc></url></urlset>`;
    expect(parseSitemapLocs(xml)).toEqual(["https://x.lg.jp/a", "https://x.lg.jp/b"]);
  });
});
