/**
 * 期限リマインド（本人のみ・機微情報なし）。
 * UI は NEXT_PUBLIC_REMINDERS_ENABLED が true のときだけ出す
 * （送信基盤 Resend が未設定の間は「送れない通知を約束しない」ため隠す）。
 */
import { getSupabase } from "@/app/lib/supabase";

/** UI を出してよいか（送信基盤が整い、明示的に有効化したとき true）。 */
export const REMINDERS_ENABLED =
  process.env.NEXT_PUBLIC_REMINDERS_ENABLED === "true";

export interface Reminder {
  id: string;
  programSlug: string;
  programTitle?: string | null;
  reminderDate: string;
  status: string;
}

export async function setReminder(
  programSlug: string,
  programTitle: string,
  reminderDate: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("クラウド同期は未設定です");
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("ログインが必要です");
  const { error } = await sb.from("reminders").upsert(
    {
      user_id: auth.user.id,
      program_slug: programSlug,
      program_title: programTitle,
      reminder_date: reminderDate,
      status: "scheduled",
    },
    { onConflict: "user_id,program_slug,reminder_date" },
  );
  if (error) throw new Error(error.message);
}

export async function listMyReminders(): Promise<Reminder[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await sb
    .from("reminders")
    .select("id, program_slug, program_title, reminder_date, status")
    .eq("user_id", auth.user.id)
    .eq("status", "scheduled")
    .order("reminder_date");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    programSlug: r.program_slug,
    programTitle: r.program_title,
    reminderDate: r.reminder_date,
    status: r.status,
  }));
}

export async function cancelReminder(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("reminders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** 通知日を変更する（本人のみ・RLS）。status は scheduled に戻して再送対象にする。 */
export async function rescheduleReminder(
  id: string,
  reminderDate: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("クラウド同期は未設定です");
  const { error } = await sb
    .from("reminders")
    .update({ reminder_date: reminderDate, status: "scheduled" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** ログイン中かどうか（管理UIの表示判定用）。 */
export async function isSignedIn(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb.auth.getUser();
  return !!data.user;
}
