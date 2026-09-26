import { test, expect } from "@playwright/test";

test("favorites persist across pages and reloads and can be removed", async ({
  page,
}, testInfo) => {
  await page.goto("/stock/BBCA");
  await page.getByRole("button", { name: "Save BBCA to watchlist" }).click();
  await expect(
    page.getByRole("button", { name: "Remove BBCA from watchlist" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove BBCA from watchlist" }),
  ).toBeVisible();
  const otherTab = await page.context().newPage();
  await otherTab.goto("/watchlist");
  await expect(otherTab.getByRole("link", { name: /BBCA/ })).toBeVisible();
  await page.getByRole("link", { name: "Watchlist", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your research, in focus." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /BBCA/ })).toBeVisible();
  await page.screenshot({
    path: `../../work/watchlist-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Remove BBCA from watchlist" })
    .click();
  await expect(
    otherTab.getByRole("heading", {
      name: "Start with a company that interests you.",
    }),
  ).toBeVisible();
  await otherTab.close();
  await expect(
    page.getByRole("heading", {
      name: "Start with a company that interests you.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore the screener" }).click();
  await page.getByLabel("Filter companies").fill("BBRI");
  await page.getByRole("button", { name: "Save BBRI to watchlist" }).click();
  await page.goto("/watchlist");
  await expect(page.getByRole("link", { name: /BBRI/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    ),
  ).toBe(false);
});

test("blocked browser storage reports failure without claiming a saved favorite", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/stock/BBCA");
  await page.getByRole("button", { name: "Save BBCA to watchlist" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not save" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save BBCA to watchlist" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("watchlist handles invalid saved data and stocks outside the universe", async ({
  page,
}) => {
  await page.goto("/watchlist");
  await page.evaluate(() =>
    localStorage.setItem("stockradar-watchlist-v1", "not-json"),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Start with a company that interests you.",
    }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("stockradar-watchlist-v1", JSON.stringify(["ZZZZ"])),
  );
  await page.reload();
  await expect(
    page.getByText("Outside the current research universe"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove ZZZZ from watchlist" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Start with a company that interests you.",
    }),
  ).toBeVisible();
});
