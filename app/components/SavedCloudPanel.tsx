"use client";

import { useState } from "react";
import { Cloud, ShieldCheck, LogIn, LogOut } from "lucide-react";
import { useSavedSync } from "@/app/components/SavedSyncProvider";

/** /saved 上部の「複数端末で同期」案内＋メール（ID）＋パスワードのログイン/新規登録。 */
export function SavedCloudPanel() {
  const { status, email, enabled, signIn, signUp, signOut } = useSavedSync();
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
      <div className="aw-card mt-6 flex flex-wrap items-center justify-between gap-3 bg-aster-soft/40">
        <p className="inline-flex items-center gap-2 text-[14px] text-navy">
          <ShieldCheck className="h-4 w-4 text-ok" aria-hidden="true" />
          <span className="font-bold">{email}</span> で同期中（複数の端末で見返せます）
        </p>
        <button type="button" className="btn-secondary" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          ログアウト
        </button>
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
      <p className="inline-flex items-center gap-2 text-[15px] font-bold text-navy">
        <Cloud className="h-5 w-5 text-aster" aria-hidden="true" />
        複数の端末で保存リストを同期する（任意）
      </p>
      <p className="mt-2 text-[13px] leading-7 text-charcoal">
        メールアドレス（ID）とパスワードで{mode === "signin" ? "ログイン" : "登録"}すると、保存した制度をスマホ・パソコンで共有できます。
        <br />
        保存されるのは<strong>制度の情報（制度名・自治体・概要）だけ</strong>です。かんたん診断の入力内容・収入・健康などの情報は保存しません。
      </p>

      <div className="mt-4 inline-flex rounded-xl bg-white p-1 text-[13px]">
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
