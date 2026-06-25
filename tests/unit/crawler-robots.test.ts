import { describe, it, expect } from "vitest";
import {
  parseRobots,
  isAllowedByRobots,
  robotsSitemaps,
  emptyRobots,
} from "@/app/lib/crawler/robots";

const SAMPLE = `
# comment
User-agent: *
Disallow: /private/
Allow: /private/public/
Disallow: /tmp

User-agent: BadBot
Disallow: /

Sitemap: https://x.lg.jp/sitemap.xml
Sitemap: https://x.lg.jp/sitemap2.xml
`;

describe("parseRobots", () => {
  it("parses groups and sitemaps", () => {
    const r = parseRobots(SAMPLE);
    expect(r.fetched).toBe(true);
    expect(r.groups.length).toBe(2);
    expect(robotsSitemaps(r)).toEqual([
      "https://x.lg.jp/sitemap.xml",
      "https://x.lg.jp/sitemap2.xml",
    ]);
  });
});

describe("isAllowedByRobots", () => {
  const r = parseRobots(SAMPLE);
  const UA = "AsterSupportNaviCrawler/1.0";
  it("disallows under /private/", () => {
    expect(isAllowedByRobots(r, UA, "/private/secret.html")).toBe(false);
  });
  it("allow wins by longest match for /private/public/", () => {
    expect(isAllowedByRobots(r, UA, "/private/public/a.html")).toBe(true);
  });
  it("allows unlisted paths", () => {
    expect(isAllowedByRobots(r, UA, "/kosodate/a.html")).toBe(true);
  });
  it("honors a more specific agent group (BadBot blocked everywhere)", () => {
    expect(isAllowedByRobots(r, "BadBot/2.0", "/anything")).toBe(false);
  });
});

describe("robots edge cases", () => {
  it("empty Disallow means allow-all in that group", () => {
    const r = parseRobots("User-agent: *\nDisallow:");
    expect(isAllowedByRobots(r, "x", "/whatever")).toBe(true);
  });
  it("$ anchor matches only exact end", () => {
    const r = parseRobots("User-agent: *\nDisallow: /a.html$");
    expect(isAllowedByRobots(r, "x", "/a.html")).toBe(false);
    expect(isAllowedByRobots(r, "x", "/a.htmlx")).toBe(true);
  });
  it("no groups => allowed", () => {
    expect(isAllowedByRobots(emptyRobots(false), "x", "/a")).toBe(true);
  });
});
