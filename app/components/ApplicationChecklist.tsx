"use client";

import { useEffect, useState } from "react";
import { Printer, Copy, Check, ListChecks } from "lucide-react";
import type { SupportProgram } from "@/app/lib/data/types";
import { buildChecklist, buildInquiryText } from "@/app/lib/checklist";
import { trackEvent } from "@/src/lib/analytics";
import { OfficialLink } from "@/app/components/OfficialLink";

export interface ChecklistProgram {
  slug: string;
  title: string;
  eligibilityText: string;
  deadlineText?: string;
  documentsText?: string;
  methodText: string;
  online: boolean;
  officeName?: string;
  phone?: string;
  contactHref?: string;
  officialHref: string;
}

/** 申請前チェックリスト（ローカル状態のみ・保存なし）。
 *  チェック状態は端末の localStorage に保存。印刷／問い合わせ文コピーに対応。 */
export function ApplicationChecklist({
  program,
  municipalityName,
  categoryName,
}: {
  program: ChecklistProgram;
  municipalityName: string;
  categoryName?: string;
}) {
  const source: Pick<
    SupportProgram,
    | "title"
    | "targetPeople"
    | "applicationDeadlineText"
    | "requiredDocumentsText"
    | "applicationMethodText"
    | "onlineApplicationAvailable"
    | "contactName"
    | "contactPhone"
    | "contactUrl"
  > = {
    title: program.title,
    targetPeople: program.eligibilityText,
    applicationDeadlineText: program.deadlineText,
    requiredDocumentsText: program.documentsText,
    applicationMethodText: program.methodText,
    onlineApplicationAvailable: program.online,
    contactName: program.officeName,
    contactPhone: program.phone,
    contactUrl: program.contactHref,
  };
  const items = buildChecklist(source);
  const storageKey = `asn:checklist:${program.slug}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // ハイドレーション不整合を避けるため、初期描画は空・マウント後に端末の保存を反映する。
    try {
      const raw = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* localStorage 利用不可でも機能は動く */
    }
  }, [storageKey]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }

  async function copyInquiry() {
    const text = buildInquiryText(source, municipalityName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackEvent("inquiry_text_copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const doneCount = items.filter((it) => checked[it.id]).length;

  return (
    <section
      aria-labelledby="checklist-heading"
      className="aw-card border-gold/30"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="checklist-heading"
          className="aw-card-heading"
        >
          <ListChecks className="h-5 w-5 text-gold" aria-hidden="true" />
          申請前チェックリスト
        </h2>
        <span className="text-[12px] font-medium text-charcoal/70">
          {doneCount} / {items.length} 確認済み
        </span>
      </div>

      <p className="mt-2 text-[13px] leading-7 text-charcoal/80">
        申請の前に確認しておきたいことを並べました。チェックはこの端末にだけ保存されます（サーバーには送りません）。
      </p>

      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li key={it.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-soft-gray bg-white p-3 transition-colors hover:border-navy/25">
              <input
                type="checkbox"
                checked={!!checked[it.id]}
                onChange={() => toggle(it.id)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-soft-gray accent-navy"
              />
              <span className="flex-1">
                <span
                  className={`text-[14px] font-medium ${
                    checked[it.id]
                      ? "text-charcoal/70 line-through"
                      : "text-navy"
                  }`}
                >
                  {it.label}
                </span>
                {it.detail && (
                  <span className="mt-1 block text-[12px] leading-6 text-charcoal/70">
                    {it.detail}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2.5 print:hidden">
        <OfficialLink
          url={program.officialHref}
          className="btn-primary"
          supportId={program.slug}
          supportTitle={program.title}
          category={categoryName}
          municipality={municipalityName}
        />
        <button type="button" onClick={copyInquiry} className="btn-secondary">
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              コピーしました
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              問い合わせ文をコピー
            </>
          )}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "問い合わせ文をクリップボードにコピーしました" : ""}
        </span>
        <button
          type="button"
          onClick={() => {
            trackEvent("checklist_printed", { context: "support" });
            window.print();
          }}
          className="btn-secondary"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          印刷・PDF保存
        </button>
      </div>
    </section>
  );
}
