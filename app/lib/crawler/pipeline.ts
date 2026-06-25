/**
 * 発見クローラのオーケストレータ（テスト容易な純粋寄りコア）。
 *
 * 副作用（DB・fetch・AI・sleep・時刻）はすべて CrawlerDeps 経由で注入する。
 * cron route は本物の依存を、Vitest はフェイクを差し込む。
 *
 * 1 source の流れ: robots確認 → seed/リンクBFS(深度・件数上限) → 取得 →
 *   ETag/Last-Modified/本文ハッシュで変更検知 → 変更ページだけAI抽出 →
 *   既存公開制度と差分比較 → 候補をupsert（pending重複は避ける）。
 */
import {
  normalizeUrl,
  isHttpUrl,
  isAllowedDomain,
  shouldCrawlUrl,
  matchesAnyPattern,
  hostnameOf,
  pathOf,
  dedupeUrls,
} from "./url";
import {
  parseRobots,
  emptyRobots,
  isAllowedByRobots,
  type Robots,
} from "./robots";
import { parseHtml } from "./normalize";
import { sha256Hex } from "./hash";
import { classifyChange } from "./diff";
import { CRAWLER_USER_AGENT, type FetchResult } from "./fetcher";
import type { AiExtractor } from "./extract";
import type {
  CrawlerSourceRow,
  CrawledDocumentRow,
  ExistingProgram,
  CrawlerSettings,
  CrawlStatus,
  ChangeType,
} from "./types";

// ---- DB ポート（cron は service_role 実装、テストはフェイク） ---------------
export interface SaveDocumentInput {
  source_id: string;
  url: string;
  canonical_url?: string | null;
  title?: string | null;
  content_type?: string | null;
  status_code?: number | null;
  etag?: string | null;
  last_modified?: string | null;
  content_hash?: string | null;
  normalized_text?: string | null;
  crawl_status: CrawlStatus;
  is_changed: boolean;
  changed_at?: string | null;
  fetched_at: string;
  error_message?: string | null;
}

export interface SaveCandidateInput {
  source_id: string;
  document_id: string;
  change_type: ChangeType;
  old_program_id: string | null;
  diff_summary: string | null;
  municipality_name: string | null;
  municipality_code: string | null;
  prefecture: string | null;
  municipality_id: string | null;
  category: string | null;
  title: string;
  summary: string | null;
  target_people: string | null;
  eligibility_conditions: string | null;
  benefit_detail: string | null;
  amount: string | null;
  application_method: string | null;
  required_documents: string | null;
  deadline: string | null;
  contact_department: string | null;
  contact_phone: string | null;
  contact_url: string | null;
  official_url: string;
  source_quote: string;
  extraction_confidence: number;
  risk_flags: string[];
  content_hash: string;
}

export interface CrawlerDb {
  getSettings(): Promise<CrawlerSettings>;
  getActiveSources(opts: { limit: number; sourceId?: string }): Promise<CrawlerSourceRow[]>;
  getDocument(sourceId: string, url: string): Promise<CrawledDocumentRow | null>;
  saveDocument(input: SaveDocumentInput): Promise<{ id: string }>;
  getProgramsForMunicipality(source: CrawlerSourceRow): Promise<ExistingProgram[]>;
  findPendingCandidate(documentId: string, title: string): Promise<{ id: string } | null>;
  saveCandidate(input: SaveCandidateInput, existingId?: string): Promise<void>;
  createRun(input: { trigger: "cron" | "manual"; triggered_by: string | null }): Promise<{ id: string }>;
  finishRun(id: string, patch: Record<string, unknown>): Promise<void>;
  markSourceChecked(sourceId: string, patch: Record<string, unknown>): Promise<void>;
  markSourceError(sourceId: string, message: string, autoPauseThreshold: number): Promise<void>;
}

