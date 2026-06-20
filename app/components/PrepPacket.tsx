"use client";

import { useEffect } from "react";
import { Printer, FileDown } from "lucide-react";
import { track } from "@/app/lib/track";

export interface PrepProgram {
  slug: string;
  title: string;
  municipalityName: string;
  targetPeople: string;
  deadlineText?: string;
  documentsText?: string;
  methodText: string;
  online: boolean;
  officeName?: string;
  phone?: string;
  officialUrl: string;
}

/**
 * 複数制度をまとめた「申請準備リスト」。画面では印刷ボタンのバーだけ表示し、
 * 詳細パケットは print 時のみ展開する（hidden print:block）。
 * 公共情報は無料で印刷・PDF保存できる（YMYL: ペイウォール化しない）。
 */
export function PrepPacket({
  programs,
  heading,
  nextChecks = [],
  context,
}: {
  programs: PrepProgram[];
  heading: string;
  nextChecks?: string[];
  context: string;
}) {
  // 表示＝diagnosis_completed / checklist_viewed の計測（件数のみ・機微情報なし）。
  useEffect(() => {
    if (context === "diagnosis") track("diagnosis_completed", { count: programs.length });
    track("checklist_viewed", { context, count: programs.length });
  }, [context, programs.length]);

  if (programs.length === 0) return null;

  return (
    <>
      {/* 画面用：印刷バー */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-aster-soft/50 px-4 py-3 print:hidden">
        <p className="text-[14px] font-semibold text-navy">
          <FileDown className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
          {programs.length} 件の候補を「申請準備リスト」として印刷・PDF保存できます
        </p>
        <button
          type="button"
          onClick={() => {
            track("checklist_printed", { context, count: programs.length });
            window.print();
          }}
          className="btn-primary"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          まとめて印刷・PDF保存
        </button>
      </div>

      {/* 印刷用：詳細パケット（画面では非表示） */}
      <div className="hidden print:block">
        <h2 className="text-lg font-bold text-navy">{heading}</h2>
        <p className="mt-1 text-[12px] text-charcoal/70">
          このリストは支援制度の確認を助けるための情報です。対象可否・金額・期限・必要書類は、必ず自治体の公式ページで確認してください。
        </p>

        <ol className="mt-4 space-y-5">
          {programs.map((p, i) => (
            <li key={p.slug} className="break-inside-avoid border-t border-soft-gray pt-4">
              <h3 className="text-[15px] font-bold text-navy">
                {i + 1}. {p.title}（{p.municipalityName}）
              </h3>
              <dl className="mt-2 space-y-1.5 text-[13px] leading-7 text-charcoal">
                <Row label="対象となる可能性がある人" value={p.targetPeople} />
                {p.deadlineText && <Row label="申請期限・受付" value={p.deadlineText} />}
                {p.documentsText && <Row label="必要書類" value={p.documentsText} />}
                <Row label="申請方法" value={p.methodText} />
                {(p.officeName || p.phone) && (
                  <Row
                    label="問い合わせ先"
                    value={[p.officeName, p.phone].filter(Boolean).join(" / ")}
                  />
                )}
                <Row label="公式ページ" value={p.officialUrl} />
              </dl>
            </li>
          ))}
        </ol>

        {nextChecks.length > 0 && (
          <section className="mt-6 break-inside-avoid border-t border-soft-gray pt-4">
            <h3 className="text-[14px] font-bold text-navy">次に確認すること</h3>
            <ul className="mt-2 list-disc pl-5 text-[13px] leading-7 text-charcoal">
              {nextChecks.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold text-charcoal/70">{label}：</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}
