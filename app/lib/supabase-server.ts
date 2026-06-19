/**
 * サーバー専用 Supabase クライアント（"use client" を付けない＝ブラウザに出さない）。
 *
 * 公開制度の読み取りは anon(publishable) キー + RLS（published のみ select 可）で十分。
 * service_role はここでは使わない。管理画面（Slice B）で必要になった時点で別ファイルに分離する。
 *
 * 技術仕様 §4.2: クライアントは module scope で初期化せず、呼び出しのたびに関数内で生成する。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Supabase の env が両方そろっているか。 */
export function isServerSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * 公開データ読み取り用のサーバークライアント。
 * env 未設定なら null（呼び出し側は seed へフォールバックする）。
 * セッションは持たない（公開読み取りのみ）。
 */
export function getServerReadClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
