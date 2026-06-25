/**
 * 低負荷・安全なドキュメント取得。
 * - 透明な User-Agent（Aster Support Navi のクローラだと分かる）
 * - ETag / Last-Modified による条件付き GET（変わっていなければ 304 で本文を取らない）
 * - リダイレクトは手動・毎ホップ SSRF 再検証
 * - サイズ上限・タイムアウト
 * - 403/401/429/CAPTCHA 等の bot 対策は回避しない（そのまま失敗として扱う）
 */
import { assertPublicUrl } from "./ssrf";

export const CRAWLER_USER_AGENT =
  "AsterSupportNaviCrawler/1.0 (+https://astersupport.com/about)";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 15_000;

export interface FetchOptions {
  etag?: string | null;
  lastModified?: string | null;
  maxBytes?: number;
  timeoutMs?: number;
}

export interface FetchResult {
  ok: boolean;
  notModified: boolean;
  status: number | null;
  finalUrl: string;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  body: string | null;
  truncated: boolean;
  error: string | null;
}

function fail(url: string, status: number | null, error: string): FetchResult {
  return {
    ok: false,
    notModified: false,
    status,
    finalUrl: url,
    contentType: null,
    etag: null,
    lastModified: null,
    body: null,
    truncated: false,
    error,
  };
}

export async function fetchDocument(
  rawUrl: string,
  opts: FetchOptions = {},
): Promise<FetchResult> {
  const maxBytes = opts.maxBytes ?? MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;

  let current: URL;
  try {
    current = await assertPublicUrl(rawUrl);
  } catch (e) {
    return fail(rawUrl, null, (e as Error).message || "blocked");
  }

  const headers: Record<string, string> = {
    "User-Agent": CRAWLER_USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.5",
    "Accept-Language": "ja",
  };
  if (opts.etag) headers["If-None-Match"] = opts.etag;
  if (opts.lastModified) headers["If-Modified-Since"] = opts.lastModified;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers,
      });
    } catch (e) {
      const msg = (e as Error).name === "TimeoutError" ? "timeout" : "fetch_failed";
      return fail(current.toString(), null, msg);
    }

    if (res.status === 304) {
      return {
        ok: true,
        notModified: true,
        status: 304,
        finalUrl: current.toString(),
        contentType: res.headers.get("content-type"),
        etag: res.headers.get("etag") ?? opts.etag ?? null,
        lastModified: res.headers.get("last-modified") ?? opts.lastModified ?? null,
        body: null,
        truncated: false,
        error: null,
      };
    }

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      try {
        current = await assertPublicUrl(new URL(location, current).toString());
      } catch (e) {
        return fail(current.toString(), res.status, (e as Error).message);
      }
      continue;
    }

    if (!res.ok) {
      return fail(current.toString(), res.status, `http_${res.status}`);
    }

    const contentType = res.headers.get("content-type");
    const read = await readCappedText(res, maxBytes);
    return {
      ok: true,
      notModified: false,
      status: res.status,
      finalUrl: current.toString(),
      contentType,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
      body: read.text,
      truncated: read.truncated,
      error: null,
    };
  }
  return fail(current.toString(), null, "too_many_redirects");
}

async function readCappedText(
  res: Response,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer());
    const slice = buf.subarray(0, maxBytes);
    return { text: slice.toString("utf8"), truncated: buf.byteLength > maxBytes };
  }
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const remaining = maxBytes - bytes;
    if (value.byteLength > remaining) {
      chunks.push(value.subarray(0, remaining));
      bytes += remaining;
      truncated = true;
      break;
    }
    chunks.push(value);
    bytes += value.byteLength;
  }
  try {
    await reader.cancel();
  } catch {
    // 既に閉じている可能性がある。
  }
  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}

/** robots.txt を取得（失敗時は null）。 */
export async function fetchRobotsTxt(origin: string): Promise<string | null> {
  const res = await fetchDocument(`${origin.replace(/\/$/, "")}/robots.txt`, {
    maxBytes: 256_000,
    timeoutMs: 8_000,
  });
  return res.ok && !res.notModified ? res.body : null;
}
