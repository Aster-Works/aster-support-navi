import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** 新UIの回帰テスト（モバイルメニュー / 現在地ナビ / かんたん診断の自治体フィルタ /
 *  制度検索のページネーション・全国対応）。基本状態の a11y は smoke.spec の
 *  axe スキャン（/search・/check を含む）でカバーし、ここは挙動を検証する。
 *  実行は smoke と同じく `npm run test:e2e`（reuseExistingServer で :3040 を再利用）。 */

const seriousIds = (
  violations: { impact?: string | null; id: string }[],
): string[] =>
  violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => v.id);

test.beforeEach(async ({ page }) => {
  await page.route(
    /https:\/\/(www\.googletagmanager\.com|www\.google\.com|www\.googleadservices\.com|ad\.doubleclick\.net)\//,
    (route) => route.abort(),
  );
});

test.describe("ヘッダー・ナビ", () => {
  test("モバイル: ハンバーガーメニューの開閉・リンク・Escape・a11y", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "モバイルビューポートのみ");
    await page.goto("/");

    const open = page.getByRole("button", { name: "メニューを開く" });
    await expect(open).toBeVisible();
    await open.click();

    await expect(
      page.getByRole("button", { name: "メニューを閉じる" }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "モバイルナビゲーション" });
    await expect(nav.getByRole("link", { name: "制度を探す" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "エリアから探す" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "保存した制度" })).toBeVisible();

    // 開いた状態に重大な a11y 違反がない
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(seriousIds(results.violations)).toEqual([]);

    // Escape で閉じる
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "メニューを開く" }),
    ).toBeVisible();
  });

  test("デスクトップ: 現在地ナビが aria-current=page を持つ", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "デスクトップビューポートのみ");
    await page.goto("/search");
    const nav = page.getByRole("navigation", {
      name: "グローバルナビゲーション",
    });
    await expect(nav.getByRole("link", { name: "制度を探す" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      nav.getByRole("link", { name: "エリアから探す" }),
    ).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("Proランディング", () => {
  test("公開ページとして価値説明と問い合わせフォームを表示し、ログインは別導線にする", async ({
    page,
  }) => {
    await page.goto("/pro");

    await expect(
      page.getByRole("heading", {
        name: "相談者に渡せる制度確認パックを、数分で整える。",
      }),
    ).toBeVisible();
    await expect(page.getByText("確認しています…")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "ログイン" }),
    ).toHaveAttribute("href", "/pro/dashboard");
    await expect(page.getByRole("textbox", { name: /お名前/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "メールを作成する" }),
    ).toBeVisible();

    await page.goto("/pro/dashboard");
    await expect(
      page.getByRole("heading", { name: "Pro（相談支援現場向け）" }),
    ).toBeVisible();
  });
});

test.describe("かんたん診断の自治体フィルタ", () => {
  test("絞り込み・件数表示・空状態", async ({ page }) => {
    await page.goto("/check");
    const input = page.getByRole("textbox", { name: "自治体名で絞り込む" });
    await expect(input).toBeVisible();
    await expect(page.getByRole("button", { name: /世田谷区/ })).toBeVisible();

    await input.fill("横浜");
    await expect(page.getByRole("button", { name: /横浜市/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /世田谷区/ })).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("件の自治体が該当します");

    await input.fill("該当しない文字列zzz");
    await expect(
      page.getByText(/一致する自治体は見つかりませんでした/),
    ).toBeVisible();
  });
});

test.describe("制度検索 /search", () => {
  const cardsOf = (page: import("@playwright/test").Page) =>
    page.locator('main ul a[href^="/supports/"]');

  test("ページネーションと表示件数（25→100→次ページ）", async ({ page }) => {
    await page.goto("/search");
    const cards = cardsOf(page);
    await expect(cards).toHaveCount(25); // 既定25件
    await expect(page.getByText(/件目を表示/)).toBeVisible();

    await page.getByRole("link", { name: "100件ずつ表示" }).click();
    await expect(page).toHaveURL(/perPage=100/);
    await expect(cards).toHaveCount(100);

    await page.getByRole("link", { name: "次のページ" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/perPage=100/); // 表示件数を保持
    await expect(cards).toHaveCount(100);
  });

  test("都道府県フィルタ・自治体名解決・並び替え", async ({ page }) => {
    await page.goto("/search?prefecture=kanagawa&perPage=100");
    const cards = cardsOf(page);
    const n = await cards.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(200); // 神奈川に絞られている（全件ではない）

    // 自治体名が全国の自治体で解決される（政令市カードに「横浜市」）
    await expect(cards.filter({ hasText: "横浜市" }).first()).toBeVisible();
    // 東京の制度が混入しない
    expect(
      await page.locator('main ul a[href^="/supports/tokyo-"]').count(),
    ).toBe(0);

    // 並び替え（フィルタを保持して即時適用）
    await page.getByRole("link", { name: "自治体順" }).click();
    await expect(page).toHaveURL(/sort=municipality/);
    await expect(page).toHaveURL(/prefecture=kanagawa/);
  });
});
