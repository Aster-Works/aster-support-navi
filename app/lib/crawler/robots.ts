/**
 * robots.txt の最小パーサ（純関数・Vitest 対象・依存ゼロ）。
 *
 * 方針: 公式サイトのクロール許可を尊重する。User-agent グループを解釈し、
 * Google 流の「最長一致 Allow/Disallow」で判定する。該当ルールが無ければ許可。
 * 取得できない/壊れている robots は「許可」とはせず、安全側で呼び出し側が扱えるよう
 * パース失敗は空ルール（=全許可）ではなく明示フラグで返す。
 */

export interface RobotsRule {
  type: "allow" | "disallow";
  path: string;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface Robots {
  groups: RobotsGroup[];
  sitemaps: string[];
  /** robots を実際に取得・解釈できたか（false なら呼び出し側が保守的に扱う）。 */
  fetched: boolean;
}

export function emptyRobots(fetched: boolean): Robots {
  return { groups: [], sitemaps: [], fetched };
}

export function parseRobots(text: string): Robots {
  const robots: Robots = { groups: [], sitemaps: [], fetched: true };
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        robots.groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;

    if (field === "sitemap") {
      if (value) robots.sitemaps.push(value);
      continue;
    }
    if (field === "allow" || field === "disallow") {
      if (!current) {
        current = { agents: ["*"], rules: [] };
        robots.groups.push(current);
      }
      current.rules.push({ type: field, path: value });
    }
  }
  return robots;
}

function pickGroup(robots: Robots, userAgent: string): RobotsGroup | null {
  const ua = userAgent.toLowerCase();
  let specific: RobotsGroup | null = null;
  let wildcard: RobotsGroup | null = null;
  for (const g of robots.groups) {
    for (const a of g.agents) {
      if (a === "*") wildcard = g;
      else if (ua.includes(a)) specific = g;
    }
  }
  return specific ?? wildcard;
}

/** robots の path パターン（`*` と末尾 `$` 対応）を URL path に照合。 */
function ruleMatches(rulePath: string, urlPath: string): number {
  if (rulePath === "") return -1; // 空 Disallow は「許可」(=一致しない)
  const anchored = rulePath.endsWith("$");
  const pat = anchored ? rulePath.slice(0, -1) : rulePath;
  const parts = pat.split("*");
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (seg === "") continue;
    const found = urlPath.indexOf(seg, pos);
    if (i === 0 && !urlPath.startsWith(parts[0])) return -1;
    if (found === -1) return -1;
    pos = found + seg.length;
  }
  if (anchored && pos !== urlPath.length) return -1;
  // 一致した特定度 = ルールパスの実効長
  return pat.replace(/\*/g, "").length;
}

/**
 * userAgent が urlPath を取得してよいか。最長一致で Allow/Disallow を決める。
 * robots.fetched=false（取得不能）は「不明」だが、呼び出し側の方針として既定許可にする。
 */
export function isAllowedByRobots(
  robots: Robots,
  userAgent: string,
  urlPath: string,
): boolean {
  const group = pickGroup(robots, userAgent);
  if (!group) return true;
  let bestAllow = -1;
  let bestDisallow = -1;
  for (const r of group.rules) {
    const score = ruleMatches(r.path, urlPath);
    if (score < 0) continue;
    if (r.type === "allow") bestAllow = Math.max(bestAllow, score);
    else bestDisallow = Math.max(bestDisallow, score);
  }
  if (bestDisallow < 0) return true;
  // 同点は Allow を優先（Google 流）。
  return bestAllow >= bestDisallow;
}

export function robotsSitemaps(robots: Robots): string[] {
  return [...new Set(robots.sitemaps)];
}
