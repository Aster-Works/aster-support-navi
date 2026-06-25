import { describe, it, expect } from "vitest";
import { crawlSource, runCrawler, type CrawlerDeps } from "@/app/lib/crawler/pipeline";
import type {
  CrawlerSourceRow,
  CrawlerSettings,
  CrawledDocumentRow,
  ExtractedProgram,
} from "@/app/lib/crawler/types";
import type { FetchResult } from "@/app/lib/crawler/fetcher";
import type { AiExtractor } from "@/app/lib/crawler/extract";

const SEED = "https://www.city.test.lg.jp/fukushi/omutsu.html";

const SOURCE: CrawlerSourceRow = {
  id: "s1",
  name: "テスト区",
  municipality_name: "テスト区",
  municipality_code: null,
  prefecture: "東京都",
  municipality_id: null,
  source_type: "html",
  base_url: "https://www.city.test.lg.jp/",
  allowed_domains: ["www.city.test.lg.jp"],
  seed_urls: [SEED],
  include_patterns: [],
  exclude_patterns: [],
  category_hints: ["elderly"],
  is_active: true,
  consecutive_error_count: 0,
};

const SETTINGS: CrawlerSettings = {
  crawler_enabled: true,
  ai_extraction_enabled: true,
  max_sources_per_run: 5,
  max_urls_per_source: 3,
  max_depth: 0,
  domain_min_interval_ms: 0,
  auto_pause_error_threshold: 3,
};

const BODY = `<html><head><title>紙おむつ支給</title></head><body><main><h1>紙おむつ支給</h1><p>${"要介護認定を受けた在宅の高齢者に紙おむつを現物支給します。申請は窓口で行います。".repeat(
  6,
)}</p></main></body></html>`;

const okHtml: FetchResult = {
  ok: true,
  notModified: false,
  status: 200,
  finalUrl: SEED,
  contentType: "text/html",
  etag: '"e1"',
  lastModified: null,
  body: BODY,
  truncated: false,
  error: null,
};

const notModified: FetchResult = {
  ok: true,
  notModified: true,
  status: 304,
  finalUrl: SEED,
  contentType: "text/html",
  etag: '"e1"',
  lastModified: null,
  body: null,
  truncated: false,
  error: null,
};

const PROGRAM: ExtractedProgram = {
  title: "紙おむつ支給",
  category: "elderly",
  summary: "在宅高齢者に紙おむつを支給",
  target_people: "要介護高齢者",
  eligibility_conditions: null,
  benefit_detail: null,
  amount: "月6000円分",
  application_method: "窓口申請",
  required_documents: null,
  deadline: null,
  contact_department: "高齢福祉課",
  contact_phone: null,
  contact_url: null,
  official_url: SEED,
  source_quote: "要介護認定を受けた在宅の高齢者に紙おむつを現物支給します",
  confidence: 0.8,
  risk_flags: [],
};

function fakeAi(programs: ExtractedProgram[]): AiExtractor & { calls: number } {
  const ai = {
    calls: 0,
    async extract() {
      ai.calls++;
      return programs;
    },
  };
  return ai;
}

interface Captured {
  candidates: unknown[];
  documents: unknown[];
  finished: Record<string, unknown>[];
  sourceChecked: number;
  sourceErrors: number;
}

function makeDeps(opts: {
  settings?: CrawlerSettings;
  sources?: CrawlerSourceRow[];
  prevDoc?: CrawledDocumentRow | null;
  fetchResult?: FetchResult;
  ai?: (AiExtractor & { calls: number }) | null;
}): { deps: CrawlerDeps; cap: Captured } {
  const cap: Captured = {
    candidates: [],
    documents: [],
    finished: [],
    sourceChecked: 0,
    sourceErrors: 0,
  };
  const deps: CrawlerDeps = {
    db: {
      getSettings: async () => opts.settings ?? SETTINGS,
      getActiveSources: async () => opts.sources ?? [],
      getDocument: async () => opts.prevDoc ?? null,
      saveDocument: async (input) => {
        cap.documents.push(input);
        return { id: `doc-${cap.documents.length}` };
      },
      getProgramsForMunicipality: async () => [],
      findPendingCandidate: async () => null,
      saveCandidate: async (input, existingId) => {
        cap.candidates.push({ input, existingId });
      },
      createRun: async () => ({ id: "run1" }),
      finishRun: async (_id, patch) => {
        cap.finished.push(patch);
      },
      markSourceChecked: async () => {
        cap.sourceChecked++;
      },
      markSourceError: async () => {
        cap.sourceErrors++;
      },
    },
    fetchDoc: async () => opts.fetchResult ?? okHtml,
    fetchRobots: async () => null,
    ai: opts.ai === undefined ? fakeAi([PROGRAM]) : opts.ai,
    sleep: async () => {},
    now: () => new Date("2026-06-25T00:00:00Z"),
  };
  return { deps, cap };
}

