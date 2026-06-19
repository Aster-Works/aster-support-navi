"use client";

import { useState } from "react";
import { Cloud, ShieldCheck, Mail, LogOut } from "lucide-react";
import { useSavedSync } from "@/app/components/SavedSyncProvider";

/** /saved 上部の「複数端末で同期」案内＋マジックリンク・ログイン。 */
export function SavedCloudPanel() {
  const { status, email, enabled, signIn, signOut } = useSavedSync();
  const [addr, setAddr] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // クラウド同期未設定（env なし）のときは出さない。
  if (!enabled || status === "loading") return null;

  if (status === "signedin") {
    return (
      <div className="aw-card mt-6 flex flex-wrap items-center justify-between gap-3 bg-aster-soft/40">
        <p className="inline-flex items-center gap-2 text-[14px] text-navy">
          <ShieldCheck className="h-4 w-4 text-ok" aria-hidden="true" />
          <span className="font-bold">{email}</span> で同期中（複数の端末で見返せます）
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          ログアウト
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await signIn(addr);
    setBusy(false);
    if (res.ok) setSent(true);
    else setErr(res.error ?? "送信に失敗しました");
  }

  return (
    <div className="aw-card mt-6 bg-aster-soft/40">
      <p className="inline-flex items-center gap-2 text-[15px] font-bold text-navy">
        <Cloud className="h-5 w-5 text-aster" aria-hidden="true" />
        複数の端末で保存リストを同期する（任意）
      </p>
      <p className="mt-2 text-[13px] leading-7 text-charcoal">
        メールアドレスを入力すると確認リンクをお送りします（パスワード不要）。リンクを開くとログインでき、保存した制度をスマホ・パソコンで共有できます。
        <br />
        保存されるのは<strong>制度の情報（制度名・自治体・概要）だけ</strong>です。かんたん診断の入力内容・収入・健康などの情報は保存しません。
      </p>
      {sent ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[14px] text-navy">
          <Mail className="h-4 w-4 text-aster" aria-hidden="true" />
          確認メールを送りました。メール内のリンクを開いてください。
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="cloud-email">
            メールアドレス
          </label>
          <input
            id="cloud-email"
            type="email"
            required
            autoComplete="email"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="you@example.com"
            className="aw-input min-w-0 flex-1"
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            {busy ? "送信中…" : "確認リンクを送る"}
          </button>
        </form>
      )}
      {err && (
        <p role="alert" className="mt-2 text-[13px] text-[#b4232a]">
          {err}
        </p>
      )}
    </div>
  );
}
