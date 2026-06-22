/**
 * 型付き seed（app/data）→ Supabase content schema 用の冪等 SQL を生成する。
 *
 * 使い方:
 *   npx tsx scripts/export-seed-to-sql.ts
 *   # 出力: supabase/seed/content_seed.*.generated.sql（.gitignore 済み）
 *
 * 適用（管理者のみ・service_role が RLS をバイパス）:
 *   - Supabase ダッシュボードの SQL Editor に貼る、または
 *   - psql "$SUPABASE_DB_URL" -f supabase/seed/content_seed.00_masters.generated.sql
 *     以降、番号順に content_seed.*_programs.generated.sql を適用
 *
 * 安全:
 *   - 本スクリプトは SQL を「生成」するだけで、DB へは一切書き込まない。
 *   - 生成 SQL は upsert / where not exists で冪等。再実行しても重複しない。
 *   - support_programs は seed の status を尊重する。draft もDBへ載せ、review_queue で確認できるようにする。
 *   - 公開挙動は DATA_SOURCE=seed の間は変わらない。投入後 hybrid/supabase に切替えて検証する。
 */
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { categories } from "@/app/data/categories";
import { lifeEvents } from "@/app/data/lifeEvents";
import { municipalities } from "@/app/data/municipalities";
import { prefectures } from "@/app/data/prefectures";
import { programs } from "@/app/data/programs";
import {
  evaluateProgramQuality,
  getSourceHost,
  type QualityIssue,
} from "@/app/lib/data/quality";
import type { SupportProgram } from "@/app/lib/data/types";

// ---- SQL リテラル化ヘルパ --------------------------------------------------
const s = (v: string | undefined | null): string =>
  v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
const n = (v: number | undefined | null): string => (v == null ? "NULL" : String(v));
const b = (v: boolean | undefined | null): string =>
  v == null ? "NULL" : v ? "TRUE" : "FALSE";
const arr = (v: string[] | undefined | null): string => {
  if (!v || v.length === 0) return "'{}'::text[]";
  return `ARRAY[${v.map((x) => s(x)).join(", ")}]::text[]`;
};
const jsonb = (v: unknown): string => `${s(JSON.stringify(v))}::jsonb`;

const EXPORT_DATE = new Date().toISOString().slice(0, 10);

