"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, LogIn, Loader2, Lock } from "lucide-react";
import { getSupabase } from "@/app/lib/supabase";
import { checkIsAdmin } from "@/app/lib/admin/client";

type Gate = "loading" | "anon" | "denied" | "ok";

/** /admin 配下を「ログイン済みかつ管理者」だけに見せるクライアントガード。
 *  最終的な認可境界は DB の RLS（private.is_admin）。これは体験のためのガード。 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [gate, setGate] = useState<Gate>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // setState は必ず .then コールバック内で行う（effect 内の同期 setState を避ける）。
  const evaluate = useCallback(() => {
    const sb = supabase;
    if (!sb) return Promise.resolve<Gate>("denied").then(setGate);
    return sb.auth
      .getSession()
      .then(async ({ data }): Promise<Gate> => {
        if (!data.session) return "anon";
        return (await checkIsAdmin()) ? "ok" : "denied";
      })
      .then(setGate);
  }, [supabase]);

  useEffect(() => {
    void evaluate();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => void evaluate());
    return () => data.subscription.unsubscribe();
  }, [supabase, evaluate]);

  const onSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;
      setBusy(true);
      setError(null);
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (err) setError(err.message);
      // 成功時は onAuthStateChange → evaluate が走る。
    },
    [supabase, email, password],
  );

  if (gate === "ok") return <>{children}</>;

  if (gate === "loading") {
    return (
      <div className="aw-container flex items-center gap-2 py-20 text-sm text-charcoal/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        確認しています…
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="aw-container py-20">
        <div className="aw-card max-w-md p-6">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-navy">
            管理者権限がありません
          </h1>
          <p className="mt-2 text-sm text-charcoal/70">
            {supabase
              ? "このアカウントには管理画面へのアクセス権がありません。管理者にお問い合わせください。"
              : "管理画面を使うには Supabase の設定が必要です。"}
          </p>
        </div>
      </div>
    );
  }

  // anon: ログインフォーム
  return (
    <div className="aw-container py-20">
      <form onSubmit={onSignIn} className="aw-card max-w-md space-y-4 p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aster-soft text-aster">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-navy">管理画面ログイン</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            運用担当者向けです。一般の方は利用しません。
          </p>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">メールアドレス</span>
          <input
            type="email"
            required
            autoComplete="username"
            className="aw-input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">パスワード</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="aw-input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogIn className="h-4 w-4" aria-hidden="true" />
          )}
          ログイン
        </button>
      </form>
    </div>
  );
}
