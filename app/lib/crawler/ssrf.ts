/**
 * SSRF 対策（既存 /api/cron/check-sources のロジックを共通化）。
 * - http/https 以外を拒否
 * - localhost / *.local を拒否
 * - private / loopback / link-local IP を拒否（リテラル + DNS 解決の両方）
 * リダイレクト先も毎ホップこの関数で再検証する。
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function isPrivateIpAddress(address: string): boolean {
  const normalized = address.startsWith("::ffff:")
    ? address.slice("::ffff:".length)
    : address;
  if (isIP(normalized) === 4) {
    const parts = normalized.split(".").map((p) => Number.parseInt(p, 10));
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 100 || // 100.64/10 CGNAT を保守的に拒否
      a >= 224 // multicast / reserved
    );
  }
  const lower = normalized.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

/** 公開ホストの http/https URL であることを保証し、URL を返す。 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("invalid_url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("non_http_url");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata" ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("blocked_local_host");
  }
  if (isIP(hostname) && isPrivateIpAddress(hostname)) {
    throw new Error("blocked_private_ip");
  }
  const results = await lookup(hostname, { all: true });
  if (results.length === 0 || results.some((r) => isPrivateIpAddress(r.address))) {
    throw new Error("blocked_private_dns");
  }
  return url;
}
