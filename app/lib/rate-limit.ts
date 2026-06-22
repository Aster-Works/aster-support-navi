/**
 * インメモリ Token Bucket レートリミッター（Serverless 向け軽量版）。
 *
 * Vercel Serverless は関数インスタンスが短命だが、ウォームインスタンス内では
 * 同じモジュールスコープが再利用されるため、連続攻撃に対して一定の効果がある。
 *
 * 本格運用（複数インスタンスにまたがる制限）には Upstash Rate Limit
 * (@upstash/ratelimit + @upstash/redis) へ差し替える。この関数のインターフェースは
 * そのまま維持できるよう設計している。
 *
 * 使い方:
 * ```ts
 * const limiter = createRateLimiter({ interval: 60_000, maxTokens: 10 });
 * if (!limiter.check("api-key-or-ip")) {
 *   return Response.json({ error: "too many requests" }, { status: 429 });
 * }
 * ```
 */

export interface RateLimiterOptions {
  /** トークン補充間隔（ミリ秒）。この間隔で maxTokens まで回復する。 */
  interval: number;
  /** バケットの最大トークン数。interval ごとにこの値にリセット。 */
  maxTokens: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimiter {
  /** true = 許可、false = レート超過。呼び出しごとにトークンを1消費する。 */
  check(key: string): boolean;
}

/**
 * レートリミッターを作成する。
 * key ごとに独立したバケットを持つ。古いバケットは自動で掃除される。
 */
export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();
  // メモリリーク防止: 古いバケットを定期的に掃除（最大1000エントリ）。
  const MAX_BUCKETS = 1000;

  function refill(bucket: Bucket, now: number): void {
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= opts.interval) {
      bucket.tokens = opts.maxTokens;
      bucket.lastRefill = now;
    }
  }

  function cleanup(): void {
    if (buckets.size <= MAX_BUCKETS) return;
    // 最も古い半分を削除。
    const entries = [...buckets.entries()].sort(
      (a, b) => a[1].lastRefill - b[1].lastRefill,
    );
    const removeCount = Math.floor(entries.length / 2);
    for (let i = 0; i < removeCount; i++) {
      buckets.delete(entries[i][0]);
    }
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tokens: opts.maxTokens, lastRefill: now };
        buckets.set(key, bucket);
        cleanup();
      }
      refill(bucket, now);
      if (bucket.tokens > 0) {
        bucket.tokens -= 1;
        return true;
      }
      return false;
    },
  };
}
