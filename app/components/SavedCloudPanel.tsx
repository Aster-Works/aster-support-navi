"use client";

import { useState } from "react";
import { Cloud, ShieldCheck, LogIn, LogOut } from "lucide-react";
import { useSavedSync } from "@/app/components/SavedSyncProvider";
import { EmailOptIn } from "@/app/components/EmailOptIn";

/** /saved 上部の「複数端末で同期」案内＋メール（ID）＋パスワードのログイン/新規登録。 */
export function SavedCloudPanel() {
  const { status, email, enabled, signIn, signUp, signInWithGoogle, signOut } =
    useSavedSync();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [addr, setAddr] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // クラウド同期未設定（env なし）／読込中は出さない。
  if (!enabled || status === "loading") return null;

  if (status === "signedin") {
    return (
      <div className="aw-card mt-6 bg-aster-soft/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-[14px] text-fg">
            <ShieldCheck className="h-4 w-4 text-ok" aria-hidden="true" />
            <span className="font-bold">{email}</span> で同期中（複数の端末で見返せます）
          </p>
          <button type="button" className="btn-secondary" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            ログアウト
          </button>
        </div>
        <EmailOptIn />
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    const res =
      mode === "signin" ? await signIn(addr, pw) : await signUp(addr, pw);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "うまくいきませんでした");
      return;
    }
    if (mode === "signup" && "needsConfirm" in res && res.needsConfirm) {
      setInfo("確認メールを送りました。メール内のリンクを開いて登録を完了してください。");
    }
    // 成功時（即ログイン）は onAuthStateChange が状態を更新します。
  }

  return (
    <div className="aw-card mt-6 bg-aster-soft/40">
      <p className="inline-flex items-center gap-2 text-[15px] font-bold text-fg">
        <Cloud className="h-5 w-5 text-aster" aria-hidden="true" />
        複数の端末で保存リストを同期する（任意）
      </p>
      <p className="mt-2 text-[13px] leading-7 text-charcoal">
        メールアドレス（ID）とパスワードで{mode === "signin" ? "ログイン" : "登録"}すると、保存した制度をスマホ・パソコンで共有できます。
        <br />
        保存されるのは<strong>制度の情報（制度名・自治体・概要）だけ</strong>です。かんたん診断の入力内容・収入・健康などの情報は保存しません。
      </p>

      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="btn-secondary mt-4 w-full justify-center sm:w-auto"
      >
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Google アカウントでログイン
      </button>

      <div className="mt-3 flex items-center gap-3 text-[12px] text-charcoal/75">
        <span className="h-px flex-1 bg-charcoal/20" />
        または メール（ID）とパスワード
        <span className="h-px flex-1 bg-charcoal/20" />
      </div>

      <div className="mt-3 inline-flex rounded-xl bg-surface p-1 text-[13px]">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setErr(null);
            setInfo(null);
          }}
          aria-pressed={mode === "signin"}
          className={`rounded-lg px-3 py-1.5 ${mode === "signin" ? "bg-navy text-white" : "text-charcoal"}`}
        >
          ログイン
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setErr(null);
            setInfo(null);
          }}
          aria-pressed={mode === "signup"}
          className={`rounded-lg px-3 py-1.5 ${mode === "signup" ? "bg-navy text-white" : "text-charcoal"}`}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:max-w-md">
        <label className="sr-only" htmlFor="cloud-email">
          メールアドレス（ID）
        </label>
        <input
          id="cloud-email"
          type="email"
          required
          autoComplete="email"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="メールアドレス（ID）"
          className="aw-input"
        />
        <label className="sr-only" htmlFor="cloud-pw">
          パスワード
        </label>
        <input
          id="cloud-pw"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={mode === "signin" ? "パスワード" : "パスワード（8文字以上）"}
          className="aw-input"
        />
        <button type="submit" className="btn-primary" disabled={busy}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {busy ? "処理中…" : mode === "signin" ? "ログイン" : "登録してログイン"}
        </button>
      </form>

      {info && (
        <p role="status" className="mt-2 text-[13px] text-ok">
          {info}
        </p>
      )}
      {err && (
        <p role="alert" className="mt-2 text-[13px] text-[#b4232a]">
          {err}
        </p>
      )}
    </div>
  );
}
