import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "../support/test-users";
import { ensureUserAOnboarded, resetUserACampaigns } from "./support";

// Home, metrics and budget screens (DESIGN.md 1.3, 1.6, 1.7) with known data
// in October 2025. The tests run in order and share test user A's data.
test.describe.configure({ mode: "serial" });

const MONTH = "2025-10-01";
const PAST_MONTHS = ["2025-09-01", "2025-10-01", "2025-11-01"];

// Known data. The week 28.9–4.10 has 3 days in September and 4 in October.
//   October: spend 400 + 1000 + 1300 = 2,700; revenue 1200 + 3000 + 2600 = 6,800
//   leads 8 + 20 = 28, deals 4 + 4 = 8, new customers 4 + 2 = 6 (only campaign A)
//   CPL 1400 / 28 = 50; Cost per Deal 1400 / 8 = 175; CAC 1400 / 6 ≈ 233
//   ROAS 6800 / 2700 ≈ 2.5; Conversion Rate 8 / 28 ≈ 28.6%
//   Budget 2,500; campaigns 1,500 + 1,500 = 3,000 → gap −500; remaining −200
//   Revenue goal 8,500 → 80%
async function seed() {
  await resetUserACampaigns();
  const { client, userId } = await signInTestUser("A");
  await cleanPastMonths();

  const { data: campaigns, error } = await client
    .from("campaigns")
    .insert([
      { user_id: userId, name: "Dash Meta", platform: "meta_ads" },
      { user_id: userId, name: "Dash Google", platform: "google_ads" },
    ])
    .select("id, name");
  if (error) throw error;
  const meta = campaigns.find((c) => c.name === "Dash Meta")!.id;
  const google = campaigns.find((c) => c.name === "Dash Google")!.id;

  const weeks = await client.from("campaign_performance").insert([
    { user_id: userId, campaign_id: meta, week_start: "2025-09-28", spend: 700, leads: 14, deals: 7, new_customers: 7, revenue: 2100 },
    { user_id: userId, campaign_id: meta, week_start: "2025-10-05", spend: 1000, leads: 20, deals: 4, new_customers: 2, revenue: 3000 },
    { user_id: userId, campaign_id: google, week_start: "2025-10-12", spend: 1300, revenue: 2600 },
  ]);
  if (weeks.error) throw weeks.error;

  for (const result of await Promise.all([
    client.from("budgets").insert({ user_id: userId, month: MONTH, planned_amount: 2500 }),
    client.from("campaign_budgets").insert([
      { user_id: userId, campaign_id: meta, month: MONTH, planned_amount: 1500 },
      { user_id: userId, campaign_id: google, month: MONTH, planned_amount: 1500 },
    ]),
    client.from("business_goals").insert({ user_id: userId, month: MONTH, goal_type: "revenue", target_value: 8500 }),
  ])) {
    if (result.error) throw result.error;
  }
}

// Budgets and goals of the test months (the copy to a new month may add rows)
async function cleanPastMonths() {
  const { client, userId } = await signInTestUser("A");
  for (const table of ["budgets", "business_goals"] as const) {
    const { error } = await client.from(table).delete().eq("user_id", userId).in("month", PAST_MONTHS);
    if (error) throw error;
  }
}

test.beforeAll(async () => {
  await ensureUserAOnboarded();
  await seed();
});

test.afterAll(async () => {
  await resetUserACampaigns();
  await cleanPastMonths();
});

// Repeats a picker change until the page navigates: right after loading, the
// picker may not respond yet (before React takes over the page)
async function untilUrl(page: Page, url: RegExp, action: () => Promise<unknown>) {
  await expect(async () => {
    await action();
    await expect(page).toHaveURL(url, { timeout: 2000 });
  }).toPass({ timeout: 15_000 });
}

const text = (page: Page, value: string | RegExp) => page.getByText(value).filter({ visible: true });

test("home: month view matches the known data", async ({ page }) => {
  await page.goto("/dashboard?period=month&value=2025-10");
  const cards = page.getByRole("region", { name: "נתוני התקופה" });
  await expect(cards.getByText("₪6,800")).toBeVisible();
  await expect(cards.getByText("₪2,700")).toBeVisible();
  await expect(cards.getByText("-₪200")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "התקדמות ליעד ההכנסות" })).toHaveAttribute("aria-valuenow", "80");
  await expect(text(page, "80%")).toBeVisible();
  await expect(page.getByRole("img", { name: /הכנסות מול הוצאות/ })).toBeVisible();
});

test("home: week view, and the remaining budget opens the budget screen", async ({ page }) => {
  await page.goto("/dashboard?period=month&value=2025-10");
  await untilUrl(page, /period=week&value=2025-10-26/, () => page.getByRole("button", { name: "שבוע" }).click());
  await untilUrl(page, /period=week&value=2025-10-05/, () =>
    page.getByLabel(/שבוע \(בחר תאריך/).fill("2025-10-08"),
  );
  const cards = page.getByRole("region", { name: "נתוני התקופה" });
  await expect(cards.getByText("₪3,000")).toBeVisible();
  await expect(cards.getByText("₪1,000")).toBeVisible();
  await expect(cards.getByText("לא זמין בתצוגת שבוע", { exact: false })).toBeVisible();
  await expect(text(page, "מול השבוע הקודם").first()).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);

  await page.goto("/dashboard?period=month&value=2025-10");
  await page.getByRole("link", { name: /יתרת תקציב/ }).click();
  await expect(page).toHaveURL(/\/budget\?month=2025-10-01/);
  await expect(page.getByRole("heading", { name: "תקציב", level: 1 })).toBeVisible();
});

