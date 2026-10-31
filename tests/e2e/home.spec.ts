import { expect, test } from "@playwright/test";

test("temporary page renders in Hebrew, RTL, with brand fonts and colors", async ({ page }) => {
  await page.goto("/");

  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "he");
  await expect(html).toHaveAttribute("dir", "rtl");

  await expect(page.getByRole("img", { name: "Budgi" })).toBeVisible();

  const body = page.locator("body");
  await expect(body).toHaveCSS("background-color", "rgb(248, 250, 252)");
  await expect(body).toHaveCSS("direction", "rtl");

  const fontFamily = await page
    .getByRole("heading", { name: "כותרת H1" })
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontFamily).toMatch(/Plus Jakarta Sans/);
  expect(fontFamily).toMatch(/Rubik/);

  // Both web fonts are actually loaded, not just declared
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family).join(" ");
  });
  expect(loaded).toMatch(/Plus Jakarta Sans/);
  expect(loaded).toMatch(/Rubik/);

  await expect(page.getByTestId("db-status")).toHaveAttribute("data-status", "ok");
});
