/**
 * データソース抽象（Slice A: データ基盤の堅牢化）。
 *
 * `SupportRepository` は「公開可能ゲートを通った published 制度」と各マスタを返す
 * 唯一の読み取りプリミティブ。seed と Supabase の両方がこの interface を満たす。
 *
 * 派生クエリ（フィルタ・関連制度・active 自治体・params 生成など）は
 * `app/lib/data/index.ts` の純関数が、この interface の戻り値の上で行う。
 * これにより seed → Supabase へ切り替えても、ページ・コンポーネントの呼び出し側は不変。
 *
 * 切り替えは環境変数 `DATA_SOURCE` で行う:
 *   - `seed`     … 型付き seed（既定・本番の現状）
 *   - `supabase` … Supabase 制度DB（published のみ）
 *   - `hybrid`   … Supabase published を優先し、未登録 slug は seed で補完
 */
import type { Guide } from "@/app/data/guides";
import type {
  Category,
  LifeEvent,
  Municipality,
  Prefecture,
  SupportProgram,
} from "./types";

export type DataSource = "seed" | "supabase" | "hybrid";

export interface SupportRepository {
  getPrefectures(): Promise<Prefecture[]>;
  getMunicipalities(): Promise<Municipality[]>;
  getCategories(): Promise<Category[]>;
  getLifeEvents(): Promise<LifeEvent[]>;
  getGuides(): Promise<Guide[]>;
  /** `isPublishable()` を通過した published 制度のみ（不変条件 §3）。 */
  getPublishedPrograms(): Promise<SupportProgram[]>;
}

/** `DATA_SOURCE` を安全に解決（不正値・未設定は seed）。 */
export function resolveDataSource(): DataSource {
  const v = (process.env.DATA_SOURCE ?? "").trim().toLowerCase();
  return v === "supabase" || v === "hybrid" ? v : "seed";
}

// 注意: supabaseRepository / hybridRepository は内部で Supabase クライアントを
// 「関数内で遅延生成」する（module scope で初期化しない＝技術仕様 §4.2）。
// したがって seed 既定でも余計な接続は発生しない。
import { seedRepository } from "./seedRepository";
import { hybridRepository, supabaseRepository } from "./supabaseRepository";

export function getRepository(): SupportRepository {
  switch (resolveDataSource()) {
    case "supabase":
      return supabaseRepository;
    case "hybrid":
      return hybridRepository;
    default:
      return seedRepository;
  }
}
