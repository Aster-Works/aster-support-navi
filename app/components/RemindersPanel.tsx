"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import {
  REMINDERS_ENABLED,
  listMyReminders,
  cancelReminder,
  rescheduleReminder,
  isSignedIn,
  type Reminder,
} from "@/app/lib/reminders";

/** 予約中の期限通知の管理（本人のみ・ログイン時）。
 *  メールを受け取るユーザーが自分で「停止」「日付の変更」をできるようにする。
 *  送信基盤が整い NEXT_PUBLIC_REMINDERS_ENABLED=true のときだけ表示する。 */
export function RemindersPanel() {
  const [state, setState] = useState<"loading" | "anon" | "ready">("loading");
  const [items, setItems] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!REMINDERS_ENABLED) return;
    let active = true;
    (async () => {
      if (!(await isSignedIn())) {
        if (active) setState("anon");
        return;
      }
      const r = await listMyReminders().catch(() => []);
      if (!active) return;
      setItems(r);
      setState("ready");
    })();
    return () => {
      active = false;
    };
  }, []);

  // 未ログイン時は出さない（/saved の同期パネルがログインを促す）。
  if (!REMINDERS_ENABLED || state !== "ready") return null;

  async function remove(id: string) {
    try {
      await cancelReminder(id);
    } catch {
      /* 失敗時は次回読込で整合 */
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function applyDate(id: string, date: string) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, reminderDate: date } : x)),
    );
  }

  return (
    <section className="aw-card mt-6">
      <h2 className="aw-card-heading">
        <BellRing className="h-5 w-5 text-gold" aria-hidden="true" />
        予約中の期限通知
      </h2>
      <p className="mt-2 text-[13px] leading-7 text-charcoal/70">
        設定した日に、登録メールアドレスへお知らせします。日付の変更・停止はここから行えます。
      </p>

      {items.length === 0 ? (
        <p className="mt-4 text-[13px] leading-7 text-charcoal/70">
          予約中の通知はありません。各制度の詳細ページの「申請期限をメールで通知」から設定できます。
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              onRemove={() => remove(r.id)}
              onRescheduled={(date) => applyDate(r.id, date)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ReminderRow({
  reminder,
  onRemove,
  onRescheduled,
}: {
  reminder: Reminder;
  onRemove: () => void;
  onRescheduled: (date: string) => void;
}) {
  const [date, setDate] = useState(reminder.reminderDate);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (!date || date === reminder.reminderDate) return;
    setBusy(true);
    setMsg(null);
    try {
      await rescheduleReminder(reminder.id, date);
      onRescheduled(date);
      setMsg("変更しました");
    } catch {
      setMsg("変更できませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-soft-gray p-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/supports/${reminder.programSlug}`}
          className="text-[14px] font-medium text-fg hover:underline"
        >
          {reminder.programTitle ?? reminder.programSlug}
        </Link>
        <button
          type="button"
          onClick={onRemove}
          className="aw-chip shrink-0"
          aria-label={`${reminder.programTitle ?? "この制度"}の通知を停止`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          停止
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <label htmlFor={`reminder-date-${reminder.id}`} className="sr-only">
          通知日
        </label>
        <input
          id={`reminder-date-${reminder.id}`}
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMsg(null);
          }}
          className="aw-input max-w-[180px]"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy || !date || date === reminder.reminderDate}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          変更
        </button>
        {msg && <span className="text-[12px] text-charcoal/70">{msg}</span>}
      </div>
    </li>
  );
}
