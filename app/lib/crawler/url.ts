/**
 * URL 正規化・ドメイン許可・パターン照合（純関数・Vitest 対象・依存ゼロ）。
 */

/** http/https のみ許可。 */
export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** トラッキング系クエリ（変更検知のノイズ）を落とす。 */
const TRACKING_PARAM_RE = /^(utm_|gclid$|fbclid$|yclid$|mc_|_ga$)/i;

/**
 * URL を正規化する。相対 URL は base から解決。
 * - フラグメント除去、デフォルトポート除去、ホスト小文字化
 * - トラッキングクエリ除去、クエリキーをソート
 * - 末尾スラッシュは保持（ページ実体が変わりうるため触らない）
 * 解決できなければ null。
 */
export function normalizeUrl(raw: string, base?: string): string | null {
  let u: URL;
  try {
    u = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  if (
    (u.protocol === "http:" && u.port === "80") ||
    (u.protocol === "https:" && u.port === "443")
  ) {
    u.port = "";
  }
  const params = [...u.searchParams.entries()].filter(
    ([k]) => !TRACKING_PARAM_RE.test(k),
  );
  params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  u.search = "";
  for (const [k, v] of params) u.searchParams.append(k, v);
  return u.toString();
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return "/";
  }
}

/** host が allowed のいずれか（完全一致 or サブドメイン）か。 */
export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  if (allowedDomains.length === 0) return false;
  return allowedDomains.some((d) => {
    const dom = d.trim().toLowerCase().replace(/^\*\.?/, "");
    if (!dom) return false;
    return host === dom || host.endsWith(`.${dom}`);
  });
}

/** パターン（部分一致・`*` ワイルドカード可）のいずれかに一致するか。 */
export function matchesAnyPattern(url: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  return patterns.some((p) => matchesPattern(url, p));
}

function matchesPattern(url: string, pattern: string): boolean {
  const pat = pattern.trim();
  if (!pat) return false;
  if (pat.includes("*")) {
    const re = new RegExp(
      pat
        .split("*")
        .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*"),
    );
    return re.test(url);
  }
  return url.includes(pat);
}

export interface UrlFilter {
  allowedDomains: string[];
  includePatterns: string[];
  excludePatterns: string[];
}

/**
 * このURLをクロール対象にしてよいか。
 * 1) 許可ドメイン内、2) 除外パターンに当たらない、3) include があれば一致必須。
 */
export function shouldCrawlUrl(url: string, f: UrlFilter): boolean {
  if (!isHttpUrl(url)) return false;
  if (!isAllowedDomain(url, f.allowedDomains)) return false;
  if (matchesAnyPattern(url, f.excludePatterns)) return false;
  if (f.includePatterns.length > 0 && !matchesAnyPattern(url, f.includePatterns)) {
    return false;
  }
  return true;
}

/**
 * 公的機関の公式ホストらしいか（承認時の安全ガード／seedの妥当性確認に使う）。
 * lg.jp / go.jp / 各種 *.tokyo.jp・*.lg.jp、city./town./pref./metro、社協(shakyo/syakyo/cosw)。
 */
const OFFICIAL_HOST_RE =
  /(^|\.)(lg\.jp|go\.jp|metro\.tokyo\.jp|pref\.[a-z]+\.jp)$|(^|\.)(city|town|vill|pref)\.[a-z0-9-]+\.(lg\.jp|tokyo\.jp|jp)$|(shakyo|syakyo|cosw)/i;

export function isOfficialHost(host: string): boolean {
  return OFFICIAL_HOST_RE.test(host.toLowerCase());
}

export function isOfficialUrl(url: string): boolean {
  const host = hostnameOf(url);
  return host ? isOfficialHost(host) : false;
}

/** 重複URLを正規化して一意化する。 */
export function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const n = normalizeUrl(raw);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}
