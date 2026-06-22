"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import {
  REMINDERS_ENABLED,
  listMyReminders,
  cancelReminder,
  type Reminder,
} from "@/app/lib/reminders";
import { formatJaDate } from "@/app/lib/dates";

/** 予約中の期限通知の一覧（本人のみ・ログイン時）。
 *  メールを受け取るユーザーが自分で停止できるようにするための管理UI。
 *  送信基盤が整い NEXT_PUBLIC_REMINDERS_ENABLED=true のときだけ表示する。 */
export function RemindersPanel() {
  const [items, setItems] = useState<Reminder[] | null>(null);

  useEffect(() => {
    if (!REMINDERS_ENABLED) return;
    let active = true;
    listMyReminders()
      .then((r) => {
        if (active) setItems(r);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!REMINDERS_ENABLED) return null;
  if (!items || items.length === 0) return null;

  async function remove(id: string) {
    try {
      await cancelReminder(id);
    } catch {
      /* 失敗時はそのまま（次回読込で整合） */
    }
    setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  }

  return (
    <section className="aw-card mt-6">
      <h2 className="aw-card-heading">
        <BellRing className="h-5 w-5 text-gold" aria-hidden="true" />
        予約中の期限通知
      </h2>
      <p className="mt-2 text-[13px] leading-7 text-charcoal/70">
        設定した日に、登録メールアドレスへお知らせします。いつでも停止できます。
      </p>
      <ul className="mt-4 divide-y divide-soft-gray">
        {items.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <Link
                href={`/supports/${r.programSlug}`}
                className="text-[14px] font-medium text-navy hover:underline"
              >
                {r.programTitle ?? r.programSlug}
              </Link>
              <p className="mt-0.5 text-[12px] text-charcoal/70">
                {formatJaDate(r.reminderDate)} に通知
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(r.id)}
              className="aw-chip shrink-0"
              aria-label={`${r.programTitle ?? "この制度"}の通知を停止`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              停止
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
