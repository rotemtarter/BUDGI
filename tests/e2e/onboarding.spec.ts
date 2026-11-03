import { expect, test } from "@playwright/test";
import { resetUserA } from "./support";

test.beforeAll(async () => {
  await resetUserA();
});

test("new user completes onboarding and lands on the home screen", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "ברוכים הבאים ל-Budgi" })).toBeVisible();

  const budget = page.getByLabel("תקציב שיווק חודשי");
  const goal = page.getByLabel("יעד הכנסות חודשי");
  const submit = page.getByRole("button", { name: "התחל לעבוד עם Budgi" });

  // Hebrew validation messages
  await submit.click();
  await expect(page.getByText("יש להזין תקציב שיווק חודשי")).toBeVisible();
  await expect(page.getByText("יש להזין יעד הכנסות חודשי")).toBeVisible();
  await expect(budget).toHaveAttribute("aria-invalid", "true");

  await budget.fill("-100");
  await goal.fill("abc");
  await submit.click();
  await expect(page.getByText("יש להזין מספר שאינו שלילי")).toBeVisible();
  await expect(page.getByText("יש להזין מספר", { exact: true })).toBeVisible();

  await budget.fill("12,500");
  await goal.fill("40000");
  await submit.click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "סקירה כללית" })).toBeVisible();
  await expect(page.getByText("עוד אין נתונים לתקופה הזו")).toBeVisible();

  // Onboarding is shown only once
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);

  // The saved values appear in Settings for the current month
  await page.goto("/settings");
  await expect(page.getByLabel("יעד הכנסות")).toHaveValue("40,000");
});
