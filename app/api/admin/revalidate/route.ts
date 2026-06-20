/**
 * 管理者が制度を編集・公開したとき、影響する公開ページを即時 revalidate する。
 *
 * 認可: ブラウザの管理者セッションの access_token を Bearer で受け取り、
 * その JWT で app_roles を self-read（RLS）して admin か検証する。service_role は使わない。
 *
 * これにより、管理画面の保存・公開後に「再デプロイ無し」で公開ページへ反映される
 * （各ページは revalidate=86400 の ISR。ここで revalidatePath すると次のリクエストで再生成）。
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return Response.json({ error: "supabase not configured" }, { status: 503 });
  }

  const token = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) {
    return Response.json({ error: "missing token" }, { status: 401 });
  }

  // ユーザーの JWT でクライアントを作り、本人の admin ロールを RLS 経由で確認。
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: roles, error } = await sb
    .from("app_roles")
    .select("role")
    .eq("role", "admin")
    .limit(1);
  if (error || !roles || roles.length === 0) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { paths?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const paths = Array.isArray(body.paths)
    ? body.paths
        .filter((p): p is string => typeof p === "string" && p.startsWith("/"))
        .slice(0, 100)
    : [];

  for (const p of paths) revalidatePath(p);

  return Response.json({ revalidated: paths.length, paths });
}
