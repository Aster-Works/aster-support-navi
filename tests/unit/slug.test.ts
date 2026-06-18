import { describe, it, expect } from "vitest";
import { slugify, isValidSlug, buildSupportSlug } from "@/app/lib/slug";

describe("slugify", () => {
  it("英数とハイフンに正規化する", () => {
    expect(slugify("Child Allowance")).toBe("child-allowance");
    expect(slugify("  Hello__World!! ")).toBe("hello-world");
    expect(slugify("a/b/c")).toBe("a-b-c");
  });
  it("先頭末尾のハイフンを除く", () => {
    expect(slugify("--abc--")).toBe("abc");
  });
});

describe("isValidSlug", () => {
  it("妥当な slug を受け入れる", () => {
    expect(isValidSlug("tokyo-setagaya-child-allowance")).toBe(true);
    expect(isValidSlug("birth")).toBe(true);
  });
  it("不正な slug を弾く", () => {
    expect(isValidSlug("-abc")).toBe(false);
    expect(isValidSlug("abc-")).toBe(false);
    expect(isValidSlug("ABC")).toBe(false);
    expect(isValidSlug("a b")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("buildSupportSlug", () => {
  it("自治体と制度キーから組み立てる", () => {
    expect(buildSupportSlug("tokyo", "setagaya", "child allowance")).toBe(
      "tokyo-setagaya-child-allowance",
    );
  });
});
