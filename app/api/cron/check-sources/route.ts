/**
 * 公式出典の自動巡回（Vercel Cron から日次起動）。
 *
 * 目的:
 * - support_sources の公式URLを少量ずつ取得し、初回は fetched_content_hash の
 *   baseline を作る。
 * - baseline 作成後に本文ハッシュが変わった/取得できない場合だけ review_queue_items
 *   に積む。制度本文や公開ステータスは自動変更しない。
 *
 * 安全策:
 * - service_role は server-only route 内だけで使う。
 * - CRON_SECRET が未設定/不一致なら実行しない。
 * - URL/redirect/DNS を検査し、private IP・localhost へのfetchを拒否する。
 * - 取得サイズ・timeout・件数を制限する。
 */
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRateLimiter } from "@/app/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;
const MAX_CANDIDATES = 250;
const MAX_FETCH_BYTES = 512_000;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 12_000;

const rateLimiter = createRateLimiter({ interval: 300_000, maxTokens: 1 });

type JsonRecord = Record<string, unknown>;

interface ProgramRef {
  id: string;
  slug: string;
  title: string;
  status: string;
  last_official_checked_at: string | null;
}

interface SourceRow {
  id: string;
  support_program_id: string;
  url: string;
  title: string | null;
  official_checked_at: string | null;
  fetched_content_hash: string | null;
  fetched_content_type: string | null;
  last_fetched_at: string | null;
  last_fetch_status: number | null;
  last_fetch_error: string | null;
  last_fetch_changed_at: string | null;
  quality_state: string;
  detected_issue_codes: string[] | null;
  review_interval_days: number;
  support_programs: ProgramRef | null;
}

interface FetchSnapshot {
  ok: boolean;
  finalUrl: string;
  status: number | null;
  contentType: string | null;
  hash: string | null;
  error: string | null;
  bytes: number;
}

function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function clampLimit(value: string | null): number {
  const parsed = Number.parseInt(
    value ?? process.env.SOURCE_CHECK_LIMIT ?? "",
    10,
  );
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function isPrivateIpAddress(address: string): boolean {
  const normalized = address.startsWith("::ffff:")
    ? address.slice("::ffff:".length)
    : address;
  if (isIP(normalized) === 4) {
    const parts = normalized.split(".").map((part) => Number.parseInt(part, 10));
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const lower = normalized.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

async function assertFetchableUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("invalid_url");
  }
  if (url.protocol !== "https:") throw new Error("non_https_url");
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("blocked_localhost");
  }
  if (isIP(hostname) && isPrivateIpAddress(hostname)) {
    throw new Error("blocked_private_ip");
  }
  const results = await lookup(hostname, { all: true });
  if (results.some((result) => isPrivateIpAddress(result.address))) {
    throw new Error("blocked_private_dns");
  }
  return url;
}

async function readBodyHash(res: Response): Promise<{ hash: string; bytes: number }> {
  const reader = res.body?.getReader();
  const hash = createHash("sha256");
  let bytes = 0;
  if (!reader) {
    const buffer = Buffer.from(await res.arrayBuffer());
    const chunk = buffer.subarray(0, MAX_FETCH_BYTES);
    hash.update(chunk);
    return { hash: hash.digest("hex"), bytes: chunk.byteLength };
  }
  while (bytes < MAX_FETCH_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const remaining = MAX_FETCH_BYTES - bytes;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    hash.update(chunk);
    bytes += chunk.byteLength;
    if (value.byteLength > remaining) break;
  }
  try {
    await reader.cancel();
  } catch {
    // The connection may already be closed.
  }
  return { hash: hash.digest("hex"), bytes };
}

async function fetchSnapshot(rawUrl: string): Promise<FetchSnapshot> {
  let current = await assertFetchableUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "AsterSupportNaviSourceMonitor/1.0",
        Accept: "text/html,application/xhtml+xml,application/pdf,text/plain,*/*",
      },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = await assertFetchableUrl(new URL(location, current).toString());
      continue;
    }
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      return {
        ok: false,
        finalUrl: current.toString(),
        status: res.status,
        contentType,
        hash: null,
        error: `http_${res.status}`,
        bytes: 0,
      };
    }
    const body = await readBodyHash(res);
    return {
      ok: true,
      finalUrl: current.toString(),
      status: res.status,
      contentType,
      hash: body.hash,
      error: null,
      bytes: body.bytes,
    };
  }
  return {
    ok: false,
    finalUrl: current.toString(),
    status: null,
    contentType: null,
    hash: null,
    error: "too_many_redirects",
    bytes: 0,
  };
}

function isDue(source: SourceRow, now: Date, force: boolean): boolean {
  if (force) return true;
  if (!source.last_fetched_at) return true;
  const intervalDays = Math.max(1, source.review_interval_days ?? 90);
  const lastFetched = Date.parse(source.last_fetched_at);
  if (Number.isNaN(lastFetched)) return true;
  return now.getTime() - lastFetched >= intervalDays * 86_400_000;
}

function addIssueCode(existing: string[] | null, code: string): string[] {
  return [...new Set([...(existing ?? []), code])];
}

async function enqueueReviewItem(
  sb: SupabaseClient,
  source: SourceRow,
  issueCode: string,
  reason: string,
  priority: "high" | "normal" | "low",
  severity: "blocker" | "warning" | "info",
  diffJson: JsonRecord,
): Promise<void> {
  const program = source.support_programs;
  if (!program) return;
  const payload = {
    support_program_id: program.id,
    source_id: source.id,
    issue_code: issueCode,
    reason,
    priority,
    status: "open",
    due_on: addDays(todayJst(), priority === "high" ? 3 : 7),
    diff_json: diffJson,
    severity,
    detected_by: "source_monitor",
    source_last_checked_at:
      source.official_checked_at ?? program.last_official_checked_at,
  };
  const existing = await sb
    .from("review_queue_items")
    .select("id")
    .eq("support_program_id", program.id)
    .eq("issue_code", issueCode)
    .eq("status", "open")
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const result = existing.data
    ? await sb
        .from("review_queue_items")
        .update(payload)
        .eq("id", (existing.data as { id: string }).id)
    : await sb.from("review_queue_items").insert(payload);
  if (result.error) throw new Error(result.error.message);
}

