/**
 * HTML → 正規化本文 + 見出し + リンク抽出（cheerio）。
 *
 * 変更検知のため、ナビ・フッター・スクリプト・Cookie 文言など本文以外を可能な範囲で除去し、
 * 安定した normalized_text を作る。AI 抽出にはこの本文だけを渡してトークンを節約する。
 */
import * as cheerio from "cheerio";
import { normalizeUrl } from "./url";

export interface ParsedHtml {
  title: string | null;
  /** 正規化本文（空白圧縮済み）。 */
  text: string;
  /** ページ内の絶対URLリンク（正規化・一意化済み）。 */
  links: string[];
}

/** 本文以外として落とす要素。 */
const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "button",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[aria-hidden='true']",
  ".global-nav",
  ".gnav",
  ".breadcrumb",
  ".pankuzu",
  ".sidebar",
  ".side",
  ".footer",
  ".header",
  ".cookie",
  ".cookie-banner",
  "#header",
  "#footer",
  "#nav",
  "#sidebar",
  "#globalNav",
  "#breadcrumb",
].join(",");

/** 本文を優先的に拾うコンテナ。 */
const MAIN_SELECTORS = [
  "main",
  "article",
  "[role='main']",
  "#main",
  "#contents",
  "#content",
  ".main",
  ".contents",
  ".content",
];

export function parseHtml(html: string, pageUrl: string): ParsedHtml {
  const $ = cheerio.load(html);

  const title =
    cleanText($("title").first().text()) ||
    cleanText($("h1").first().text()) ||
    null;

  // リンクは除去前に集める（ナビ内の本文リンクも発見に使えるため）。
  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    if (/^(javascript:|mailto:|tel:|#)/i.test(href.trim())) return;
    const abs = normalizeUrl(href, pageUrl);
    if (abs) links.add(abs);
  });

  $(STRIP_SELECTORS).remove();

  let text = cleanText($("body").text());
  for (const sel of MAIN_SELECTORS) {
    const el = $(sel).first();
    if (el.length) {
      const t = cleanText(el.text());
      if (t.length > 200) {
        text = t;
        break;
      }
    }
  }

  return { title, text, links: [...links] };
}

function cleanText(s: string): string {
  return s
    .replace(/ /g, " ")
    .replace(/[\t\r]+/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ *\n */g, "\n")
    .trim();
}

/** sitemap.xml から <loc> を抜く（依存を増やさない簡易抽出）。 */
export function parseSitemapLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const u = normalizeUrl(m[1]);
    if (u) out.push(u);
  }
  return [...new Set(out)];
}
