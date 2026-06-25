/** 本文ハッシュ（変更検知用）。Node の crypto を使う。 */
import { createHash } from "node:crypto";

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
