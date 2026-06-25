/**
 * 発見クローラの手動実行（管理者のみ）。
 *
 * 認可: ブラウザ管理者セッションの access_token を Bearer で受け取り、その JWT で
 * app_roles を self-read（RLS）して admin か検証する（/api/admin/revalidate と同方式）。
 * 検証後、service_role でクローラを起動する。force=true（settings.crawler_enabled に
 * 関わらず手動では走る）。1自治体だけを対象にもできる（body.sourceId）。
 */
import { createClient } from "@supabase/supabase-js";
import { runCrawlerService } from "@/app/lib/crawler/service";
import { createRateLimiter } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// 余裕を持たせて 504 を防ぐ。手動「全体」は下の deadline でブラウザ待ちを ~2分に抑える。
export const maxDuration = 300;

const rateLimiter = createRateLimiter({ interval: 60_000, maxTokens: 3 });

export async function POST(req: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: "crawler not configured" }, { status: 503 });
  }

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "missing token" }, { status: 401 });

  if (!rateLimiter.check(token)) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }

  // ユーザーの JWT で本人の admin ロールを RLS 経由で確認。
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: userData }, { data: roles, error: roleErr }] = await Promise.all([
    sb.auth.getUser(),
    sb.from("app_roles").select("role").eq("role", "admin").limit(1),
  ]);
  if (roleErr || !roles || roles.length === 0) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const userId = userData.user?.id ?? null;

  let body: { sourceId?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // body 無しの全体手動実行を許可。
  }
  const sourceId =
    typeof body.sourceId === "string" && body.sourceId.length > 0
      ? body.sourceId
      : undefined;

  // 手動実行はブラウザが待つので ~2分で打ち切って返す（残りは翌日の cron が巡回）。
  // maxDuration(300s) に対し十分なマージンがあり 504 にならない。
  const deadline = Date.now() + 110_000;
  try {
    const summary = await runCrawlerService({
      trigger: "manual",
      force: true,
      triggeredBy: userId,
      sourceId,
      deadline,
    });
    return Response.json(summary);
  } catch (err) {
    console.error("Manual crawl error:", (err as Error).message);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
