import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  isAllowedDomain,
  shouldCrawlUrl,
  matchesAnyPattern,
  isOfficialHost,
  isOfficialUrl,
  dedupeUrls,
  pathOf,
} from "@/app/lib/crawler/url";

describe("normalizeUrl", () => {
  it("resolves relative URLs against base", () => {
    expect(normalizeUrl("/kosodate/a.html", "https://www.city.setagaya.lg.jp/")).toBe(
      "https://www.city.setagaya.lg.jp/kosodate/a.html",
    );
  });
  it("strips fragments and lowercases host", () => {
    expect(normalizeUrl("https://WWW.Example.LG.JP/p#section")).toBe(
      "https://www.example.lg.jp/p",
    );
  });
  it("removes tracking params and sorts query", () => {
    expect(normalizeUrl("https://x.lg.jp/p?b=2&utm_source=g&a=1")).toBe(
      "https://x.lg.jp/p?a=1&b=2",
    );
  });
  it("drops default ports", () => {
    expect(normalizeUrl("https://x.lg.jp:443/p")).toBe("https://x.lg.jp/p");
  });
  it("rejects non-http(s) and invalid", () => {
    expect(normalizeUrl("ftp://x/p")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("mailto:a@b.jp")).toBeNull();
  });
});

describe("isAllowedDomain", () => {
  it("matches exact and subdomains", () => {
    const allow = ["city.yokohama.lg.jp"];
    expect(isAllowedDomain("https://city.yokohama.lg.jp/a", allow)).toBe(true);
    expect(isAllowedDomain("https://www.city.yokohama.lg.jp/a", allow)).toBe(true);
    expect(isAllowedDomain("https://evil.com/a", allow)).toBe(false);
  });
  it("denies when allowlist empty", () => {
    expect(isAllowedDomain("https://x.lg.jp/a", [])).toBe(false);
  });
});

describe("shouldCrawlUrl", () => {
  const f = {
    allowedDomains: ["x.lg.jp"],
    includePatterns: ["/kosodate/", "/fukushi/"],
    excludePatterns: [".pdf", "/event/"],
  };
  it("allows in-domain, include-matching, non-excluded", () => {
    expect(shouldCrawlUrl("https://x.lg.jp/kosodate/a.html", f)).toBe(true);
  });
  it("excludes by pattern even if include matches", () => {
    expect(shouldCrawlUrl("https://x.lg.jp/kosodate/a.pdf", f)).toBe(false);
    expect(shouldCrawlUrl("https://x.lg.jp/event/kosodate", f)).toBe(false);
  });
  it("requires include match when includes present", () => {
    expect(shouldCrawlUrl("https://x.lg.jp/soshiki/a.html", f)).toBe(false);
  });
  it("rejects other domains", () => {
    expect(shouldCrawlUrl("https://other.com/kosodate/a", f)).toBe(false);
  });
});

describe("matchesAnyPattern wildcard", () => {
  it("supports * wildcard", () => {
    expect(matchesAnyPattern("https://x.lg.jp/a/b/c", ["/a/*/c"])).toBe(true);
    expect(matchesAnyPattern("https://x.lg.jp/a/b/d", ["/a/*/c"])).toBe(false);
  });
});

describe("official host allowlist", () => {
  it("accepts gov hosts", () => {
    expect(isOfficialHost("www.city.setagaya.lg.jp")).toBe(true);
    expect(isOfficialHost("www.city.shibuya.tokyo.jp")).toBe(true);
    expect(isOfficialHost("www.mhlw.go.jp")).toBe(true);
    expect(isOfficialUrl("https://www.city.yokohama.lg.jp/a")).toBe(true);
  });
  it("rejects non-official hosts", () => {
    expect(isOfficialHost("example.com")).toBe(false);
    expect(isOfficialHost("zaim.net")).toBe(false);
  });
});

describe("dedupeUrls + pathOf", () => {
  it("dedupes after normalization", () => {
    expect(
      dedupeUrls([
        "https://x.lg.jp/p#a",
        "https://x.lg.jp/p#b",
        "https://x.lg.jp/q",
      ]),
    ).toEqual(["https://x.lg.jp/p", "https://x.lg.jp/q"]);
  });
  it("pathOf returns path + query", () => {
    expect(pathOf("https://x.lg.jp/a/b?c=1")).toBe("/a/b?c=1");
  });
});
