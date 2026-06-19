import { describe, it, expect } from "vitest";
import { programs } from "@/app/data/programs";
import { helplineGroups } from "@/app/data/helplines";
import { guides } from "@/app/data/guides";
import {
  isPublishable,
  hasActiveDeadline,
  type SupportProgram,
} from "@/app/lib/data/types";
import {
  FORBIDDEN_PHRASES,
  findForbiddenPhrases,
  humanizeUncertain,
  COPY,
  DISCLAIMER_SHORT,
  DISCLAIMER_PROGRAM,
  DISCLAIMER_DIAGNOSIS,
} from "@/app/lib/copy";
import { applyFilters } from "@/app/lib/data";

const published = programs.filter(isPublishable);

function allText(p: SupportProgram): string {
  return [
    p.title,
    p.summary,
    p.plainLanguageSummary ?? "",
    p.targetPeople,
    p.benefitAmountText ?? "",
    p.applicationDeadlineText ?? "",
    p.applicationMethodText,
    p.requiredDocumentsText ?? "",
    p.contactName ?? "",
    p.disclaimerNote ?? "",
    ...(p.uncertainFields ?? []),
  ].join(" \n ");
}

describe("YMYL: seed の禁止表現（不変条件 §1）", () => {
  it("どの制度テキストにも断定/誇大/代行表現が無い", () => {
    const offenders = published
      .map((p) => ({ slug: p.slug, hits: findForbiddenPhrases(allText(p)) }))
      .filter((x) => x.hits.length > 0);
    expect(offenders).toEqual([]);
  });

  it("免責・定型コピー自体は禁止表現に当たらない（否定形の罠を回避）", () => {
    for (const text of [
      DISCLAIMER_SHORT,
      DISCLAIMER_PROGRAM,
      DISCLAIMER_DIAGNOSIS,
      COPY.targetMaybe,
      COPY.candidateNote,
      COPY.tagline,
    ]) {
      expect(findForbiddenPhrases(text)).toEqual([]);
    }
  });

  it("禁止表現リストは空でない（ガードが効いている）", () => {
    expect(FORBIDDEN_PHRASES.length).toBeGreaterThan(5);
  });

  it("ガイド記事（guides）のテキストにも禁止表現が無い", () => {
    const text = guides
      .flatMap((g) => [
        g.title,
        g.description,
        g.intro,
        ...g.sections.flatMap((s) => [
          s.heading,
          ...s.body,
          ...(s.checks ?? []),
        ]),
        ...(g.faq ?? []).flatMap((f) => [f.question, f.answer]),
      ])
      .join(" \n ");
    expect(findForbiddenPhrases(text)).toEqual([]);
  });

  it("ガイドの関連制度キー・出典URLが公的（lg.jp/go.jp/tokyo.jp）", () => {
    for (const g of guides) {
      for (const src of g.sources ?? []) {
        const host = new URL(src.url).host;
        expect(
          host.endsWith(".go.jp") ||
            host.endsWith(".lg.jp") ||
            host.endsWith(".tokyo.jp"),
          `${g.slug}: ${host}`,
        ).toBe(true);
      }
    }
  });

  it("相談窓口（helplines）のテキストにも禁止表現が無い", () => {
    const text = helplineGroups
      .flatMap((g) => [
        g.heading,
        g.intro ?? "",
        ...g.items.flatMap((i) => [
          i.title,
          i.description,
          i.telNote ?? "",
          i.urlLabel ?? "",
        ]),
      ])
      .join(" \n ");
    expect(findForbiddenPhrases(text)).toEqual([]);
  });

  it("helplines の tel は全国共通の短縮番号のみ（捏造した一般番号でない）", () => {
    const allowed = new Set(["110", "119", "189", "188", "118", "188"]);
    for (const g of helplineGroups) {
      for (const i of g.items) {
        if (i.tel) expect(allowed.has(i.tel), `tel=${i.tel}`).toBe(true);
      }
    }
  });
});

describe("YMYL: 信頼性メタ（不変条件 §3）", () => {
  it("すべての公開制度が公式URL・最終確認日・対象説明を持つ", () => {
    expect(published.length).toBeGreaterThanOrEqual(35);
    for (const p of published) {
      expect(p.officialUrl).toMatch(/^https:\/\//);
      expect(p.lastOfficialCheckedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.targetPeople.length).toBeGreaterThan(0);
    }
  });

  it("公式URLは公的ソース（自治体 lg.jp / go.jp / tokyo.jp、または社会福祉協議会）", () => {
    for (const p of published) {
      const host = new URL(p.officialUrl).host;
      // 自治体公式ドメイン、または生活福祉資金等を所管する社会福祉協議会の公式サイト
      // （社協＝公益の社会福祉法人。ホストに shakyo/syakyo、または英略称 cosw
      //  ＝Council of Social Welfare を含む）を公的ソースとして許可。
      const isShakyo =
        host.includes("shakyo") ||
        host.includes("syakyo") ||
        host.includes("cosw");
      expect(
        host.endsWith(".lg.jp") ||
          host.endsWith(".go.jp") ||
          host.endsWith(".tokyo.jp") ||
          isShakyo,
        `${p.slug}: ${host}`,
      ).toBe(true);
    }
  });

  it("slug が一意", () => {
    const slugs = published.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("公開表示用の未確認項目に内部フィールド名が残らない", () => {
    const rawKeys =
      /benefitAmountText|applicationDeadlineText|requiredDocumentsText|requiredDocumentstext|applicationMethodText|onlineApplicationAvailable|officialUrl|targetPeople|contactName|contactPhone|sourceConfidence|summary/;
    const offenders = published
      .flatMap((p) =>
        (p.uncertainFields ?? []).map((u) => ({
          slug: p.slug,
          original: u,
          rendered: humanizeUncertain(u),
        })),
      )
      .filter((x) => rawKeys.test(x.rendered));

    expect(offenders).toEqual([]);
  });
});

describe("hasActiveDeadline（誤った期限バッジを出さない）", () => {
  it("『確認できません』『受付を終了』は期限バッジ対象外", () => {
    const ended = published.find((p) =>
      (p.applicationDeadlineText ?? "").includes("受付を終了"),
    );
    if (ended) expect(hasActiveDeadline(ended)).toBe(false);

    const noConfirm = published.find((p) =>
      (p.applicationDeadlineText ?? "").includes("確認できません"),
    );
    if (noConfirm) expect(hasActiveDeadline(noConfirm)).toBe(false);
  });

  it("『15日以内』のような前向きな期限はバッジ対象", () => {
    const real = published.find((p) =>
      (p.applicationDeadlineText ?? "").includes("15日以内"),
    );
    expect(real).toBeTruthy();
    expect(hasActiveDeadline(real!)).toBe(true);
  });

  it("申請期限フィルターは期限バッジと同じ判定を使う", () => {
    const filtered = applyFilters(published, { hasDeadline: true });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(hasActiveDeadline)).toBe(true);
  });
});
