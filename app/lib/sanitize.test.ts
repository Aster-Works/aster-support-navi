import { expect, test, describe } from "vitest";
import { escapeLike, isAllowedRevalidatePath } from "./sanitize";

describe("sanitize", () => {
  describe("escapeLike", () => {
    test("escapes %, _, and \\", () => {
      expect(escapeLike("100%")).toBe("100\\%");
      expect(escapeLike("foo_bar")).toBe("foo\\_bar");
      expect(escapeLike("C:\\test")).toBe("C:\\\\test");
      expect(escapeLike("100%_\\")).toBe("100\\%\\_\\\\");
    });

    test("leaves normal strings alone", () => {
      expect(escapeLike("hello")).toBe("hello");
      expect(escapeLike("日本語")).toBe("日本語");
    });
  });

  describe("isAllowedRevalidatePath", () => {
    test("allows valid paths", () => {
      expect(isAllowedRevalidatePath("/")).toBe(true);
      expect(isAllowedRevalidatePath("/admin/programs/123")).toBe(true);
      expect(isAllowedRevalidatePath("/tokyo/shinjuku-ku")).toBe(true);
    });

    test("rejects invalid paths", () => {
      expect(isAllowedRevalidatePath("admin/programs")).toBe(false); // does not start with /
      expect(isAllowedRevalidatePath("/admin/../etc/passwd")).toBe(false); // path traversal
      expect(isAllowedRevalidatePath("/日本語")).toBe(false); // invalid characters
    });

    test("rejects overly long paths", () => {
      const longPath = "/" + "a".repeat(201);
      expect(isAllowedRevalidatePath(longPath)).toBe(false);
    });
  });
});
