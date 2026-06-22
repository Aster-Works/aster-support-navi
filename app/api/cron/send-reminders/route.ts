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
import { createRateLimiter } from "@/app/lib/rate-limit";

const rateLimiter = createRateLimiter({ interval: 300_000, maxTokens: 1 });

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

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

  if (!rateLimiter.check("cron-send-reminders")) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // 「今日」は日本時間で判定する（cron は 23:00 UTC＝08:00 JST 起動。UTC日付だと
  // JST基準で設定された reminder_date が1日遅れるため）。
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());

  const { data: due, error } = await sb
    .from("reminders")
    .select("id, user_id, program_slug, program_title, reminder_date")
    .eq("status", "scheduled")
    .lte("reminder_date", today)
    .limit(200);
  if (error) {
    console.error("Cron Database Error:", error.message);
    return Response.json({ error: "internal error" }, { status: 500 });
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
    const manageUrl = absoluteUrl(`/saved`);
    const title = r.program_title ?? "支援制度";
    const safeTitle = escapeHtml(title);
    const text = [
      `${title} の申請期限が近づいています。`,
      ``,
      `対象可否・金額・期限・必要書類は、必ず自治体の公式ページで確認してください。`,
      ``,
      `詳細: ${programUrl}`,
      ``,
      `このメールは保存リストの期限通知です。通知の停止・変更は ${manageUrl} から行えます。`,
      `Aster Support Navi`,
    ].join("\n");
    const safeUrl = encodeURI(programUrl);
    const safeManageUrl = encodeURI(manageUrl);
    
    if (!safeUrl.startsWith("http") || !safeManageUrl.startsWith("http")) {
      failed.push(r.id);
      continue;
    }

    const html = `
      <p>${safeTitle} の申請期限が近づいています。</p>
      <p>対象可否・金額・期限・必要書類は、必ず自治体の公式ページで確認してください。</p>
      <p><a href="${safeUrl}">${safeTitle} の詳細を確認する</a></p>
      <p style="color:#888;font-size:12px">このメールは保存リストの期限通知です。<a href="${safeManageUrl}">通知の停止・変更</a>はこちらから。<br/>Aster Support Navi</p>
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
        text,
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
