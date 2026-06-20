/**
 * 期限リマインドの送信（Vercel Cron から日次起動）。
 *
 * env が揃うまで安全に no-op する（送信基盤が無ければ何もしない）:
 *   - CRON_SECRET            … Vercel Cron の Authorization 検証
 *   - SUPABASE_SERVICE_ROLE_KEY … reminders/ユーザーemail を RLS バイパスで読む（server-only 秘密）
 *   - RESEND_API_KEY / REMINDER_FROM_EMAIL … 送信
 *
 * 安全策（stale safety）: 対象制度が published で無くなっていたら送らずに canceled にする。
 * 機微情報は送らない（制度名・公式ページ確認の案内のみ）。
 */
import { createClient } from "@supabase/supabase-js";
import { absoluteUrl } from "@/app/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;
  // 送信基盤が未設定 → 安全に何もしない（認証不要・送信もしない）。
  if (!url || !serviceKey || !resendKey || !from) {
    return Response.json({ skipped: "reminder delivery not configured" });
  }

  // 送信できる構成のときは必ず CRON_SECRET を要求する（無認証送信を防ぐ）。
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error } = await sb
    .from("reminders")
    .select("id, user_id, program_slug, program_title, reminder_date")
    .eq("status", "scheduled")
    .lte("reminder_date", today)
    .limit(200);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let canceled = 0;
  const failed: string[] = [];

  for (const r of due ?? []) {
    // stale safety: 制度が published で無ければ送らず canceled。
    const { data: prog } = await sb
      .from("support_programs")
      .select("slug")
      .eq("slug", r.program_slug)
      .eq("status", "published")
      .maybeSingle();
    if (!prog) {
      await sb
        .from("reminders")
        .update({ status: "canceled" })
        .eq("id", r.id);
      canceled++;
      continue;
    }

    const { data: userRes } = await sb.auth.admin.getUserById(r.user_id);
    const email = userRes?.user?.email;
    if (!email) {
      failed.push(r.id);
      continue;
    }

    const programUrl = absoluteUrl(`/supports/${r.program_slug}`);
    const title = r.program_title ?? "支援制度";
    const html = `
      <p>${title} の申請期限が近づいています。</p>
      <p>対象可否・金額・期限・必要書類は、必ず自治体の公式ページで確認してください。</p>
      <p><a href="${programUrl}">${title} の詳細を確認する</a></p>
      <p style="color:#888;font-size:12px">Aster Support Navi（このメールは保存リストからの期限通知です）</p>
    `;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `【期限のお知らせ】${title}`,
        html,
      }),
    });
    if (res.ok) {
      await sb
        .from("reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    } else {
      failed.push(r.id);
    }
  }

  return Response.json({ sent, canceled, failed: failed.length });
}