describe("crawlSource", () => {
  it("extracts and creates a candidate when the page changed", async () => {
    const ai = fakeAi([PROGRAM]);
    const { deps, cap } = makeDeps({ ai });
    const r = await crawlSource(SOURCE, deps, SETTINGS);
    expect(r.urlsChecked).toBe(1);
    expect(r.changedDocuments).toBe(1);
    expect(r.candidatesCreated).toBe(1);
    expect(ai.calls).toBe(1);
    expect(cap.candidates).toHaveLength(1);
  });

  it("does NOT call AI when the page is unchanged (304)", async () => {
    const ai = fakeAi([PROGRAM]);
    const { deps, cap } = makeDeps({ ai, fetchResult: notModified });
    const r = await crawlSource(SOURCE, deps, SETTINGS);
    expect(r.urlsChecked).toBe(1);
    expect(r.changedDocuments).toBe(0);
    expect(ai.calls).toBe(0);
    expect(cap.candidates).toHaveLength(0);
  });

  it("does NOT call AI when content hash is unchanged from a previous crawl", async () => {
    // 同一本文を2回。1回目で hash を記録し、それを prevDoc に与えて2回目は unchanged。
    const first = makeDeps({ ai: fakeAi([PROGRAM]) });
    await crawlSource(SOURCE, first.deps, SETTINGS);
    const savedHash = (first.cap.documents[0] as { content_hash: string }).content_hash;

    const ai = fakeAi([PROGRAM]);
    const prevDoc = {
      id: "d1",
      source_id: "s1",
      url: SEED,
      title: null,
      content_type: null,
      status_code: 200,
      etag: null,
      last_modified: null,
      content_hash: savedHash,
    } satisfies CrawledDocumentRow;
    const { deps } = makeDeps({ ai, prevDoc });
    const r = await crawlSource(SOURCE, deps, SETTINGS);
    expect(r.changedDocuments).toBe(0);
    expect(ai.calls).toBe(0);
  });

  it("does NOT call AI when ai_extraction_enabled is false", async () => {
    const ai = fakeAi([PROGRAM]);
    const { deps, cap } = makeDeps({ ai });
    const r = await crawlSource(SOURCE, deps, { ...SETTINGS, ai_extraction_enabled: false });
    expect(r.changedDocuments).toBe(1);
    expect(ai.calls).toBe(0);
    expect(cap.candidates).toHaveLength(0);
  });

  it("skips AI gracefully when no extractor is configured", async () => {
    const { deps, cap } = makeDeps({ ai: null });
    const r = await crawlSource(SOURCE, deps, SETTINGS);
    expect(r.changedDocuments).toBe(1);
    expect(cap.candidates).toHaveLength(0);
  });
});

describe("runCrawler", () => {
  it("skips immediately when crawler is admin-disabled", async () => {
    const { deps, cap } = makeDeps({
      settings: { ...SETTINGS, crawler_enabled: false },
      sources: [SOURCE],
    });
    const summary = await runCrawler(deps, { trigger: "cron" });
    expect(summary.status).toBe("skipped");
    expect(summary.skipReason).toBe("admin_disabled");
    expect(cap.documents).toHaveLength(0);
    expect(cap.finished[0]?.skip_reason).toBe("admin_disabled");
  });

  it("runs disabled crawler when force=true (manual run)", async () => {
    const { deps } = makeDeps({
      settings: { ...SETTINGS, crawler_enabled: false },
      sources: [SOURCE],
    });
    const summary = await runCrawler(deps, { trigger: "manual", force: true });
    expect(summary.status).toBe("success");
    expect(summary.candidatesCreated).toBe(1);
  });

  it("skips with no_active_sources when none registered", async () => {
    const { deps } = makeDeps({ sources: [] });
    const summary = await runCrawler(deps, { trigger: "cron" });
    expect(summary.status).toBe("skipped");
    expect(summary.skipReason).toBe("no_active_sources");
  });

  it("processes an active source and records success", async () => {
    const { deps, cap } = makeDeps({ sources: [SOURCE] });
    const summary = await runCrawler(deps, { trigger: "cron" });
    expect(summary.status).toBe("success");
    expect(summary.sources).toBe(1);
    expect(summary.candidatesCreated).toBe(1);
    expect(cap.sourceChecked).toBe(1);
  });
});
