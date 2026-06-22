import { afterEach, describe, expect, it } from "vitest";
import { track, safeHost } from "@/app/lib/track";

type GtagCall = unknown[];

afterEach(() => {
  delete (window as unknown as { gtag?: unknown }).gtag;
  delete (window as unknown as { __asterGaDestinationId?: unknown })
    .__asterGaDestinationId;
});

describe("track（YMYL 安全）", () => {
  it("gtag 不在なら何もしない（throw しない）", () => {
    expect(() => track("diagnosis_started", { count: 1 })).not.toThrow();
  });

  it("Google Ads タグだけの状態ではカスタムイベントを送らない", () => {
    const calls: GtagCall[] = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) =>
      calls.push(a);

    track("diagnosis_started", { count: 1 });

    expect(calls).toHaveLength(0);
  });

  it("許可キーのみ送信し、機微キー・自由記述は捨てる", () => {
    const calls: GtagCall[] = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) =>
      calls.push(a);
    (window as unknown as { __asterGaDestinationId: string })
      .__asterGaDestinationId = "G-TEST";
    track("diagnosis_completed", {
      count: 5,
      context: "diagnosis",
      // 以下は許可外＝送信されてはならない（機微情報・自由記述）。
      income: "low",
      note: "相談内容の自由記述",
      address: "東京都...",
      query: "世田谷区 ひとり親",
    } as Record<string, string | number>);
    expect(calls).toHaveLength(1);
    const [type, name, params] = calls[0] as [string, string, object];
    expect(type).toBe("event");
    expect(name).toBe("diagnosis_completed");
    expect(params).toEqual({
      send_to: "G-TEST",
      count: 5,
      context: "diagnosis",
    });
  });

  it("string は40字に切り詰める", () => {
    const calls: GtagCall[] = [];
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag = (...a) =>
      calls.push(a);
    (window as unknown as { __asterGaDestinationId: string })
      .__asterGaDestinationId = "G-TEST";
    track("checklist_viewed", { context: "x".repeat(100) });
    const params = (calls[0] as [
      string,
      string,
      { context: string; send_to: string },
    ])[2];
    expect(params.context.length).toBe(40);
    expect(params.send_to).toBe("G-TEST");
  });
});

describe("safeHost", () => {
  it("URL から host のみ取り出す（パス・クエリは捨てる）", () => {
    expect(safeHost("https://www.city.setagaya.lg.jp/02413/18187.html")).toBe(
      "www.city.setagaya.lg.jp",
    );
    expect(safeHost("not a url")).toBeUndefined();
    expect(safeHost(undefined)).toBeUndefined();
  });
});
