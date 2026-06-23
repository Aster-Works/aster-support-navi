import { afterEach, describe, expect, it } from "vitest";
import { safeHost, trackEvent } from "@/src/lib/analytics";

type GtagCall = unknown[];

afterEach(() => {
  delete (window as unknown as { gtag?: unknown }).gtag;
  delete (window as unknown as { __asterGaDestinationId?: unknown })
    .__asterGaDestinationId;
});

describe("track（YMYL 安全）", () => {
  it("gtag 不在なら何もしない（throw しない）", () => {
    expect(() =>
      trackEvent("diagnosis_start", { source: "header", page_path: "/check" }),
    ).not.toThrow();
  });

  it("Google Ads タグだけの状態ではカスタムイベントを送らない", () => {
    const calls: GtagCall[] = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) =>
      calls.push(a);

    trackEvent("diagnosis_start", { source: "header", page_path: "/" });

    expect(calls).toHaveLength(0);
  });

  it("許可キーのみ送信し、機微キー・自由記述は捨てる", () => {
    const calls: GtagCall[] = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) =>
      calls.push(a);
    (window as unknown as { __asterGaDestinationId: string })
      .__asterGaDestinationId = "G-TEST";
    trackEvent("diagnosis_complete", {
      result_count: 5,
      prefecture: "tokyo",
      city: "setagaya",
      category_count: 2,
      // 以下は許可外＝送信されてはならない（機微情報・自由記述）。
      income: "low",
      note: "相談内容の自由記述",
      address: "東京都...",
      phone: "03-0000-0000",
      email: "test@example.com",
      query: "世田谷区 ひとり親",
    } as Record<string, string | number>);
    expect(calls).toHaveLength(1);
    const [type, name, params] = calls[0] as [string, string, object];
    expect(type).toBe("event");
    expect(name).toBe("diagnosis_complete");
    expect(params).toEqual({
      send_to: "G-TEST",
      transport_type: "beacon",
      result_count: 5,
      prefecture: "tokyo",
      city: "setagaya",
      category_count: 2,
    });
  });

  it("string は80字に切り詰める", () => {
    const calls: GtagCall[] = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) =>
      calls.push(a);
    (window as unknown as { __asterGaDestinationId: string })
      .__asterGaDestinationId = "G-TEST";
    trackEvent("pro_interest_click", { source: "x".repeat(100) });
    const params = (calls[0] as [
      string,
      string,
      { source: string; send_to: string },
    ])[2];
    expect(params.source.length).toBe(80);
    expect(params.send_to).toBe("G-TEST");
  });

  it("official_link_click は制度情報と外部ドメインだけを送れる", () => {
    const calls: GtagCall[] = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) =>
      calls.push(a);
    (window as unknown as { __asterGaDestinationId: string })
      .__asterGaDestinationId = "G-TEST";

    trackEvent("official_link_click", {
      support_id: "tokyo-setagaya-child-allowance",
      support_title: "児童手当",
      category: "子育て",
      municipality: "世田谷区",
      outbound_url_domain: safeHost(
        "https://www.city.setagaya.lg.jp/02413/18187.html?secret=x",
      ),
    });

    expect(calls[0]).toEqual([
      "event",
      "official_link_click",
      {
        send_to: "G-TEST",
        transport_type: "beacon",
        support_id: "tokyo-setagaya-child-allowance",
        support_title: "児童手当",
        category: "子育て",
        municipality: "世田谷区",
        outbound_url_domain: "www.city.setagaya.lg.jp",
      },
    ]);
  });
});

describe("safeHost", () => {
  it("URL から domain のみ取り出す（パス・クエリは捨てる）", () => {
    expect(safeHost("https://www.city.setagaya.lg.jp/02413/18187.html")).toBe(
      "www.city.setagaya.lg.jp",
    );
    expect(safeHost("not a url")).toBeUndefined();
    expect(safeHost(undefined)).toBeUndefined();
  });
});
