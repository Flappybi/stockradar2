import { test, expect } from "@playwright/test";

test("splash supports keyboard entry, session memory, direct links and reduced motion", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const enter = page.getByRole("button", { name: "Enter StockRadar" });
  await expect(enter).toBeVisible();
  await expect(
    page.getByText("Demo · Synthetic data", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("splash-sweep")).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../../work/splash-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await enter.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Open screener" })).toBeVisible();
  await expect(page.locator("#main")).toBeFocused();
  await page.reload();
  await expect(page.getByRole("link", { name: "Open screener" })).toBeVisible();
  await expect(enter).toHaveCount(0);
  await page.goto("/splash");
  await expect(enter).toBeVisible();
  await enter.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Open screener" })).toBeVisible();
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/stock/BBCA");
  await expect(
    page.getByRole("heading", { name: "Signal Score", exact: true }),
  ).toBeVisible();
  await expect(enter).toHaveCount(0);
});
