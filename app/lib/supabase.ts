"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase の env が両方そろっているか（未設定なら保存リストのクラウド同期はオフ）。 */
export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * ブラウザ用 Supabase クライアント。
 * env 未設定／サーバー側では null を返し、呼び出し側は localStorage のみで動作する（グレースフル）。
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (typeof window === "undefined") return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
