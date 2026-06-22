"use client";

import { useEffect } from "react";
import { ClipboardList, FileDown, Printer } from "lucide-react";
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
 * 複数制度をまとめた「申請前パック」。
 * 画面では内容の概要を見せ、印刷時はPDF保存しやすい詳細パケットへ切り替える。
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
      {/* 画面用：申請前パックの概要 */}
      <section className="aw-card mt-10 border-gold/30 print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="aw-eyebrow">
              <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
              申請前パック
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-navy">
              複数制度をまとめて、印刷・PDF保存できます
            </h2>
            <p className="mt-2 text-[14px] leading-7 text-charcoal">
              支援ルートに出てきた制度を、公式確認・必要書類・問い合わせ先まで1つの資料にまとめます。
              役所や支援者に相談する前の整理用として使えます。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              track("checklist_printed", { context, count: programs.length });
              window.print();
            }}
            className="btn-primary shrink-0"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            申請前パックを印刷・PDF保存
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <PackSummary label="制度" value={`${programs.length}件`} />
          <PackSummary
            label="公式確認"
            value={programs.some((p) => p.officialUrl) ? "リンク付き" : "要確認"}
          />
          <PackSummary
            label="共通確認"
            value={nextChecks.length > 0 ? `${nextChecks.length}項目` : "基本項目あり"}
          />
        </div>

        <ol className="mt-5 space-y-3">
          {programs.map((p, index) => (
            <li
              key={p.slug}
              className="rounded-xl border border-soft-gray bg-white px-4 py-3"
            >
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold leading-6 text-navy">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-6 text-charcoal/75">
                    {p.municipalityName} ／ {p.online ? "オンライン申請の可能性あり" : "窓口・郵送等を確認"}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 印刷用：詳細パケット（画面では非表示） */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold text-navy">申請前パック</h1>
        <h2 className="mt-1 text-lg font-bold text-navy">{heading}</h2>
        <p className="mt-1 text-[12px] text-charcoal/70">
          このパックは支援制度の確認を助けるための整理資料です。対象可否・金額・期限・必要書類は、必ず自治体の公式ページまたは担当窓口で確認してください。
        </p>

        <section className="mt-4 break-inside-avoid rounded border border-soft-gray p-3">
          <h3 className="text-[14px] font-bold text-navy">このパックで行うこと</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12px] leading-6 text-charcoal">
            <li>制度ごとの対象条件を公式ページで確認する</li>
            <li>申請期限・必要書類・申請方法を確認する</li>
            <li>不明点を担当窓口に問い合わせる</li>
            <li>申請後の控えを保存する</li>
          </ol>
        </section>

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

function PackSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-soft-gray bg-cream/40 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-charcoal/70">
        <ClipboardList className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-[16px] font-bold text-navy">{value}</p>
    </div>
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