async function loadCandidates(
  sb: SupabaseClient,
  candidateLimit: number,
): Promise<SourceRow[]> {
  const { data, error } = await sb
    .from("support_sources")
    .select(
      `
        id, support_program_id, url, title, official_checked_at,
        fetched_content_hash, fetched_content_type, last_fetched_at,
        last_fetch_status, last_fetch_error, last_fetch_changed_at,
        quality_state, detected_issue_codes, review_interval_days,
        support_programs!inner (
          id, slug, title, status, last_official_checked_at
        )
      `,
    )
    .eq("source_kind", "official")
    .neq("support_programs.status", "archived")
    .order("last_fetched_at", { ascending: true, nullsFirst: true })
    .limit(candidateLimit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SourceRow[];
}

export async function GET(req: Request): Promise<Response> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ skipped: "source monitor not configured" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!rateLimiter.check("cron-check-sources")) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }

  const requestUrl = new URL(req.url);
  const limit = clampLimit(requestUrl.searchParams.get("limit"));
  const dryRun = requestUrl.searchParams.get("dryRun") === "1";
  const force = requestUrl.searchParams.get("force") === "1";
  const now = new Date();
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const sources = await loadCandidates(
      sb,
      Math.min(MAX_CANDIDATES, Math.max(limit * 5, limit)),
    );
    const dueSources = sources.filter((source) => isDue(source, now, force)).slice(0, limit);
    if (dryRun) {
      return Response.json({
        dryRun: true,
        candidates: sources.length,
        due: dueSources.length,
        sample: dueSources.slice(0, 5).map((source) => ({
          id: source.id,
          url: source.url,
          slug: source.support_programs?.slug,
          lastFetchedAt: source.last_fetched_at,
          hasBaseline: Boolean(source.fetched_content_hash),
        })),
      });
    }

    let baselined = 0;
    let unchanged = 0;
    let changed = 0;
    let failed = 0;
    const errors: { id: string; error: string }[] = [];

    for (const source of dueSources) {
      let snapshot: FetchSnapshot;
      try {
        snapshot = await fetchSnapshot(source.url);
      } catch (err) {
        snapshot = {
          ok: false,
          finalUrl: source.url,
          status: null,
          contentType: null,
          hash: null,
          error: (err as Error).message || "fetch_failed",
          bytes: 0,
        };
      }

      if (!snapshot.ok || !snapshot.hash) {
        failed++;
        const issueCode = "official_source_unreachable";
        const update = await sb
          .from("support_sources")
          .update({
            last_fetched_at: new Date().toISOString(),
            last_fetch_status: snapshot.status,
            last_fetch_error: snapshot.error,
            fetched_content_type: snapshot.contentType,
            quality_state: "broken",
            detected_issue_codes: addIssueCode(
              source.detected_issue_codes,
              issueCode,
            ),
          })
          .eq("id", source.id);
        if (update.error) {
          errors.push({ id: source.id, error: update.error.message });
          continue;
        }
        await enqueueReviewItem(
          sb,
          source,
          issueCode,
          "公式出典URLを自動取得できません",
          "high",
          "warning",
          {
            url: source.url,
            finalUrl: snapshot.finalUrl,
            status: snapshot.status,
            error: snapshot.error,
          },
        );
        continue;
      }

      const commonUpdate = {
        fetched_content_hash: snapshot.hash,
        fetched_content_type: snapshot.contentType,
        last_fetched_at: new Date().toISOString(),
        last_fetch_status: snapshot.status,
        last_fetch_error: null,
      };

      if (!source.fetched_content_hash) {
        baselined++;
        const update = await sb
          .from("support_sources")
          .update({
            ...commonUpdate,
            quality_state:
              source.quality_state === "unchecked" ? "ok" : source.quality_state,
          })
          .eq("id", source.id);
        if (update.error) errors.push({ id: source.id, error: update.error.message });
        continue;
      }

      if (source.fetched_content_hash === snapshot.hash) {
        unchanged++;
        const update = await sb
          .from("support_sources")
          .update(commonUpdate)
          .eq("id", source.id);
        if (update.error) errors.push({ id: source.id, error: update.error.message });
        continue;
      }

      changed++;
      const issueCode = "official_source_changed";
      const update = await sb
        .from("support_sources")
        .update({
          ...commonUpdate,
          last_fetch_changed_at: new Date().toISOString(),
          quality_state: "needs_review",
          detected_issue_codes: addIssueCode(
            source.detected_issue_codes,
            issueCode,
          ),
        })
        .eq("id", source.id);
      if (update.error) {
        errors.push({ id: source.id, error: update.error.message });
        continue;
      }
      await enqueueReviewItem(
        sb,
        source,
        issueCode,
        "公式出典ページの内容変化を検出しました",
        "normal",
        "warning",
        {
          url: source.url,
          finalUrl: snapshot.finalUrl,
          previousHash: source.fetched_content_hash,
          currentHash: snapshot.hash,
          status: snapshot.status,
          contentType: snapshot.contentType,
          bytes: snapshot.bytes,
        },
      );
    }

    return Response.json({
      checked: dueSources.length,
      baselined,
      unchanged,
      changed,
      failed,
      errors,
    });
  } catch (err) {
    console.error("Source Monitor Error:", (err as Error).message);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