export interface CrawlerDeps {
  db: CrawlerDb;
  fetchDoc(url: string, opts: { etag?: string | null; lastModified?: string | null }): Promise<FetchResult>;
  fetchRobots(origin: string): Promise<string | null>;
  ai: AiExtractor | null;
  sleep(ms: number): Promise<void>;
  now(): Date;
  /** 実行の打ち切り時刻（epoch ms）。Vercel の maxDuration 内に収めるため。 */
  deadline?: number;
}

function pastDeadline(deps: CrawlerDeps): boolean {
  return deps.deadline !== undefined && deps.now().getTime() >= deps.deadline;
}

export interface SourceResult {
  sourceId: string;
  urlsChecked: number;
  changedDocuments: number;
  candidatesCreated: number;
  blocked: number;
  errors: string[];
}

export async function crawlSource(
  source: CrawlerSourceRow,
  deps: CrawlerDeps,
  settings: CrawlerSettings,
): Promise<SourceResult> {
  const res: SourceResult = {
    sourceId: source.id,
    urlsChecked: 0,
    changedDocuments: 0,
    candidatesCreated: 0,
    blocked: 0,
    errors: [],
  };

  const baseHost = hostnameOf(source.base_url);
  if (!baseHost) {
    res.errors.push("invalid_base_url");
    return res;
  }
  const allowedDomains =
    source.allowed_domains.length > 0 ? source.allowed_domains : [baseHost];
  const filter = {
    allowedDomains,
    includePatterns: source.include_patterns,
    excludePatterns: source.exclude_patterns,
  };

  // robots.txt（取得不能なら保守的に「ルール無し=全許可」だが fetched=false を記録）
  let robots: Robots = emptyRobots(false);
  try {
    const origin = new URL(source.base_url).origin;
    const txt = await deps.fetchRobots(origin);
    robots = txt ? parseRobots(txt) : emptyRobots(false);
  } catch {
    robots = emptyRobots(false);
  }

  const seeds = source.seed_urls.length > 0 ? source.seed_urls : [source.base_url];
  const queue: { url: string; depth: number }[] = dedupeUrls(seeds).map((url) => ({
    url,
    depth: 0,
  }));
  const visited = new Set<string>();
  let existingPrograms: ExistingProgram[] | null = null;
  let firstFetch = true;

  while (
    queue.length > 0 &&
    res.urlsChecked < settings.max_urls_per_source &&
    !pastDeadline(deps)
  ) {
    const { url, depth } = queue.shift()!;
    const norm = normalizeUrl(url);
    if (!norm || visited.has(norm)) continue;
    visited.add(norm);

    const isSeed = depth === 0;
    if (!isHttpUrl(norm)) continue;
    if (!isAllowedDomain(norm, filter.allowedDomains)) continue;
    if (matchesAnyPattern(norm, filter.excludePatterns)) continue;
    // seed は入口なので include 必須にしない。深掘りリンクは include 必須。
    if (!isSeed && !shouldCrawlUrl(norm, filter)) continue;

    if (robots.fetched && !isAllowedByRobots(robots, CRAWLER_USER_AGENT, pathOf(norm))) {
      res.blocked++;
      continue;
    }

    if (!firstFetch) await deps.sleep(settings.domain_min_interval_ms);
    firstFetch = false;

    const prev = await deps.db.getDocument(source.id, norm);
    let fr: FetchResult;
    try {
      fr = await deps.fetchDoc(norm, {
        etag: prev?.etag ?? null,
        lastModified: prev?.last_modified ?? null,
      });
    } catch (e) {
      res.errors.push(`${norm}: ${(e as Error).message}`);
      continue;
    }
    res.urlsChecked++;
    const nowIso = deps.now().toISOString();

    if (fr.notModified) {
      await deps.db.saveDocument({
        source_id: source.id,
        url: norm,
        status_code: 304,
        content_type: fr.contentType,
        etag: fr.etag,
        last_modified: fr.lastModified,
        crawl_status: "unchanged",
        is_changed: false,
        fetched_at: nowIso,
        error_message: null,
      });
      continue;
    }

    if (!fr.ok || !fr.body) {
      const blocked = fr.error?.startsWith("blocked") ?? false;
      const notFound = fr.status === 404 || fr.status === 410;
      const crawlStatus: CrawlStatus = blocked
        ? "blocked"
        : notFound
          ? "not_found"
          : "error";
      await deps.db.saveDocument({
        source_id: source.id,
        url: norm,
        status_code: fr.status,
        content_type: fr.contentType,
        crawl_status: crawlStatus,
        is_changed: false,
        fetched_at: nowIso,
        error_message: fr.error,
      });
      if (blocked) res.blocked++;
      if (crawlStatus === "error" || blocked) res.errors.push(`${norm}: ${fr.error}`);
      continue;
    }

    const parsed = parseHtml(fr.body, fr.finalUrl);
    const hash = sha256Hex(parsed.text);
    const changed = !prev || prev.content_hash !== hash;

    const doc = await deps.db.saveDocument({
      source_id: source.id,
      url: norm,
      canonical_url: fr.finalUrl !== norm ? fr.finalUrl : null,
      title: parsed.title,
      content_type: fr.contentType,
      status_code: fr.status,
      etag: fr.etag,
      last_modified: fr.lastModified,
      content_hash: hash,
      normalized_text: parsed.text.slice(0, 40_000),
      crawl_status: changed ? "changed" : "unchanged",
      is_changed: changed,
      changed_at: changed ? nowIso : null,
      fetched_at: nowIso,
      error_message: null,
    });

    if (depth < settings.max_depth) {
      for (const link of parsed.links) {
        if (!visited.has(link) && shouldCrawlUrl(link, filter)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }

    if (!changed) continue;
    res.changedDocuments++;

    // 変更があったページだけ AI 抽出（設定で無効 or キー未設定ならスキップ）。
    if (!settings.ai_extraction_enabled || !deps.ai) continue;
    if (parsed.text.trim().length < 120) continue;

    if (existingPrograms === null) {
      existingPrograms = await deps.db.getProgramsForMunicipality(source);
    }
    let extracted;
    try {
      extracted = await deps.ai.extract(parsed.text, {
        municipalityName: source.municipality_name,
        prefecture: source.prefecture,
        pageUrl: fr.finalUrl,
        pageTitle: parsed.title,
        categoryHints: source.category_hints,
      });
    } catch (e) {
      res.errors.push(`extract ${norm}: ${(e as Error).message}`);
      continue;
    }

    for (const ex of extracted) {
      const diff = classifyChange(ex, existingPrograms);
      if (diff.changeType === "unchanged") continue; // 既存と同一はノイズなので積まない
      const dup = await deps.db.findPendingCandidate(doc.id, ex.title);
      const riskFlags = [
        ...new Set([
          ...ex.risk_flags,
          ...(diff.importantChange ? ["important_change_review_required"] : []),
        ]),
      ];
      await deps.db.saveCandidate(
        {
          source_id: source.id,
          document_id: doc.id,
          change_type: diff.changeType,
          old_program_id: diff.oldProgramId,
          diff_summary: diff.diffSummary,
          municipality_name: source.municipality_name,
          municipality_code: source.municipality_code,
          prefecture: source.prefecture,
          municipality_id: source.municipality_id,
          category: ex.category,
          title: ex.title,
          summary: ex.summary,
          target_people: ex.target_people,
          eligibility_conditions: ex.eligibility_conditions,
          benefit_detail: ex.benefit_detail,
          amount: ex.amount,
          application_method: ex.application_method,
          required_documents: ex.required_documents,
          deadline: ex.deadline,
          contact_department: ex.contact_department,
          contact_phone: ex.contact_phone,
          contact_url: ex.contact_url,
          official_url: ex.official_url,
          source_quote: ex.source_quote,
          extraction_confidence: ex.confidence,
          risk_flags: riskFlags,
          content_hash: hash,
        },
        dup?.id,
      );
      if (!dup) res.candidatesCreated++;
    }
  }

  return res;
}

export type RunStatus = "success" | "partial" | "failed" | "skipped";

export interface RunOptions {
  trigger: "cron" | "manual";
  triggeredBy?: string | null;
  force?: boolean;
  sourceId?: string;
  maxSources?: number;
}

export interface RunSummary {
  runId: string | null;
  status: RunStatus;
  skipReason: string | null;
  sources: number;
  urlsChecked: number;
  changedDocuments: number;
  candidatesCreated: number;
  errors: number;
}

export async function runCrawler(
  deps: CrawlerDeps,
  opts: RunOptions,
): Promise<RunSummary> {
  const settings = await deps.db.getSettings();
  const run = await deps.db.createRun({
    trigger: opts.trigger,
    triggered_by: opts.triggeredBy ?? null,
  });
  const finishIso = () => deps.now().toISOString();

  if (!settings.crawler_enabled && !opts.force) {
    await deps.db.finishRun(run.id, {
      status: "skipped",
      skip_reason: "admin_disabled",
      finished_at: finishIso(),
    });
    return summary(run.id, "skipped", "admin_disabled");
  }

  const limit = Math.max(1, Math.min(opts.maxSources ?? settings.max_sources_per_run, 50));
  const sources = await deps.db.getActiveSources({ limit, sourceId: opts.sourceId });
  if (sources.length === 0) {
    await deps.db.finishRun(run.id, {
      status: "skipped",
      skip_reason: "no_active_sources",
      finished_at: finishIso(),
    });
    return summary(run.id, "skipped", "no_active_sources");
  }

  let urlsChecked = 0;
  let changedDocuments = 0;
  let candidatesCreated = 0;
  let totalErrors = 0;
  let stoppedEarly = false;
  const errorSummary: Record<string, string[]> = {};

  for (const source of sources) {
    if (pastDeadline(deps)) {
      stoppedEarly = true;
      break;
    }
    try {
      const r = await crawlSource(source, deps, settings);
      urlsChecked += r.urlsChecked;
      changedDocuments += r.changedDocuments;
      candidatesCreated += r.candidatesCreated;
      totalErrors += r.errors.length;
      if (r.errors.length > 0) errorSummary[source.name] = r.errors.slice(0, 10);

      // 何も取得できず（urlsChecked=0）に失敗/ブロックがある＝source レベルの重大失敗。
      const hardFailed = r.urlsChecked === 0 && (r.errors.length > 0 || r.blocked > 0);
      if (hardFailed) {
        await deps.db.markSourceError(
          source.id,
          r.errors[0] ?? "all_blocked",
          settings.auto_pause_error_threshold,
        );
      } else {
        await deps.db.markSourceChecked(source.id, {
          last_checked_at: finishIso(),
          last_success_at: finishIso(),
          consecutive_error_count: 0,
        });
      }
    } catch (e) {
      totalErrors++;
      errorSummary[source.name] = [(e as Error).message];
      await deps.db.markSourceError(
        source.id,
        (e as Error).message,
        settings.auto_pause_error_threshold,
      );
    }
  }

  const status: RunStatus =
    totalErrors === 0 && !stoppedEarly
      ? "success"
      : urlsChecked > 0 || changedDocuments > 0 || stoppedEarly
        ? "partial"
        : "failed";

  await deps.db.finishRun(run.id, {
    status,
    finished_at: finishIso(),
    skip_reason: stoppedEarly ? "deadline_reached" : null,
    total_sources: sources.length,
    total_urls_checked: urlsChecked,
    total_changed_documents: changedDocuments,
    total_candidates_created: candidatesCreated,
    total_errors: totalErrors,
    error_summary: Object.keys(errorSummary).length > 0 ? errorSummary : null,
  });

  return {
    runId: run.id,
    status,
    skipReason: null,
    sources: sources.length,
    urlsChecked,
    changedDocuments,
    candidatesCreated,
    errors: totalErrors,
  };
}

function summary(runId: string, status: RunStatus, skipReason: string): RunSummary {
  return {
    runId,
    status,
    skipReason,
    sources: 0,
    urlsChecked: 0,
    changedDocuments: 0,
    candidatesCreated: 0,
    errors: 0,
  };
}
