import { describe, expect, it } from "vitest";
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_PUBLISHER_ID,
  isGuideAdExcluded,
} from "@/app/lib/ads";
import { GET as getAdsTxt } from "@/app/ads.txt/route";

describe("AdSense configuration", () => {
  it("client ID と publisher ID は同じ AdSense アカウントを指す", () => {
    expect(ADSENSE_CLIENT_ID).toBe("ca-pub-1547495705896839");
    expect(ADSENSE_CLIENT_ID.replace(/^ca-/, "")).toBe(ADSENSE_PUBLISHER_ID);
  });

  it("/ads.txt は Google AdSense の許可行を返す", async () => {
    const response = getAdsTxt();

    expect(response.headers.get("content-type")).toContain("text/plain");
    await expect(response.text()).resolves.toBe(
      "google.com, pub-1547495705896839, DIRECT, f08c47fec0942fa0\n",
    );
  });

  it("機微性が高いガイドは広告対象から除外する", () => {
    expect(isGuideAdExcluded("single-parent-support")).toBe(true);
    expect(isGuideAdExcluded("child-allowance-basics")).toBe(false);
  });
});
