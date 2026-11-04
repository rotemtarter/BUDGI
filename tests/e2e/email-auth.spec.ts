import { expect, test } from "@playwright/test";
import { testUserCredentials } from "../support/test-users";
import { ensureUserAOnboarded } from "./support";

// Email and password sign-in, sign-up and password reset screens (ADR-21).
// Sign-in uses test user A of budgi-dev. Sending emails (sign-up, reset) is
// checked by hand, so these tests do not send any.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeAll(async () => {
  await ensureUserAOnboarded();
});

test("sign in with email and password", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "התחברות עם אימייל" }).click();
  await expect(page.getByText("יש להזין אימייל")).toBeVisible();
  await expect(page.getByText("יש להזין סיסמה")).toBeVisible();

  const { email, password } = testUserCredentials("A");
  await page.getByLabel("אימייל", { exact: true }).filter({ visible: true }).fill(email);
  await page.getByLabel("סיסמה", { exact: true }).filter({ visible: true }).fill(`${password}-wrong`);
  await page.getByRole("button", { name: "התחברות עם אימייל" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "האימייל או הסיסמה שגויים" })).toBeVisible();

  await page.getByLabel("סיסמה", { exact: true }).filter({ visible: true }).fill(password);
  await page.getByRole("button", { name: "התחברות עם אימייל" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "סקירה כללית" })).toBeVisible();

  // Signed in: the sign-up screen goes home
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("sign-up checks the email and the password before sending anything", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "הרשמה עם אימייל" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: "הרשמה עם אימייל" })).toBeVisible();

  await page.getByLabel("אימייל", { exact: true }).filter({ visible: true }).fill("not-an-email");
  await page.getByLabel("סיסמה", { exact: true }).filter({ visible: true }).fill("short");
  await page.getByLabel("אימות סיסמה").filter({ visible: true }).fill("other");
  await page.getByRole("button", { name: "הרשמה", exact: true }).filter({ visible: true }).click();
  await expect(page.getByText("כתובת האימייל אינה תקינה")).toBeVisible();
  await expect(page.getByText("הסיסמה צריכה להכיל לפחות 15 תווים")).toBeVisible();

  await page.getByLabel("סיסמה", { exact: true }).filter({ visible: true }).fill("A-long-enough-password-1");
  await page.getByRole("button", { name: "הרשמה", exact: true }).filter({ visible: true }).click();
  await expect(page.getByText("הסיסמאות אינן זהות")).toBeVisible();
  await page.getByRole("link", { name: "התחברות" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("forgot password checks the email", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "שכחתי סיסמה" }).click();
  await expect(page.getByRole("heading", { name: "שכחתי סיסמה" })).toBeVisible();
  await page.getByRole("button", { name: "שליחת קישור לאיפוס" }).click();
  await expect(page.getByText("יש להזין אימייל")).toBeVisible();
});

test("an expired or used email link says so", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=expired&type=email&next=/onboarding");
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(page.getByRole("alert").filter({ hasText: "הקישור פג תוקף או כבר נוצל" })).toBeVisible();

  await page.goto("/auth/confirm?token_hash=expired&type=recovery&next=/reset-password");
  await expect(page).toHaveURL(/\/forgot-password\?error=1$/);
  await expect(page.getByRole("alert").filter({ hasText: "הקישור פג תוקף או כבר נוצל" })).toBeVisible();

  // An outside address in `next` is ignored
  await page.goto("/auth/confirm?code=bad&next=https://example.com");
  await expect(page).toHaveURL(/\/login\?error=link$/);
});
