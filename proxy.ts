import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin および /api/admin へのアクセスを保護
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // 開発環境や検証時に Supabase URL が設定されていない場合は、管理画面自体を利用不可にする
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // クライアントからのリクエストに含まれる Supabase Auth Cookie を確認
    // sb-*-auth-token という名前の cookie がセッションを保持している
    const hasSessionCookie = req.cookies.getAll().some((cookie) =>
      cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
    );

    // APIルートへの未認証アクセスは 401 Unauthorized を返す
    if (!hasSessionCookie && pathname.startsWith("/api/admin")) {
      // /api/admin/revalidate は Authorization ヘッダ(Bearer)でトークンを受け取る運用のため
      // Authorizationヘッダがあれば許可する（実際の検証は Route Handler 内で行われる）
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
         return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    } 
    // 画面への未認証アクセスはトップページにリダイレクトするか、
    // ここで通して AdminGate にログインフォームを出させるか。
    // RLSが最終境界であり、非管理者にコードバンドルが渡るのを防ぐのが目的なので、
    // セッションクッキーがない場合は 403 ではなく AdminGate（ログイン画面）は見せる必要がある。
    // ※ ログインしていないと AdminGate が表示されないとログインできない。
    // しかし、今回は「非管理者に管理画面のコードを見せない」目的もある。
    // 運用上、管理画面へのログインは別ルートや、ここを通さずに Supabase のログイン画面を使う
    // のであればブロックできるが、現状 AdminGate にログインUIがある。
    //
    // もし AdminGate にログインUIがあるなら、未ログイン（hasSessionCookie === false）時は
    // 通過させる必要がある。ただし「ログイン済みだがAdminではない」場合はブロックしたい。
    // MiddlewareでJWTのペイロードをデコードして roles を見ることは Supabase の構成次第。
    // ここでは簡易的に「ログインクッキーがあるか」だけを見て、ない場合は通す（ログイン画面を表示）。
    // もし完全に分離したい場合はログイン画面を /login など別パスに分けるべき。
    //
    // 今回はログインフォームが AdminGate にあるため、Middleware での完全ブロックは難しい。
    // 少なくとも /api/admin の一部は保護する。
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
