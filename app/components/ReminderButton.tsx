"use client";

import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { REMINDERS_ENABLED, setReminder } from "@/app/lib/reminders";

/** 期限リマインドの設定（ログイン要・本人のみ保存）。
 *  送信基盤が整い NEXT_PUBLIC_REMINDERS_ENABLED=true のときだけ表示する。 */
export function ReminderButton({
  programSlug,
  programTitle,
}: {
  programSlug: string;
  programTitle: string;
}) {
  const [date, setDate] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!REMINDERS_ENABLED) return null;

  async function save() {
    if (!date) return;
    setBusy(true);
    setError(null);
    try {
      await setReminder(programSlug, programTitle, date);
      setDone(true);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-soft-gray p-3">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-navy">
        <BellRing className="h-4 w-4 text-gold" aria-hidden="true" />
        申請期限をメールで通知
      </p>
      {done ? (
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-green-700">
          <Check className="h-4 w-4" aria-hidden="true" />
          {date} に通知を予約しました。
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="aw-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="通知日"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy || !date}
            className="btn-secondary"
          >
            通知を予約
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
