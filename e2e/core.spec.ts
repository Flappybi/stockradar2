import { test, expect } from "@playwright/test";
test("complete market research workflow", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Enter StockRadar" }).click();
  await expect(
    page.getByRole("heading", { name: "Find the signal behind the market." }),
  ).toBeVisible();
  await expect(page.getByText("Demo mode", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Open screener" }).click();
  await expect(
    page.getByRole("heading", { name: "Multi-Factor Screener" }),
  ).toBeVisible();
  const firstBalanced = await page
    .getByRole("table", { name: "Stock rankings" })
    .locator("tbody tr")
    .first()
    .innerText();
  await page.getByLabel("Screening preset").selectOption("Growth");
  await expect(page.getByLabel("growth weight")).toHaveValue("40");
  await page.reload();
  await expect(page.getByLabel("growth weight")).toHaveValue("40");
  expect(
    await page
      .getByRole("table", { name: "Stock rankings" })
      .locator("tbody tr")
      .first()
      .innerText(),
  ).not.toBe(firstBalanced);
  await page.getByLabel("quality weight").fill("0");
  await expect(
    page.getByRole("alert").filter({ hasText: "Weights must" }),
  ).toContainText("100%");
  await expect(
    page.getByRole("table", { name: "Stock rankings" }).locator("tbody tr"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByRole("button", { name: "Company", exact: false }).click();
  await page.getByLabel("Filter companies").fill("ZZZZ");
  await expect(
    page.getByText("No companies match your filters."),
  ).toBeVisible();
  await page.getByLabel("Filter companies").fill("BBCA");
  await page.getByRole("link", { name: /BBCA/ }).click();
  await expect(
    page.getByRole("heading", { name: "Signal Score", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Anomaly Score", exact: true }),
  ).toBeVisible();
  const generate = page.getByRole("button", { name: "Generate AI Brief" });
  await page.getByLabel("Chart period").selectOption("365");
  await expect(
    page.getByRole("img", {
      name: "Closing prices for the last 365 calendar days",
      exact: true,
    }),
  ).toBeVisible();
  if (await generate.count()) await generate.click();
  await expect(
    page.getByText("Deterministic research brief", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Market Radar", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Market anomalies" }),
  ).toBeVisible();
  await page.getByLabel("Volume", { exact: true }).check();
  await expect(
    page
      .getByRole("table", { name: "Market anomalies" })
      .locator("tbody tr")
      .first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Methodology", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Methodology & transparency" }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("textbox", { name: "Search companies" }).fill("BBCA");
  await page
    .locator("#search-results")
    .getByRole("link", { name: /BBCA/ })
    .click();
  await expect(page).toHaveURL(/\/stock\/BBCA$/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
  await page.goto("/");
  await page.screenshot({
    path: `../../work/stockradar-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("API rejects fabricated context and unsupported tickers", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/explanation", {
        data: { ticker: "BBCA", context: { signal: 100 } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/explanation", { data: { ticker: "ZZZZ" } })
    ).status(),
  ).toBe(404);
  expect((await request.get("/api/screener?preset=invalid")).status()).toBe(
    400,
  );
});