function contentHash(p: SupportProgram): string {
  const body = {
    slug: p.slug,
    status: p.status,
    title: p.title,
    summary: p.summary,
    plainLanguageSummary: p.plainLanguageSummary ?? null,
    targetPeople: p.targetPeople,
    benefitAmountText: p.benefitAmountText ?? null,
    applicationDeadlineText: p.applicationDeadlineText ?? null,
    applicationMethodText: p.applicationMethodText,
    requiredDocumentsText: p.requiredDocumentsText ?? null,
    officialUrl: p.officialUrl,
    officialSourceTitle: p.officialSourceTitle ?? null,
    lastOfficialCheckedAt: p.lastOfficialCheckedAt,
    sourceConfidence: p.sourceConfidence,
    categorySlugs: p.categorySlugs,
    lifeEventSlugs: p.lifeEventSlugs,
  };
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function reviewDue(issue: QualityIssue): string {
  if (issue.dueOn) return issue.dueOn;
  if (issue.priority === "high") return EXPORT_DATE;
  if (issue.priority === "normal") {
    const d = new Date(`${EXPORT_DATE}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 14);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(`${EXPORT_DATE}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

const lines: string[] = [];
const out = (line = "") => lines.push(line);

out("-- 自動生成: scripts/export-seed-to-sql.ts（手で編集しない）");
out("-- 型付き seed → Supabase content schema（冪等 upsert）/ masters（FK 親）");
out();

// ---- prefectures -----------------------------------------------------------
out("-- prefectures");
for (const p of prefectures) {
  out(
    `insert into public.prefectures (slug, name, name_kana, region) values (${s(p.slug)}, ${s(p.name)}, ${s(p.nameKana)}, ${s(p.region)})`,
  );
  out(
    "on conflict (slug) do update set name = excluded.name, name_kana = excluded.name_kana, region = excluded.region;",
  );
}
out();

// ---- categories ------------------------------------------------------------
out("-- categories");
for (const c of categories) {
  out(
    `insert into public.categories (slug, name, description, sort_order) values (${s(c.slug)}, ${s(c.name)}, ${s(c.description)}, ${n(c.sortOrder)})`,
  );
  out(
    "on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;",
  );
}
out();

// ---- life_events -----------------------------------------------------------
out("-- life_events");
for (const e of lifeEvents) {
  out(
    `insert into public.life_events (slug, name, description, icon, sort_order, common_checks) values (${s(e.slug)}, ${s(e.name)}, ${s(e.description)}, ${s(e.icon)}, ${n(e.sortOrder)}, ${arr(e.commonChecks)})`,
  );
  out(
    "on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, sort_order = excluded.sort_order, common_checks = excluded.common_checks;",
  );
}
out();

// ---- municipalities --------------------------------------------------------
out("-- municipalities（prefecture_id は slug 参照）");
for (const m of municipalities) {
  out(
    `insert into public.municipalities (prefecture_id, slug, name, name_kana, official_site_url, population, intro)`,
  );
  out(
    `select p.id, ${s(m.slug)}, ${s(m.name)}, ${s(m.nameKana)}, ${s(m.officialSiteUrl)}, ${n(m.population)}, ${s(m.intro)} from public.prefectures p where p.slug = ${s(m.prefectureSlug)}`,
  );
  out(
    "on conflict (prefecture_id, slug) do update set name = excluded.name, name_kana = excluded.name_kana, official_site_url = excluded.official_site_url, population = excluded.population, intro = excluded.intro;",
  );
}
out();

// ---- support_programs（全 status 投入・チャンク分割で Management API の上限回避） ----
const muniId = (p: SupportProgram) =>
  `(select m.id from public.municipalities m join public.prefectures pr on pr.id = m.prefecture_id where pr.slug = ${s(p.prefectureSlug)} and m.slug = ${s(p.municipalitySlug)})`;

const programBlocks: string[] = [];
for (const p of programs) {
  const hash = contentHash(p);
  const issues = evaluateProgramQuality(p, { todayIso: EXPORT_DATE });
  const queueIssues = issues.filter((i) => i.shouldQueue);
  const sourceState = queueIssues.length > 0 ? "needs_review" : "ok";
  const sourceHost = getSourceHost(p.officialUrl);
  const blk: string[] = [];
  blk.push(
    `insert into public.support_programs (
  municipality_id, slug, title, summary, plain_language_summary, benefit_type,
  target_people, benefit_amount_text, application_deadline_text, application_period_end,
  application_method_text, required_documents_text, online_application_available,
  contact_name, contact_phone, contact_url, official_url, official_source_title,
  last_official_checked_at, source_confidence, uncertain_fields, disclaimer_note,
  status, published_at, updated_at
) values (
  ${muniId(p)}, ${s(p.slug)}, ${s(p.title)}, ${s(p.summary)}, ${s(p.plainLanguageSummary)}, ${s(p.benefitType)},
  ${s(p.targetPeople)}, ${s(p.benefitAmountText)}, ${s(p.applicationDeadlineText)}, ${s(p.applicationPeriodEnd)},
  ${s(p.applicationMethodText)}, ${s(p.requiredDocumentsText)}, ${b(p.onlineApplicationAvailable)},
  ${s(p.contactName)}, ${s(p.contactPhone)}, ${s(p.contactUrl)}, ${s(p.officialUrl)}, ${s(p.officialSourceTitle)},
  ${s(p.lastOfficialCheckedAt)}, ${s(p.sourceConfidence)}, ${arr(p.uncertainFields)}, ${s(p.disclaimerNote)},
  ${s(p.status)}, ${p.status === "published" ? "now()" : "NULL"}, coalesce(${s(p.updatedAt)}, now())
)`,
  );
  blk.push(`on conflict (slug) do update set
  municipality_id = excluded.municipality_id, title = excluded.title, summary = excluded.summary,
  plain_language_summary = excluded.plain_language_summary, benefit_type = excluded.benefit_type,
  target_people = excluded.target_people, benefit_amount_text = excluded.benefit_amount_text,
  application_deadline_text = excluded.application_deadline_text, application_period_end = excluded.application_period_end,
  application_method_text = excluded.application_method_text, required_documents_text = excluded.required_documents_text,
  online_application_available = excluded.online_application_available, contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone, contact_url = excluded.contact_url, official_url = excluded.official_url,
  official_source_title = excluded.official_source_title, last_official_checked_at = excluded.last_official_checked_at,
  source_confidence = excluded.source_confidence, uncertain_fields = excluded.uncertain_fields,
  disclaimer_note = excluded.disclaimer_note, status = excluded.status,
  published_at = case
    when excluded.status = 'published' and public.support_programs.published_at is null then excluded.published_at
    when excluded.status <> 'published' then null
    else public.support_programs.published_at
  end,
  updated_at = excluded.updated_at;`);

  // 関連（カテゴリ / 生活イベント）: 一旦クリアして貼り直し（冪等）。
  blk.push(
    `delete from public.support_program_categories where support_program_id = (select id from public.support_programs where slug = ${s(p.slug)});`,
  );
  for (const c of p.categorySlugs) {
    blk.push(
      `insert into public.support_program_categories (support_program_id, category_id) select sp.id, c.id from public.support_programs sp, public.categories c where sp.slug = ${s(p.slug)} and c.slug = ${s(c)} on conflict do nothing;`,
    );
  }
  blk.push(
    `delete from public.support_program_life_events where support_program_id = (select id from public.support_programs where slug = ${s(p.slug)});`,
  );
  for (const le of p.lifeEventSlugs) {
    blk.push(
      `insert into public.support_program_life_events (support_program_id, life_event_id) select sp.id, le.id from public.support_programs sp, public.life_events le where sp.slug = ${s(p.slug)} and le.slug = ${s(le)} on conflict do nothing;`,
    );
  }

  // 出典: URL が同じ既存行は更新し、URL が変わった場合は旧行を残して新規追加（履歴を壊さない）。
  blk.push(`with target_program as (
  select id from public.support_programs where slug = ${s(p.slug)}
), updated_source as (
  update public.support_sources src
  set
    title = ${s(p.officialSourceTitle ?? p.title)},
    publisher = coalesce(src.publisher, ${s(sourceHost)}),
    retrieved_at = coalesce(src.retrieved_at, now()),
    official_checked_at = ${s(p.lastOfficialCheckedAt)},
    content_hash = ${s(hash)},
    notes = ${s("seed export baseline")},
    source_kind = 'official',
    quality_state = ${s(sourceState)},
    detected_issue_codes = ${arr(queueIssues.map((i) => i.code))},
    review_interval_days = 90
  from target_program tp
  where src.support_program_id = tp.id and src.url = ${s(p.officialUrl)}
  returning src.id
)
insert into public.support_sources (
  support_program_id, url, title, publisher, retrieved_at, official_checked_at,
  content_hash, notes, source_kind, quality_state, detected_issue_codes, review_interval_days
)
select
  tp.id, ${s(p.officialUrl)}, ${s(p.officialSourceTitle ?? p.title)}, ${s(sourceHost)},
  now(), ${s(p.lastOfficialCheckedAt)}, ${s(hash)}, ${s("seed export baseline")},
  'official', ${s(sourceState)}, ${arr(queueIssues.map((i) => i.code))}, 90
from target_program tp
where not exists (select 1 from updated_source);`);

  blk.push(`insert into public.support_revisions (
  support_program_id, change_type, change_summary, after_json, external_key
)
select
  sp.id,
  'seed_import',
  ${s("seed baseline import")},
  ${jsonb({
    slug: p.slug,
    status: p.status,
    title: p.title,
    officialUrl: p.officialUrl,
    lastOfficialCheckedAt: p.lastOfficialCheckedAt,
    sourceConfidence: p.sourceConfidence,
    contentHash: hash,
  })},
  ${s(`seed:${p.slug}:${hash}`)}
from public.support_programs sp
where sp.slug = ${s(p.slug)}
on conflict (external_key) where external_key is not null do nothing;`);

  for (const q of queueIssues) {
    blk.push(`insert into public.review_queue_items (
  support_program_id, source_id, issue_code, reason, priority, status, due_on,
  diff_json, severity, detected_by, source_last_checked_at
)
select
  sp.id,
  ss.id,
  ${s(q.code)},
  ${s(q.label)},
  ${s(q.priority)},
  'open',
  ${s(reviewDue(q))},
  ${jsonb({ slug: p.slug, code: q.code, details: q.details ?? null })},
  ${s(q.severity)},
  'seed_quality_gate',
  ${s(p.lastOfficialCheckedAt)}
from public.support_programs sp
left join lateral (
  select id from public.support_sources
  where support_program_id = sp.id and url = ${s(p.officialUrl)}
  order by created_at desc
  limit 1
) ss on true
where sp.slug = ${s(p.slug)}
  and not exists (
    select 1 from public.review_queue_items rq
    where rq.support_program_id = sp.id
      and rq.issue_code = ${s(q.code)}
      and rq.status = 'open'
  );`);
  }

  programBlocks.push(blk.join("\n"));
}

// ---- 出力: masters を最初に、programs を CHUNK 件ずつ別ファイルに -----------
const CHUNK = 100;
const __dirname = dirname(fileURLToPath(import.meta.url));
const seedDir = resolve(__dirname, "../supabase/seed");
mkdirSync(seedDir, { recursive: true });

const wrap = (body: string) => `begin;\n${body}\ncommit;\n`;
const written: string[] = [];

const mastersPath = resolve(seedDir, "content_seed.00_masters.generated.sql");
writeFileSync(mastersPath, wrap(lines.join("\n")), "utf8");
written.push(mastersPath);

let part = 1;
for (let i = 0; i < programBlocks.length; i += CHUNK) {
  const body = programBlocks.slice(i, i + CHUNK).join("\n\n");
  const name = `content_seed.${String(part).padStart(2, "0")}_programs.generated.sql`;
  const pth = resolve(seedDir, name);
  writeFileSync(pth, wrap(body), "utf8");
  written.push(pth);
  part++;
}

console.log(
  `生成完了（${written.length} ファイル・適用順）:\n` +
    written.map((f) => "  " + f.split("/seed/")[1]).join("\n") +
    `\n  都道府県 ${prefectures.length} / 自治体 ${municipalities.length} / カテゴリ ${categories.length} / 生活イベント ${lifeEvents.length} / 制度 ${programs.length}（全status・${CHUNK}件/チャンク） / 監査日 ${EXPORT_DATE}`,
);
