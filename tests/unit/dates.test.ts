import { describe, it, expect } from "vitest";
import {
  formatJaDate,
  formatCheckedAt,
  daysUntil,
  deadlineStatus,
  isValidIsoDate,
} from "@/app/lib/dates";

describe("formatJaDate", () => {
  it("YYYY-MM-DD を和暦表記なしの日本語へ", () => {
    expect(formatJaDate("2026-06-01")).toBe("2026年6月1日");
    expect(formatJaDate("2026-12-31")).toBe("2026年12月31日");
  });
  it("不正値は空文字", () => {
    expect(formatJaDate("")).toBe("");
    expect(formatJaDate(undefined)).toBe("");
    expect(formatJaDate("2026/06/01")).toBe("");
  });
});

describe("formatCheckedAt", () => {
  it("時点表記になる", () => {
    expect(formatCheckedAt("2026-06-17")).toBe("2026年6月17日時点");
    expect(formatCheckedAt(undefined)).toBe("確認日未設定");
  });
});

describe("daysUntil", () => {
  it("残日数を計算する", () => {
    expect(daysUntil("2026-06-20", "2026-06-17")).toBe(3);
    expect(daysUntil("2026-06-17", "2026-06-17")).toBe(0);
    expect(daysUntil("2026-06-10", "2026-06-17")).toBe(-7);
  });
  it("不正値は null", () => {
    expect(daysUntil(undefined, "2026-06-17")).toBeNull();
  });
});

describe("deadlineStatus", () => {
  it("期限の状態を判定する", () => {
    expect(deadlineStatus(undefined, "2026-06-17")).toBe("none");
    expect(deadlineStatus("2026-06-10", "2026-06-17")).toBe("closed");
    expect(deadlineStatus("2026-06-25", "2026-06-17")).toBe("soon");
    expect(deadlineStatus("2026-12-31", "2026-06-17")).toBe("open");
  });
  it("soonThreshold を尊重する", () => {
    expect(deadlineStatus("2026-07-30", "2026-06-17", 7)).toBe("open");
    expect(deadlineStatus("2026-06-20", "2026-06-17", 7)).toBe("soon");
  });
});

describe("isValidIsoDate", () => {
  it("妥当な日付のみ true", () => {
    expect(isValidIsoDate("2026-06-17")).toBe(true);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-06-40")).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });
  it("存在しない日付を弾く（round-trip）", () => {
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("2026-04-31")).toBe(false);
    expect(isValidIsoDate("2026-02-28")).toBe(true);
  });
});
