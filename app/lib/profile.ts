/**
 * ログイン済みユーザーの最小プロフィール（メール登録の opt-in）。
 * 機微情報は保存しない。RLS で本人のみ read/write。
 */
import { getSupabase } from "@/app/lib/supabase";

export async function getEmailOptIn(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return false;
  const { data } = await sb
    .from("profiles")
    .select("email_opt_in")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return Boolean(data?.email_opt_in);
}

export async function setEmailOptIn(value: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("クラウド同期は未設定です");
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { error } = await sb
    .from("profiles")
    .upsert(
      { user_id: auth.user.id, email_opt_in: value },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(error.message);
}
