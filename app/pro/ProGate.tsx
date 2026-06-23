"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, LogIn, Loader2 } from "lucide-react";
import { getSupabase } from "@/app/lib/supabase";

type Gate = "loading" | "anon" | "ok";

/** /pro 配下を「ログイン済み」だけに見せるゲート（管理者権限は不要）。
 *  認可の最終境界は DB の RLS（組織メンバーのみ自組織データを read/write）。 */
export function ProGate({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase();
  const [gate, setGate] = useState<Gate>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const evaluate = useCallback(() => {
    const sb = supabase;
    if (!sb) return Promise.resolve<Gate>("anon").then(setGate);
    return sb.auth
      .getSession()
      .then(({ data }): Gate => (data.session ? "ok" : "anon"))
      .then(setGate);
  }, [supabase]);

  useEffect(() => {
    void evaluate();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => void evaluate());
    return () => data.subscription.unsubscribe();
  }, [supabase, evaluate]);

  const onGoogle = useCallback(() => {
    if (!supabase) return;
    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/pro/dashboard` },
    });
  }, [supabase]);

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

  return (
    <div className="aw-container py-16">
      <form onSubmit={onSignIn} className="aw-card max-w-md space-y-4 p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aster-soft text-aster">
          <Briefcase className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-fg">
            Pro（相談支援現場向け）
          </h1>
          <p className="mt-1 text-sm text-charcoal/70">
            支援団体・相談員の方向けです。ログインして組織と相談パックを使えます。
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
        <div className="flex items-center gap-3 text-xs text-charcoal/40">
          <span className="h-px flex-1 bg-soft-gray" />
          または
          <span className="h-px flex-1 bg-soft-gray" />
        </div>
        <button
          type="button"
          onClick={onGoogle}
          className="btn-secondary w-full justify-center"
        >
          <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Google アカウントでログイン
        </button>
      </form>
    </div>
  );
}
