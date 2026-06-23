"use client";

import { useMemo, useState } from "react";
import { Copy, Mail } from "lucide-react";
import { trackEvent } from "@/src/lib/analytics";

type OrgType =
  | "支援団体・NPO"
  | "地域コミュニティ"
  | "学校・フリースクール"
  | "士業・FP"
  | "個人で検討"
  | "その他";

const ORG_TYPES: OrgType[] = [
  "支援団体・NPO",
  "地域コミュニティ",
  "学校・フリースクール",
  "士業・FP",
  "個人で検討",
  "その他",
];

export function ProContactForm({ contactEmail }: { contactEmail: string }) {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("支援団体・NPO");
  const [useCase, setUseCase] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const subject = useMemo(
    () =>
      `Aster Support Navi Pro 問い合わせ${
        organization.trim() ? `（${organization.trim()}）` : ""
      }`,
    [organization],
  );

  const body = useMemo(
    () =>
      [
        "Aster Support Navi Proについて問い合わせます。",
        "",
        `お名前: ${name.trim()}`,
        `団体名・事務所名: ${organization.trim() || "未記入"}`,
        `返信先メール: ${email.trim()}`,
        `種別: ${orgType}`,
        "",
        "利用イメージ:",
        useCase.trim() || "未記入",
        "",
        "補足:",
        message.trim() || "未記入",
        "",
        "※ 相談者本人の氏名・住所・収入・病名などの機微情報は含めていません。",
      ].join("\n"),
    [email, message, name, orgType, organization, useCase],
  );

  const mailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("メールアプリを開きます。内容を確認して送信してください。");
    // pro_interest_click: Pro問い合わせフォームの「メールを作成する」をクリックした時に発火。
    // 氏名・メールアドレス・自由入力本文は送信しない。
    trackEvent("pro_interest_click", {
      source: "pro_contact_form_submit",
      plan_hint: "trial",
      page_path: window.location.pathname,
    });
    window.location.href = mailHref;
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setStatus("問い合わせ本文をコピーしました。");
      // pro_interest_click: Pro問い合わせフォームの「本文をコピー」をクリックした時に発火。
      // コピーした本文そのものは送信しない。
      trackEvent("pro_interest_click", {
        source: "pro_contact_body_copy",
        plan_hint: "trial",
        page_path: window.location.pathname,
      });
    } catch {
      setStatus("コピーできませんでした。メールを作成するボタンをご利用ください。");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" id="contact">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">お名前 *</span>
          <input
            required
            autoComplete="name"
            className="aw-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">返信先メール *</span>
          <input
            required
            type="email"
            autoComplete="email"
            className="aw-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">団体名・事務所名</span>
          <input
            autoComplete="organization"
            className="aw-input"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="例：地域支援センター"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-charcoal/80">種別</span>
          <select
            className="aw-select"
            value={orgType}
            onChange={(e) => setOrgType(e.target.value as OrgType)}
          >
            {ORG_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-charcoal/80">利用イメージ *</span>
        <textarea
          required
          className="aw-input min-h-28"
          maxLength={800}
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          placeholder="例：相談者に制度候補と申請前チェックリストを印刷して渡したい"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-charcoal/80">補足</span>
        <textarea
          className="aw-input min-h-24"
          maxLength={800}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="扱いたい地域・カテゴリ、試用希望など"
        />
      </label>

      <p className="aw-note">
        このフォームはメール作成用です。相談者本人の氏名・詳細住所・収入・病名などの機微情報は入力しないでください。
      </p>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary">
          <Mail className="h-4 w-4" aria-hidden="true" />
          メールを作成する
        </button>
        <button type="button" onClick={onCopy} className="btn-secondary">
          <Copy className="h-4 w-4" aria-hidden="true" />
          本文をコピー
        </button>
      </div>

      {status && (
        <p role="status" className="text-sm text-charcoal/70">
          {status}
        </p>
      )}
    </form>
  );
}
