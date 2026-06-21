/**
 * 今セッションで追加した新規 published 制度（lastOfficialCheckedAt=2026-06-21）を
 * (自治体×カテゴリ) でグループ化し、独立敵対検証用の Workflow スクリプトを生成する。
 *   npx tsx scripts/gen-verify-workflow.ts > /tmp/asn-verify-wf.js  ではなく、直接ファイル書き出し。
 * 生成物 /tmp/asn-verify/asn-verify-wf.js を Workflow({scriptPath}) で実行する。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { programs } from "@/app/data/programs";
import { municipalities } from "@/app/data/municipalities";
import { categories } from "@/app/data/categories";

const CHECK_DATE = "2026-06-21";
const muniName = new Map(
  municipalities.map((m) => [`${m.prefectureSlug}/${m.slug}`, m.name]),
);
const catName = new Map(categories.map((c) => [c.slug, c.name]));

const isNew = (p: (typeof programs)[number]) =>
  p.status === "published" && p.lastOfficialCheckedAt === CHECK_DATE;

interface G {
  key: string;
  pref: string;
  city: string;
  cityName: string;
  category: string;
  categoryName: string;
  host: string;
  programs: { slug: string; title: string; officialUrl: string }[];
}
const groups = new Map<string, G>();
for (const p of programs) {
  if (!isNew(p)) continue;
  const cat = p.categorySlugs[0] ?? "other";
  const key = `${p.prefectureSlug}/${p.municipalitySlug}::${cat}`;
  let g = groups.get(key);
  if (!g) {
    let host = "";
    try {
      host = new URL(p.officialUrl).host;
    } catch {
      /* */
    }
    g = {
      key,
      pref: p.prefectureSlug,
      city: p.municipalitySlug,
      cityName: muniName.get(`${p.prefectureSlug}/${p.municipalitySlug}`) ?? p.municipalitySlug,
      category: cat,
      categoryName: catName.get(cat) ?? cat,
      host: host.replace(/^www\./, ""),
      programs: [],
    };
    groups.set(key, g);
  }
  g.programs.push({ slug: p.slug, title: p.title, officialUrl: p.officialUrl });
}
const GROUPS = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
const totalPrograms = GROUPS.reduce((n, g) => n + g.programs.length, 0);

const script = `export const meta = {
  name: 'asn-verify-new-seirei',
  description: '今セッション追加の政令市新規制度を、各officialUrlを独立WebFetchで再検証し scope過大/別制度/断定 を洗い出す',
  phases: [{ title: 'Verify' }],
}

const GROUPS = ${JSON.stringify(GROUPS)}

const SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          slug: { type: 'string' },
          ok: { type: 'boolean' },
          issue: { type: 'string', enum: ['none', 'scope', 'identity', 'unreachable', 'assertion'] },
          note: { type: 'string' },
          suggestedTitle: { type: 'string' },
        },
        required: ['slug', 'ok', 'issue', 'note'],
      },
    },
  },
  required: ['verdicts'],
}

function prompt(g) {
  const list = g.programs.map((p, i) => (i + 1) + '. slug=' + p.slug + ' / title=「' + p.title + '」 / officialUrl=' + p.officialUrl).join('\\n')
  return 'あなたは YMYL 公開データの敵対的検証者です。' + g.cityName + ' / ' + g.categoryName + ' の公開中の制度ページを、各 officialUrl を独立に WebFetch して内容と照合し、誤りを洗い出してください。URLの到達性は既に確認済み（全件HTTP 200）なので、focusは「ページ内容が title の制度・範囲と一致するか」です。\\n\\n# 手順\\n1. ToolSearch を query "select:WebFetch" で呼ぶ。\\n2. 各 program の officialUrl を WebFetch し、次を判定:\\n   - identity: ページがその制度（title が指す制度）の案内ページか。全く別制度ならissue=identity。\\n   - scope: title が複数種を称する（例「障害者手帳（身体・療育・精神）」）のにページが一部しか扱わない（例 身体のみ）等、範囲が過大ならissue=scope。より正確な title を suggestedTitle に。\\n   - unreachable: 404/エラー/別サイトへ飛ぶ等で到達できないならissue=unreachable。\\n   - assertion: 本文に「必ずもらえる/あなたは対象です/申請すれば必ず/受給を保証」等の断定があればissue=assertion（※ページ側ではなく当方データの懸念。基本は none でよい）。\\n   - 問題なければ ok=true, issue=none。\\n3. host が ' + g.host + ' またはその制度を所管する公的機関（社協等）であることも確認。明らかに非公式ならissue=identity。\\n4. 疑わしきは ok=false（YMYLは保守的に）。note に判定理由を簡潔に。\\n\\n# 検証対象（' + g.programs.length + '件）\\n' + list + '\\n\\n各 slug について1件ずつ verdict を返す。'
}

const results = await pipeline(
  GROUPS,
  (g) => agent(prompt(g), { label: 'verify:' + g.city + ':' + g.category, phase: 'Verify', schema: SCHEMA, agentType: 'general-purpose' })
    .then((r) => ({ key: g.key, verdicts: (r && r.verdicts) || [] })),
)

const all = []
for (const r of results.filter(Boolean)) for (const v of r.verdicts) all.push(v)
const flagged = all.filter((v) => !v.ok)
const byIssue = {}
for (const v of flagged) byIssue[v.issue] = (byIssue[v.issue] || 0) + 1
log('検証 ' + all.length + '件 / 問題 ' + flagged.length + '件 ' + JSON.stringify(byIssue))
return { checked: all.length, flagged, byIssue, groups: GROUPS.length }
`;

mkdirSync("/tmp/asn-verify", { recursive: true });
writeFileSync("/tmp/asn-verify/asn-verify-wf.js", script, "utf8");
console.log(
  JSON.stringify(
    { groups: GROUPS.length, totalPrograms, cities: new Set(GROUPS.map((g) => g.city)).size },
    null,
    2,
  ),
);
