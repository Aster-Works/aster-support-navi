/**
 * 発見クローラの日次実行（Vercel Cron から起動）。
 *
 * 安全策:
 * - CRON_SECRET を検証。未設定/不一致は実行しない。
 * - crawler_settings.crawler_enabled=false なら即終了（run は skipped で記録）。
 * - service_role はこの server-only route 内だけで使う。
 * - 1回の実行は wall-clock の締切（deadline）で打ち切り、翌日に未巡回sourceから再開する
 *   （sources は last_checked_at の古い順に処理されるためローテーションする）。
 * - source 単位でエラーを隔離。1つ失敗しても他は続行。連続エラーで自動停止。
 */
import { runCrawlerService } from "@/app/lib/crawler/service";
import { createRateLimiter } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel Pro の上限まで引き上げ、1日1回で多くのページを処理できるようにする。
export const maxDuration = 300;

const rateLimiter = createRateLimiter({ interval: 300_000, maxTokens: 1 });

export async function GET(req: Request): Promise<Response> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ skipped: "crawler not configured" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!rateLimiter.check("cron-crawl-support-sources")) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  // maxDuration 300s に対し、DB書き込み・finishRun の余裕を残した締切（285s）。
  const deadline = Date.now() + 285_000;

  try {
    const summary = await runCrawlerService({ trigger: "cron", force, deadline });
    return Response.json(summary);
  } catch (err) {
    console.error("Discovery Crawler Error:", (err as Error).message);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
