import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserA } from "./support";
import { thisWeek } from "./a11y";

// The main path of a new user, end to end (PRD 3.3): onboarding → campaign →
// weekly data → alert → home → forecast → Advisor (fixed answer, ADR-12) →
// saved insight. Uses test user A from a clean start.
test.describe.configure({ mode: "serial" });

const NAME = "Flow Campaign";

const v = (page: Page) => ({
  heading: (name: string | RegExp) => page.getByRole("heading", { name, exact: typeof name === "string" }).filter({ visible: true }),
  button: (name: string) => page.getByRole("button", { name, exact: true }).filter({ visible: true }),
  text: (text: string | RegExp, options?: { exact?: boolean }) => page.getByText(text, options).filter({ visible: true }),
});

test.beforeAll(async () => {
  await resetUserA();
});

test.afterAll(async () => {
  // Leave user A onboarded with no data for the other tests
  await resetUserA();
  await ensureUserAOnboarded();
});

test("a new user goes from onboarding to a saved Advisor insight", async ({ page }) => {
  // Onboarding
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("תקציב שיווק חודשי").fill("1,000");
  await page.getByLabel("יעד הכנסות חודשי").fill("10,000");
  await page.getByRole("button", { name: "התחל לעבוד עם Budgi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(v(page).text("עוד אין נתונים לתקופה הזו")).toBeVisible();

  // A new campaign
  await page.goto("/campaigns/new");
  await page.getByLabel("שם הקמפיין").fill(NAME);
  await page.getByRole("combobox", { name: "פלטפורמה", exact: true }).filter({ visible: true }).click();
  await page.getByRole("option", { name: "Google Ads" }).click();
  await v(page).button("שמירה").click();
  await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/);
  await expect(v(page).heading(NAME)).toBeVisible();

  // This week's data: spend over the whole month's budget raises an alert
  const week = thisWeek();
  await v(page).button("הוספת שבוע").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("שבוע").fill(week);
  await dialog.getByLabel("הוצאה").fill("2,000");
  await dialog.getByLabel("לידים").fill("40");
  await dialog.getByLabel("עסקאות").fill("4");
  await dialog.getByLabel("הכנסות").fill("6,000");
  await dialog.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "חריגה מהתקציב" })).toBeVisible();

  // Home, for that week: the totals and the ratios computed from them
  await page.goto(`/dashboard?period=week&value=${week}`);
  await expect(v(page).text("₪2,000").first()).toBeVisible();
  await expect(v(page).text("₪6,000").first()).toBeVisible();

  // Metrics for the same week: ROAS = 6,000 ÷ 2,000, CPL = 2,000 ÷ 40
  await page.goto(`/metrics?period=week&value=${week}`);
  await expect(v(page).text("3.0", { exact: true }).first()).toBeVisible();
  await expect(v(page).text("₪50", { exact: true }).first()).toBeVisible();

  // The alert is in the alert center
  await page.goto("/alerts");
  await expect(v(page).text("חריגה מהתקציב").first()).toBeVisible();

  // The forecast screen loads for the current month
  await page.goto("/forecast");
  await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();

  // Advisor, with a fixed answer, and a saved insight
  const { client } = await signInTestUser("A");
  const campaign = await client.from("campaigns").select("id").eq("name", NAME).single();
  await page.route("**/api/advisor", (route) =>
    route.fulfill({
      json: {
        ok: true,
        remaining: 19,
        reply: {
          answer: "חרגת מהתקציב החודשי, אבל ה-ROAS של Flow Campaign גבוה.",
          recommendations: [
            {
              actionType: "decrease",
              campaigns: [{ id: campaign.data!.id, name: NAME }],
              amountIls: 500,
              percentage: null,
              rationale: "כדי לחזור לתקציב.",
              expectedImpact: null,
            },
          ],
          limitations: [],
          missingDataRequest: null,
        },
      },
    }),
  );
  await page.goto("/advisor");
  await page.getByLabel("שאלה ל-Advisor").fill("האם לצמצם תקציב?");
  await page.keyboard.press("Enter");
  const answer = page.getByRole("group", { name: "תשובת ה-Advisor" });
  await expect(answer.getByText("חרגת מהתקציב החודשי", { exact: false })).toBeVisible();
  await answer.getByRole("button", { name: "שמור תובנה" }).click();
  await expect(v(page).text("תובנות שמורות (1)")).toBeVisible();
});
