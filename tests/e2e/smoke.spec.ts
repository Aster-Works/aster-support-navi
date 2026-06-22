import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** クリティカルジャーニーのスモーク + a11y。
 *  実行には `npx playwright install` が必要。`npm run test:e2e` で起動（build→start を webServer が行う）。 */

test.beforeEach(async ({ page }) => {
  await page.route(
    /https:\/\/(www\.googletagmanager\.com|www\.google\.com|www\.googleadservices\.com|ad\.doubleclick\.net)\//,
    (route) => route.abort(),
  );
});

test("トップ→自治体→制度詳細→チェックリストが通る", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "くらしの支援制度を、見落とさない。" }),
  ).toBeVisible();

  // 自治体名で検索 → 自治体ページへ
  await page.getByPlaceholder("自治体名を入力（例：世田谷区・大阪市）").fill("世田谷区");
  await page.getByRole("button", { name: "探す" }).click();
  await expect(page).toHaveURL(/\/tokyo\/setagaya/);
  await expect(
    page.getByRole("heading", { name: /世田谷区で確認したい支援制度/ }),
  ).toBeVisible();

  // 制度カード → 詳細
  await page.getByRole("link", { name: /児童手当/ }).first().click();
  await expect(page).toHaveURL(/\/supports\//);
  // YMYL: 公式情報・最終確認日・免責・チェックリストが必ずある
  await expect(page.getByRole("heading", { name: "公式情報" })).toBeVisible();
  await expect(page.getByText(/最終確認日/).first()).toBeVisible();
  await expect(page.getByText(/必ず.*公式ページ/).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "申請前チェックリスト" }),
  ).toBeVisible();

  // 公式リンクは新規タブ・外部
  const official = page.getByRole("link", { name: "公式ページで確認する" }).first();
  await expect(official).toHaveAttribute("target", "_blank");
  await expect(official).toHaveAttribute("href", /lg\.jp|tokyo\.jp/);
});

test("かんたん診断が候補制度を返す", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: /世田谷区/ }).click();
  await page.getByRole("button", { name: "次へ" }).click(); // 自治体→妊娠
  await page.getByRole("button", { name: "はい" }).click(); // 妊娠中
  // 残りは未選択のまま、結果ページに着くまで進める
  for (let i = 0; i < 8 && !page.url().includes("/check/result"); i++) {
    const result = page.getByRole("button", { name: "結果を見る" });
    if (await result.count()) {
      await result.click();
      await page.waitForURL(/\/check\/result/);
    } else {
      await page.getByRole("button", { name: "次へ" }).click();
    }
  }
  await expect(page).toHaveURL(/\/check\/result/);
  await expect(page.getByText(/件の候補が見つかりました/)).toBeVisible();
  await expect(page.getByText("この制度が候補に出た理由").first()).toBeVisible();
});

test("禁止表現が公開ページに出ない（YMYL）", async ({ page }) => {
  for (const path of [
    "/",
    "/tokyo/setagaya",
    "/supports/tokyo-setagaya-child-allowance",
    "/help",
    "/guides/child-allowance-basics",
  ]) {
    await page.goto(path);
    const body = await page.locator("body").innerText();
    for (const phrase of ["必ずもらえ", "あなたは対象です", "申請を代行します"]) {
      expect(body, `${path} に「${phrase}」が出ていない`).not.toContain(phrase);
    }
  }
});

test("a11y: トップと制度詳細に重大な違反がない", async ({ page }) => {
  test.slow(); // 9ページ × axe スキャン。dev では初回コンパイル分も含め時間がかかる。
  for (const path of [
    "/",
    "/supports/tokyo-setagaya-child-allowance",
    "/help",
    "/guides/child-allowance-basics",
    "/area",
    "/saved",
    "/compare/medical",
    "/search",
    "/check",
  ]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  }
});
