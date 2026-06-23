import { describe, expect, it } from "vitest";
import { isHttpUrl, hasBranding } from "@/app/components/PrepPacket";

describe("isHttpUrl（ロゴURLの安全側ガード）", () => {
  it("http/https のみ許可", () => {
    expect(isHttpUrl("https://example.org/logo.png")).toBe(true);
    expect(isHttpUrl("http://example.org/logo.png")).toBe(true);
    expect(isHttpUrl("  https://example.org/logo.png  ")).toBe(true);
  });

  it("javascript: / data: / 相対 / 空は不可", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isHttpUrl("/logo.png")).toBe(false);
    expect(isHttpUrl("example.org/logo.png")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });
});

describe("hasBranding（差込の有無）", () => {
  it("団体名・担当者名・有効ロゴのいずれかがあれば true", () => {
    expect(hasBranding({ orgName: "◯◯子ども食堂" })).toBe(true);
    expect(hasBranding({ preparedBy: "山田 太郎" })).toBe(true);
    expect(hasBranding({ logoUrl: "https://example.org/logo.png" })).toBe(true);
  });

  it("空・空白のみ・無効ロゴだけなら false", () => {
    expect(hasBranding(undefined)).toBe(false);
    expect(hasBranding({})).toBe(false);
    expect(hasBranding({ orgName: "  ", preparedBy: "  " })).toBe(false);
    // 無効なロゴURLのみは差込なし扱い（画像も描画しない）。
    expect(hasBranding({ logoUrl: "javascript:alert(1)" })).toBe(false);
  });
});
