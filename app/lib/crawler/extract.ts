/**
 * AI 抽出（プロバイダ非依存インターフェース + Claude 実装）。
 *
 * 制約（プロンプト + 後処理で多層に守る）:
 * - 本文に書かれていないことを推測しない。不明は null。
 * - 必ず source_quote を付ける。支援制度ページでなければ空配列。
 * - 「対象です」と断定しない（断定表現は FORBIDDEN_PHRASES でフラグ）。
 * - 金額/対象/期限/申請/問い合わせ先が本文から取れない項目は confidence を下げる。
 *
 * 出力は forced tool（structured output）で受け、zod で検証する。
 * ANTHROPIC_API_KEY 未設定なら抽出器は生成されず、cron 側は AI をスキップする。
 */
import Anthropic from "@anthropic-ai/sdk";
import { findForbiddenPhrases } from "@/app/lib/copy";
import {
  EXTRACTION_TOOL_SCHEMA,
  ExtractionResultSchema,
  type ExtractedProgram,
} from "./types";

export const EXTRACTION_MODEL = "claude-haiku-4-5";
const MAX_INPUT_CHARS = 12_000;

export interface ExtractContext {
  municipalityName: string | null;
  prefecture: string | null;
  pageUrl: string;
  pageTitle: string | null;
  categoryHints: string[];
}

/** 抽出器のポート（テストではフェイクを差す）。 */
export interface AiExtractor {
  extract(text: string, ctx: ExtractContext): Promise<ExtractedProgram[]>;
}

const SYSTEM_PROMPT = `あなたは日本の自治体公式ページから「住民向けの支援制度（給付・助成・減免・現物支給・サービス・相談窓口）」を抽出する正確なアシスタントです。
厳守事項:
- 本文に明記されていることだけを抽出する。推測・補完・一般常識での穴埋めをしない。
- 不明な項目は必ず null にする（空文字ではなく null）。
- 各制度に、根拠となる本文の短い引用 source_quote を必ず付ける。
- 支援制度の説明ではないページ（お知らせ一覧・組織案内・トップページ等）は programs を空配列にする。
- 「対象です」「必ずもらえます」などの断定表現は使わない。事実のみを写し取る。
- 金額・対象者・期限・申請方法・問い合わせ先のうち本文から根拠が取れない項目は confidence を下げ、
  該当する risk_flags（amount_uncertain / deadline_uncertain / eligibility_uncertain など）を立てる。
- 医療・法律・税務の助言を生成しない。`;

export function buildUserPrompt(text: string, ctx: ExtractContext): string {
  const clipped = text.slice(0, MAX_INPUT_CHARS);
  return `自治体: ${ctx.prefecture ?? "不明"} ${ctx.municipalityName ?? "不明"}
ページタイトル: ${ctx.pageTitle ?? "（なし）"}
公式URL: ${ctx.pageUrl}
カテゴリヒント: ${ctx.categoryHints.join(", ") || "（なし）"}

--- ページ本文（ここから抽出。書かれていないことは抽出しない） ---
${clipped}
--- 本文ここまで ---

このページに住民向けの支援制度が説明されていれば抽出し、無ければ programs を空配列にしてください。
official_url は原則このページのURL（${ctx.pageUrl}）にしてください。`;
}

/**
 * 抽出結果の後処理（安全ガード）:
 * - 断定/誇大表現が混ざれば risk_flag を立て confidence を下げる。
 * - official_url が空ならページURLで補う。
 * - confidence を 0..1 にクランプ。
 */
export function postProcess(
  programs: ExtractedProgram[],
  ctx: ExtractContext,
): ExtractedProgram[] {
  return programs.map((p) => {
    const flags = new Set(p.risk_flags ?? []);
    const joined = [
      p.title,
      p.summary,
      p.target_people,
      p.eligibility_conditions,
      p.benefit_detail,
      p.amount,
      p.application_method,
      p.required_documents,
      p.deadline,
    ]
      .filter((v): v is string => Boolean(v))
      .join(" \n ");
    const forbidden = findForbiddenPhrases(joined);
    let confidence = clamp01(p.confidence);
    if (forbidden.length > 0) {
      flags.add("assertive_language");
      confidence = Math.min(confidence, 0.4);
    }
    if (!p.source_quote || p.source_quote.trim().length < 8) {
      flags.add("weak_evidence");
      confidence = Math.min(confidence, 0.5);
    }
    const official = p.official_url && /^https?:\/\//i.test(p.official_url)
      ? p.official_url
      : ctx.pageUrl;
    return { ...p, official_url: official, confidence, risk_flags: [...flags] };
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.3;
  return Math.max(0, Math.min(1, n));
}

/** Claude 実装。ANTHROPIC_API_KEY が無ければ null を返す。 */
export function createAnthropicExtractor(
  apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
  model: string = EXTRACTION_MODEL,
): AiExtractor | null {
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return {
    async extract(text, ctx) {
      if (text.trim().length < 80) return [];
      const res = await client.messages.create({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tool_choice: { type: "tool", name: "record_support_programs" },
        tools: [
          {
            name: "record_support_programs",
            description:
              "ページ本文から抽出した支援制度を記録する。無ければ programs を空配列にする。",
            input_schema: EXTRACTION_TOOL_SCHEMA as unknown as Anthropic.Tool.InputSchema,
          },
        ],
        messages: [{ role: "user", content: buildUserPrompt(text, ctx) }],
      });
      const block = res.content.find((b) => b.type === "tool_use");
      if (!block || block.type !== "tool_use") return [];
      const parsed = ExtractionResultSchema.safeParse(block.input);
      if (!parsed.success) return [];
      return postProcess(parsed.data.programs, ctx);
    },
  };
}
