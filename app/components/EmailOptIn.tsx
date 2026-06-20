"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { getEmailOptIn, setEmailOptIn } from "@/app/lib/profile";
import { track } from "@/app/lib/track";

/** ログイン済みユーザー向けのメール登録 opt-in。
 *  実際の配信（期限リマインド等）は送信基盤の用意後に実装する（準備中の意思表明）。 */
export function EmailOptIn() {
  const [optIn, setOptInState] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getEmailOptIn()
      .then((v) => setOptInState(v))
      .catch(() => setOptInState(false));
  }, []);

  if (optIn === null) return null;

  async function toggle() {
    const next = !optIn;
    setBusy(true);
    try {
      await setEmailOptIn(next);
      setOptInState(next);
      if (next) track("email_signup_submitted");
    } catch {
      /* 失敗時は状態を変えない */
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="mt-3 flex w-full cursor-pointer items-start gap-2.5 text-[13px] leading-7 text-charcoal">
      <input
        type="checkbox"
        checked={optIn}
        onChange={toggle}
        disabled={busy}
        className="mt-1.5 h-4 w-4 shrink-0 rounded border-soft-gray accent-navy"
      />
      <span className="inline-flex items-center gap-1.5">
        <Mail className="h-4 w-4 text-aster" aria-hidden="true" />
        更新・新機能（期限リマインド等）のお知らせをメールで受け取る
        <span className="text-charcoal/60">（準備中）</span>
      </span>
    </label>
  );
}
