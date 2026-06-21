"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Check, ShieldCheck } from "lucide-react";
import {
  encodeAnswers,
  type ChildAgeBand,
  type DiagnosisAnswers,
} from "@/app/lib/eligibility";
import { track } from "@/app/lib/track";

interface MunicipalityOpt {
  slug: string;
  name: string;
  prefectureSlug: string;
  prefectureName: string;
}

interface CategoryOpt {
  slug: string;
  name: string;
}

const AGE_OPTS: { value: ChildAgeBand; label: string }[] = [
  { value: "0-2", label: "0〜2歳" },
  { value: "3-5", label: "3〜5歳" },
  { value: "6-12", label: "6〜12歳（小学生）" },
  { value: "13-18", label: "13〜18歳" },
];

export function DiagnosisFlow({
  municipalities,
  categories,
}: {
  municipalities: MunicipalityOpt[];
  categories: CategoryOpt[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<DiagnosisAnswers>({});

  // 診断開始を計測（機微情報なし・回数のみ）。
  useEffect(() => {
    track("diagnosis_started");
  }, []);

  const steps = [
    "お住まいの自治体",
    "妊娠・出産",
    "お子さんの年齢",
    "ひとり親",
    "引っ越し・転入",
    "関心のあること",
  ];
  const total = steps.length;
  const canNext = step !== 0 || !!a.municipality;

  function next() {
    if (step < total - 1) setStep(step + 1);
    else router.push(`/check/result?${encodeAnswers(a)}`);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }
  function toggleAge(v: ChildAgeBand) {
    setA((prev) => {
      const cur = new Set(prev.childAgeBands ?? []);
      if (cur.has(v)) cur.delete(v);
      else cur.add(v);
      return { ...prev, childAgeBands: [...cur] };
    });
  }
  function toggleInterest(slug: string) {
    setA((prev) => {
      const cur = new Set(prev.interests ?? []);
      if (cur.has(slug)) cur.delete(slug);
      else cur.add(slug);
      return { ...prev, interests: [...cur] };
    });
  }

  return (
    <div className="aw-card">
      {/* 進捗 */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-charcoal/70">
          質問 {step + 1} / {total}
        </p>
        <p className="text-[12px] text-charcoal/70">{steps[step]}</p>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-soft-gray"
        role="progressbar"
        aria-label="診断の進捗"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-valuetext={`質問 ${step + 1} / ${total}（${steps[step]}）`}
      >
        <div
          className="h-full rounded-full bg-navy transition-all duration-300"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mt-6 min-h-[180px]">
        {step === 0 && (
          <Question title="お住まい（または転入予定）の自治体はどこですか？">
            <div className="max-h-80 overflow-auto rounded-xl border border-soft-gray bg-white/70 p-3">
              <div className="flex flex-wrap gap-2">
                {municipalities.map((m) => (
                  <ChipButton
                    key={`${m.prefectureSlug}-${m.slug}`}
                    active={
                      a.prefecture === m.prefectureSlug &&
                      a.municipality === m.slug
                    }
                    onClick={() =>
                      setA({
                        ...a,
                        prefecture: m.prefectureSlug,
                        municipality: m.slug,
                      })
                    }
                  >
                    {m.prefectureName} {m.name}
                  </ChipButton>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[12px] text-charcoal/70">
              公式情報を確認できた自治体から順次対応しています。
            </p>
          </Question>
        )}

        {step === 1 && (
          <Question title="妊娠中、または出産を予定していますか？">
            <YesNo
              value={a.pregnant}
              onChange={(v) => setA({ ...a, pregnant: v })}
            />
          </Question>
        )}

        {step === 2 && (
          <Question title="お子さんの年齢を教えてください（複数選択可・いなければ次へ）">
            <div className="flex flex-wrap gap-2">
              {AGE_OPTS.map((o) => (
                <ChipButton
                  key={o.value}
                  active={!!a.childAgeBands?.includes(o.value)}
                  onClick={() => toggleAge(o.value)}
                >
                  {o.label}
                </ChipButton>
              ))}
            </div>
          </Question>
        )}

        {step === 3 && (
          <Question title="ひとり親家庭ですか？">
            <YesNo
              value={a.singleParent}
              onChange={(v) => setA({ ...a, singleParent: v })}
            />
          </Question>
        )}

        {step === 4 && (
          <Question title="引っ越し・転入の予定がありますか？">
            <YesNo value={a.moving} onChange={(v) => setA({ ...a, moving: v })} />
          </Question>
        )}

        {step === 5 && (
          <Question title="特に確認したいことはありますか？（複数選択可）">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <ChipButton
                  key={c.slug}
                  active={!!a.interests?.includes(c.slug)}
                  onClick={() => toggleInterest(c.slug)}
                >
                  {c.name}
                </ChipButton>
              ))}
            </div>
          </Question>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-soft-gray pt-5">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          戻る
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canNext}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step < total - 1 ? (
            <>
              次へ
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              結果を見る
              <Check className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[12px] text-charcoal/70">
        <ShieldCheck className="h-3.5 w-3.5 text-ok" aria-hidden="true" />
        入力内容はこの端末の中だけで使われ、サーバーには保存されません。
      </p>
    </div>
  );
}

function Question({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold leading-snug text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="aw-chip" aria-pressed={active} onClick={onClick}>
      {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </button>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2" role="group" aria-label="はい・いいえ">
      <button
        type="button"
        className="aw-chip"
        aria-pressed={value === true}
        onClick={() => onChange(true)}
      >
        はい
      </button>
      <button
        type="button"
        className="aw-chip"
        aria-pressed={value === false}
        onClick={() => onChange(false)}
      >
        いいえ
      </button>
    </div>
  );
}
