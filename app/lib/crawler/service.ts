/**
 * 本物の依存でクローラを実行する配線（server-only）。
 * cron route と admin 手動実行 API の両方から使う。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseCrawlerDb } from "./db";
import { fetchDocument, fetchRobotsTxt } from "./fetcher";
import { createAnthropicExtractor } from "./extract";
import { runCrawler, type CrawlerDeps, type RunOptions, type RunSummary } from "./pipeline";

export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

export function buildCrawlerDeps(sb: SupabaseClient, deadline?: number): CrawlerDeps {
  return {
    db: createSupabaseCrawlerDb(sb),
    fetchDoc: (url, opts) => fetchDocument(url, opts),
    fetchRobots: (origin) => fetchRobotsTxt(origin),
    ai: createAnthropicExtractor(),
    sleep,
    now: () => new Date(),
    deadline,
  };
}

export async function runCrawlerService(
  opts: RunOptions & { deadline?: number },
): Promise<RunSummary> {
  const sb = getServiceSupabase();
  if (!sb) throw new Error("supabase_service_role_not_configured");
  return runCrawler(buildCrawlerDeps(sb, opts.deadline), opts);
}
