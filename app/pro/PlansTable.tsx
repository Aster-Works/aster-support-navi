"use client";

import { Check, Sparkles } from "lucide-react";
import { TrackedLink } from "@/app/components/TrackedLink";
import { trackEvent } from "@/src/lib/analytics";
import {
  PLANS,
  formatPlanPrice,
  paymentLinkFor,
  type Plan,
} from "@/app/lib/pro/plans";

/**
 * 料金表（Free / Personal / Pro / Team）。
 * 有料プランのCTAは Stripe Payment Link（環境変数で注入）へ遷移し、未設定なら
 * 問い合わせ（#contact）へフォールバックする。クリックは stripe_click で計測する。
 */
export function PlansTable() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {PLANS.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const highlighted = !!plan.highlighted;
  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border bg-surface p-5 ${
        highlighted
          ? "border-gold/60 shadow-[0_24px_60px_-40px_rgba(212,162,76,0.7)] ring-1 ring-gold/40"
          : "border-soft-gray"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-fg">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          おすすめ
        </span>
      )}

      <h3 className="text-lg font-bold text-fg">{plan.name}</h3>
      <p className="aw-tnum mt-2 text-2xl font-bold tracking-tight text-fg">
        {formatPlanPrice(plan)}
      </p>
      <p className="mt-2 min-h-[2.5rem] text-[13px] leading-6 text-charcoal/80">
        {plan.tagline}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-gold-ink">
        {plan.audience}
      </p>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-[13px] leading-6 text-charcoal"
          >
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-aster"
              aria-hidden="true"
            />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {plan.id === "free" ? (
          // diagnosis_start: 料金表の Free CTA（無料ではじめる）をクリックした時に発火。
          <TrackedLink
            href="/check"
            className="btn-secondary w-full justify-center"
            eventName="diagnosis_start"
            eventParams={{ source: "pricing_free" }}
          >
            {plan.ctaLabel}
          </TrackedLink>
        ) : (
          <CheckoutButton plan={plan} highlighted={highlighted} />
        )}
      </div>
    </article>
  );
}

function CheckoutButton({
  plan,
  highlighted,
}: {
  plan: Plan;
  highlighted: boolean;
}) {
  const onClick = () => {
    const link = paymentLinkFor(plan.id);
    // stripe_click: 有料プランの申し込みCTAをクリックした時に発火（収益ファネルの計測点）。
    trackEvent("stripe_click", {
      plan: plan.id,
      source: link ? "pricing_checkout" : "pricing_contact_fallback",
    });
    if (link) {
      window.location.assign(link);
      return;
    }
    // 決済リンク未設定（ベータ）時は問い合わせへ誘導する。
    const contact = document.getElementById("contact");
    if (contact) {
      contact.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${
        highlighted ? "btn-primary" : "btn-secondary"
      } w-full justify-center`}
    >
      {plan.ctaLabel}
    </button>
  );
}
