import { describe, expect, it } from "vitest";
import {
  evaluateProgramQuality,
  getPublishBlockingIssues,
  isOfficialishSourceUrl,
  sourceFreshness,
  type QualitySubject,
} from "@/app/lib/data/quality";

const base: QualitySubject = {
  slug: "tokyo-setagaya-child-allowance",
  title: "児童手当",
  status: "published",
  officialUrl: "https://www.city.setagaya.lg.jp/example",
  officialSourceTitle: "世田谷区 公式ページ",
  lastOfficialCheckedAt: "2026-06-20",
  sourceConfidence: "high",
  targetPeople: "対象となる可能性がある人",
  applicationMethodText: "窓口・郵送・オンライン",
  categorySlugs: ["childcare"],
  lifeEventSlugs: ["childcare"],
};

describe("content quality gate", () => {
  it("公的URL・確認日・必須情報がそろっていれば問題なし", () => {
    expect(evaluateProgramQuality(base, { todayIso: "2026-06-22" })).toEqual([]);
  });

  it("公式URL不明・非HTTPS・非公式ホストを公開ブロッカーにする", () => {
    const missing = getPublishBlockingIssues(
      { ...base, officialUrl: "" },
      { todayIso: "2026-06-22" },
    );
    const http = getPublishBlockingIssues(
      { ...base, officialUrl: "http://www.city.setagaya.lg.jp/example" },
      { todayIso: "2026-06-22" },
    );
    const privateHost = getPublishBlockingIssues(
      { ...base, officialUrl: "https://example.com/support" },
      { todayIso: "2026-06-22" },
    );
    expect(missing.map((i) => i.code)).toContain("missing_official_url");
    expect(http.map((i) => i.code)).toContain("non_https_official_url");
    expect(privateHost.map((i) => i.code)).toContain("unofficial_source_host");
  });

  it("古い公式確認日はレビュー対象だが、それだけでは公開ブロッカーにしない", () => {
    const issues = evaluateProgramQuality(
      { ...base, lastOfficialCheckedAt: "2026-01-01" },
      { todayIso: "2026-06-22" },
    );
    expect(issues.map((i) => i.code)).toContain("stale_official_check");
    expect(issues.find((i) => i.code === "stale_official_check")?.blocksPublish).toBe(
      false,
    );
  });

  it("低い sourceConfidence は公開ブロッカー兼レビューキュー対象", () => {
    const issues = evaluateProgramQuality(
      { ...base, sourceConfidence: "low" },
      { todayIso: "2026-06-22" },
    );
    const low = issues.find((i) => i.code === "low_source_confidence");
    expect(low?.blocksPublish).toBe(true);
    expect(low?.shouldQueue).toBe(true);
  });

  it("公式っぽい出典ホストを共通判定できる", () => {
    expect(isOfficialishSourceUrl("https://www.city.nagoya.jp/x")).toBe(true);
    expect(isOfficialishSourceUrl("https://www.city.osaka.lg.jp/x")).toBe(true);
    expect(isOfficialishSourceUrl("https://www.with-kobe.or.jp/x")).toBe(true);
    expect(isOfficialishSourceUrl("https://example.com/x")).toBe(false);
  });

  it("鮮度を fresh/watch/stale/future/unknown に分類する", () => {
    expect(sourceFreshness("2026-06-20", "2026-06-22")).toBe("fresh");
    expect(sourceFreshness("2026-04-01", "2026-06-22")).toBe("watch");
    expect(sourceFreshness("2026-01-01", "2026-06-22")).toBe("stale");
    expect(sourceFreshness("2026-06-23", "2026-06-22")).toBe("future");
    expect(sourceFreshness("", "2026-06-22")).toBe("unknown");
  });
});