test("home: a period without data shows the empty state", async ({ page }) => {
  await page.goto("/dashboard?period=month&value=2025-11");
  await expect(text(page, "עוד אין נתונים לתקופה הזו")).toBeVisible();
  await expect(page.getByRole("link", { name: "ייבוא נתונים" }).filter({ visible: true }).last()).toBeVisible();
});

test("metrics: the five KPIs, unavailable metrics and the campaign table", async ({ page }) => {
  await page.goto("/metrics?period=month&value=2025-10");
  const cards = page.getByRole("region", { name: "מדדי התקופה" });
  await expect(cards.getByText("₪50", { exact: true }).first()).toBeVisible();
  await expect(cards.getByText("₪175", { exact: true }).first()).toBeVisible();
  await expect(cards.getByText("₪233", { exact: true }).first()).toBeVisible();
  await expect(cards.getByText("2.5", { exact: true }).first()).toBeVisible();
  await expect(cards.getByText("28.6%", { exact: true }).first()).toBeVisible();

  await cards.getByRole("button", { name: "הסבר על CAC" }).click();
  await expect(page.getByText(/הוצאות ÷ לקוחות חדשים/)).toBeVisible();
  await page.keyboard.press("Escape");

  const table = page.getByRole("table");
  await expect(table.getByRole("link", { name: "Dash Meta" })).toBeVisible();
  await expect(table.getByRole("link", { name: "Dash Google" })).toBeVisible();

  // The week of 12.10 has spend but no leads
  await page.goto("/metrics?period=week&value=2025-10-12");
  await expect(cards.getByText("לא הוזנו לידים בתקופה").first()).toBeVisible();
  await expect(cards.getByText("לא זמין").first()).toBeVisible();
});

test("metrics: compare to another month or week", async ({ page }) => {
  // September has 3/7 of the week 28.9–4.10: CPL 300 / 6 = 50
  await page.goto("/metrics?period=month&value=2025-10");
  const cards = page.getByRole("region", { name: "מדדי התקופה" });
  await expect(cards.getByText("ספטמבר 2025: ₪50")).toBeVisible();
  await expect(cards.getByText("מול החודש הקודם").first()).toBeVisible();

  await untilUrl(page, /period=month&value=2025-10&compare=2025-11/, () =>
    page.getByLabel("השוואה ל־").selectOption("2025-11-01"),
  );
  await expect(cards.getByText("נובמבר 2025: לא זמין").first()).toBeVisible();
  await expect(cards.getByText("מול נובמבר 2025").first()).toBeVisible();

  // Changing the period goes back to the default comparison
  await untilUrl(page, /period=month&value=2025-09$/, () =>
    page.getByLabel("חודש", { exact: true }).selectOption("2025-09-01"),
  );

  // Week 12.10 against week 28.9: ROAS 2100 / 700 = 3.0
  await page.goto("/metrics?period=week&value=2025-10-12");
  await untilUrl(page, /period=week&value=2025-10-12&compare=2025-09-28/, () =>
    page.getByLabel(/השוואה לשבוע/).fill("2025-09-30"),
  );
  await expect(cards.getByText("שבוע 28.09–04.10: 3.0")).toBeVisible();
});

test("budget: both gaps, then editing the total and a campaign's budget", async ({ page }) => {
  await page.goto("/budget?month=2025-10-01");
  await expect(text(page, "₪2,500")).toBeVisible();
  await expect(text(page, "₪3,000")).toBeVisible();
  await expect(text(page, "-₪500")).toBeVisible();
  await expect(text(page, "הקצית יותר מהתקציב הכולל")).toBeVisible();
  await expect(text(page, "-₪200")).toBeVisible();

  await page.getByRole("button", { name: "עריכת התקציב החודשי הכולל" }).click();
  await page.getByLabel("התקציב החודשי הכולל").fill("3,500");
  await page.getByRole("button", { name: "שמירה" }).filter({ visible: true }).click();
  await expect(text(page, "התקציב נשמר")).toBeVisible();
  await expect(text(page, "₪3,500")).toBeVisible();
  await expect(text(page, "הקצית יותר מהתקציב הכולל")).toHaveCount(0);

  await page.getByRole("tab", { name: "תקציבי קמפיינים" }).click();
  await expect(page).toHaveURL(/tab=campaigns/);
  await page.getByRole("button", { name: "עריכת תקציב מתוכנן של Dash Google" }).filter({ visible: true }).click();
  await page.getByLabel("תקציב מתוכנן של Dash Google").filter({ visible: true }).fill("1,000");
  await page.getByRole("button", { name: "שמירה" }).filter({ visible: true }).click();
  await expect(text(page, "התקציב נשמר")).toBeVisible();
  // Google: 1,000 − 1,300 = −300, in the error color
  const negative = text(page, "-₪300").first();
  await expect(negative).toBeVisible();

  await page.reload();
  await expect(text(page, "-₪300").first()).toBeVisible();
});

test("the screens fit a phone without sideways page scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/dashboard?period=month&value=2025-10", "/metrics?period=month&value=2025-10", "/budget?month=2025-10-01&tab=campaigns"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
