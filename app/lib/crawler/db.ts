/**
 * CrawlerDb の Supabase 実装（server-only / service_role 専用）。
 * service_role は cron / admin API route 内だけで使う。クライアントには絶対に出さない。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_CRAWLER_SETTINGS,
  type CrawlerSettings,
  type CrawlerSourceRow,
  type CrawledDocumentRow,
  type ExistingProgram,
} from "./types";
import type {
  CrawlerDb,
  SaveDocumentInput,
  SaveCandidateInput,
} from "./pipeline";

const SOURCE_COLUMNS =
  "id, name, municipality_name, municipality_code, prefecture, municipality_id, " +
  "source_type, base_url, allowed_domains, seed_urls, include_patterns, " +
  "exclude_patterns, category_hints, is_active, consecutive_error_count";

export function createSupabaseCrawlerDb(sb: SupabaseClient): CrawlerDb {
  return {
    async getSettings(): Promise<CrawlerSettings> {
      const { data, error } = await sb.from("crawler_settings").select("key, value");
      if (error) throw new Error(error.message);
      const settings: CrawlerSettings = { ...DEFAULT_CRAWLER_SETTINGS };
      for (const row of (data ?? []) as { key: string; value: unknown }[]) {
        applySetting(settings, row.key, row.value);
      }
      return settings;
    },

    async getActiveSources({ limit, sourceId }): Promise<CrawlerSourceRow[]> {
      let query = sb
        .from("crawler_sources")
        .select(SOURCE_COLUMNS)
        .eq("is_active", true)
        .is("paused_reason", null)
        .order("last_checked_at", { ascending: true, nullsFirst: true })
        .limit(limit);
      if (sourceId) query = query.eq("id", sourceId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CrawlerSourceRow[];
    },

    async getDocument(sourceId, url): Promise<CrawledDocumentRow | null> {
      const { data, error } = await sb
        .from("crawled_documents")
        .select("id, source_id, url, title, content_type, status_code, etag, last_modified, content_hash")
        .eq("source_id", sourceId)
        .eq("url", url)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as CrawledDocumentRow | null) ?? null;
    },

    async saveDocument(input: SaveDocumentInput): Promise<{ id: string }> {
      const payload = stripUndefined({
        source_id: input.source_id,
        url: input.url,
        canonical_url: input.canonical_url,
        title: input.title,
        content_type: input.content_type,
        status_code: input.status_code,
        etag: input.etag,
        last_modified: input.last_modified,
        content_hash: input.content_hash,
        normalized_text: input.normalized_text,
        crawl_status: input.crawl_status,
        is_changed: input.is_changed,
        changed_at: input.changed_at,
        fetched_at: input.fetched_at,
        error_message: input.error_message,
      });
      const { data, error } = await sb
        .from("crawled_documents")
        .upsert(payload, { onConflict: "source_id,url" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: (data as { id: string }).id };
    },

    async getProgramsForMunicipality(source): Promise<ExistingProgram[]> {
      if (!source.municipality_id) return [];
      const { data, error } = await sb
        .from("support_programs")
        .select(
          "id, title, official_url, target_people, benefit_amount_text, " +
            "application_deadline_text, application_method_text, " +
            "required_documents_text, contact_phone",
        )
        .eq("municipality_id", source.municipality_id)
        .neq("status", "archived")
        .limit(1000);
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        title: String(r.title ?? ""),
        official_url: String(r.official_url ?? ""),
        category: null,
        target_people: (r.target_people as string | null) ?? null,
        benefit_amount_text: (r.benefit_amount_text as string | null) ?? null,
        application_deadline_text: (r.application_deadline_text as string | null) ?? null,
        application_method_text: (r.application_method_text as string | null) ?? null,
        required_documents_text: (r.required_documents_text as string | null) ?? null,
        contact_phone: (r.contact_phone as string | null) ?? null,
      }));
    },

    async findPendingCandidate(documentId, title): Promise<{ id: string } | null> {
      const { data, error } = await sb
        .from("support_program_candidates")
        .select("id")
        .eq("document_id", documentId)
        .eq("title", title)
        .eq("candidate_status", "pending")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as { id: string } | null) ?? null;
    },

    async saveCandidate(input: SaveCandidateInput, existingId?: string): Promise<void> {
      const payload = {
        source_id: input.source_id,
        document_id: input.document_id,
        change_type: input.change_type,
        old_program_id: input.old_program_id,
        diff_summary: input.diff_summary,
        municipality_name: input.municipality_name,
        municipality_code: input.municipality_code,
        prefecture: input.prefecture,
        municipality_id: input.municipality_id,
        category: input.category,
        title: input.title,
        summary: input.summary,
        target_people: input.target_people,
        eligibility_conditions: input.eligibility_conditions,
        benefit_detail: input.benefit_detail,
        amount: input.amount,
        application_method: input.application_method,
        required_documents: input.required_documents,
        deadline: input.deadline,
        contact_department: input.contact_department,
        contact_phone: input.contact_phone,
        contact_url: input.contact_url,
        official_url: input.official_url,
        source_quote: input.source_quote,
        extraction_confidence: input.extraction_confidence,
        risk_flags: input.risk_flags,
        content_hash: input.content_hash,
      };
      const q = existingId
        ? sb.from("support_program_candidates").update(payload).eq("id", existingId)
        : sb.from("support_program_candidates").insert(payload);
      const { error } = await q;
      if (error) throw new Error(error.message);
    },

    async createRun(input): Promise<{ id: string }> {
      const { data, error } = await sb
        .from("crawler_runs")
        .insert({
          trigger: input.trigger,
          triggered_by: input.triggered_by,
          status: "running",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: (data as { id: string }).id };
    },

    async finishRun(id, patch): Promise<void> {
      const { error } = await sb.from("crawler_runs").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },

    async markSourceChecked(sourceId, patch): Promise<void> {
      const { error } = await sb.from("crawler_sources").update(patch).eq("id", sourceId);
      if (error) throw new Error(error.message);
    },

    async markSourceError(sourceId, message, autoPauseThreshold): Promise<void> {
      const { data } = await sb
        .from("crawler_sources")
        .select("consecutive_error_count")
        .eq("id", sourceId)
        .maybeSingle();
      const current = Number((data as { consecutive_error_count?: number } | null)?.consecutive_error_count ?? 0);
      const next = current + 1;
      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = {
        consecutive_error_count: next,
        last_checked_at: nowIso,
        last_error_at: nowIso,
        last_error_message: message.slice(0, 500),
      };
      if (next >= autoPauseThreshold) {
        patch.is_active = false;
        patch.paused_reason = `auto_paused: 連続${next}回の重大エラー（${message.slice(0, 120)}）`;
        patch.paused_at = nowIso;
      }
      const { error } = await sb.from("crawler_sources").update(patch).eq("id", sourceId);
      if (error) throw new Error(error.message);
    },
  };
}

function applySetting(settings: CrawlerSettings, key: string, value: unknown): void {
  switch (key) {
    case "crawler_enabled":
      settings.crawler_enabled = Boolean(value);
      break;
    case "ai_extraction_enabled":
      settings.ai_extraction_enabled = Boolean(value);
      break;
    case "max_sources_per_run":
      settings.max_sources_per_run = toInt(value, settings.max_sources_per_run);
      break;
    case "max_urls_per_source":
      settings.max_urls_per_source = toInt(value, settings.max_urls_per_source);
      break;
    case "max_depth":
      settings.max_depth = toInt(value, settings.max_depth);
      break;
    case "domain_min_interval_ms":
      settings.domain_min_interval_ms = toInt(value, settings.domain_min_interval_ms);
      break;
    case "auto_pause_error_threshold":
      settings.auto_pause_error_threshold = toInt(value, settings.auto_pause_error_threshold);
      break;
  }
}

function toInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
