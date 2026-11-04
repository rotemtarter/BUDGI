import { expect, test } from "@playwright/test";

// No session in these tests
test.use({ storageState: { cookies: [], origins: [] } });

test("login screen: Hebrew RTL, Google button and legal links", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("img", { name: "Budgi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "התחברות עם Google" })).toBeVisible();
  await expect(page.getByText("עם Google, החשבון נוצר אוטומטית בהתחברות הראשונה.")).toBeVisible();
  // Email and password too (ADR-21)
  await expect(page.getByLabel("אימייל")).toBeVisible();
  await expect(page.getByLabel("סיסמה")).toBeVisible();
  await expect(page.getByRole("link", { name: "הרשמה עם אימייל" })).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "שכחתי סיסמה" })).toHaveAttribute("href", "/forgot-password");

  await page.getByRole("link", { name: "תנאי שימוש" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "תנאי שימוש" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. השירות" })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "מדיניות פרטיות" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "4. עוזר ה-AI" })).toBeVisible();
});

test("failed sign-in shows an error above the button", async ({ page }) => {
  await page.goto("/login?error=1");
  await expect(page.getByRole("alert").filter({ hasText: "ההתחברות" })).toHaveText(
    "ההתחברות לא הושלמה. נסה שוב.",
  );
});

test("inner screens require signing in", async ({ page }) => {
  for (const path of ["/dashboard", "/settings", "/onboarding", "/campaigns", "/reset-password"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("callback without a code returns to login with an error", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?error=1$/);
});
