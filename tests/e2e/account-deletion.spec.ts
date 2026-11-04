import { expect, test } from "@playwright/test";
import { authUserExists, countUserRows, createTempUser, removeTempUser, seedEverything, type TempUser } from "../support/temp-user";
import { sessionCookiesFor } from "./support";

// Account deletion from the settings screen (PRD 4.9, DESIGN.md 1.10 area 6,
// ADR-15). Runs on a temporary budgi-dev user, never on test users A and B.
test.use({ storageState: { cookies: [], origins: [] } });

let user: TempUser | undefined;

test.afterEach(async () => {
  await removeTempUser(user?.userId);
  user = undefined;
});

test("deleting the account removes all data and signs out everywhere", async ({ page, browser, baseURL }) => {
  user = await createTempUser();
  await seedEverything(user);
  const cookies = await sessionCookiesFor(user, baseURL!, "temporary user");
  await page.context().addCookies(cookies);

  // A second device, signed in as the same user
  const other = await browser.newContext();
  await other.addCookies(cookies);
  const otherPage = await other.newPage();
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL(/\/dashboard$/);

  await page.goto("/settings");
  await page.getByRole("button", { name: "מחיקת החשבון" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("heading", { name: "למחוק את החשבון?" })).toBeVisible();

  const input = dialog.getByLabel("כדי לאשר, הקלד: מחק");
  const confirm = dialog.getByRole("button", { name: "מחיקה לצמיתות" });
  await expect(input).toBeFocused();
  await expect(confirm).toBeDisabled();
  await input.fill("מחיקה");
  await expect(confirm).toBeDisabled();

  // Cancel keeps everything
  await dialog.getByRole("button", { name: "ביטול" }).click();
  await expect(dialog).toBeHidden();
  expect((await countUserRows(user.userId)).campaigns).toBe(1);

  await page.getByRole("button", { name: "מחיקת החשבון" }).click();
  await page.getByRole("alertdialog").getByLabel("כדי לאשר, הקלד: מחק").fill("מחק");
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה לצמיתות" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "התחברות עם Google" })).toBeVisible();
  expect(await authUserExists(user.userId)).toBe(false);
  expect(Object.values(await countUserRows(user.userId)).every((count) => count === 0)).toBe(true);

  // Signed out in this browser
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  // The other device's session ends on its next request
  await otherPage.goto("/campaigns");
  await expect(otherPage).toHaveURL(/\/login$/);
  await other.close();
});

test("the server refuses deletion without the typed word", async ({ page, baseURL }) => {
  user = await createTempUser();
  await page.context().addCookies(await sessionCookiesFor(user, baseURL!, "temporary user"));

  const response = await page.request.delete("/api/account", { data: { confirm: "כן" } });
  expect(response.status()).toBe(400);
  expect(await authUserExists(user.userId)).toBe(true);
});
